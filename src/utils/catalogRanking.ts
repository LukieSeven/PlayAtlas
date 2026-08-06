import { CompactGameLookupRecord, CompactRankSignals } from '../types/catalog';

export const RANKING_SCHEMA_VERSION = 1;

export function normalizeIgdbRating(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return undefined;
  return value / 10;
}

const boundedCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
};

export function calculateMetadataConfidence(input: {
  hasCover?: boolean;
  hasSummary?: boolean;
  platformCount?: number;
  companyCount?: number;
  websiteCount?: number;
  externalProductCount?: number;
  hasReleaseDate?: boolean;
}): number {
  let score = 0;
  if (input.hasCover) score += 20;
  if (input.hasSummary) score += 20;
  if (input.hasReleaseDate) score += 15;
  if (boundedCount(input.platformCount) > 0) score += 15;
  if (boundedCount(input.companyCount) > 0) score += 15;
  if (boundedCount(input.websiteCount) > 0) score += 5;
  if (boundedCount(input.externalProductCount) > 0) score += 10;
  return score;
}

export function buildCompactRankSignals(record: any): CompactRankSignals {
  const websites = Array.isArray(record.websites) ? record.websites : [];
  const externalProducts = Array.isArray(record.externalProducts)
    ? record.externalProducts
    : Array.isArray(record.externalGames)
      ? record.externalGames
      : [];
  const companies = Array.isArray(record.companies) ? record.companies : [];
  const platforms = Array.isArray(record.platforms) ? record.platforms : [];

  return {
    userRating: normalizeIgdbRating(record.rating),
    userRatingCount: boundedCount(record.ratingCount),
    criticRating: normalizeIgdbRating(record.aggregatedRating),
    criticRatingCount: boundedCount(record.aggregatedRatingCount),
    totalRating: normalizeIgdbRating(record.totalRating),
    totalRatingCount: boundedCount(record.totalRatingCount),
    hypeCount: boundedCount(record.hypeCount ?? record.hypes),
    metadataConfidence: calculateMetadataConfidence({
      hasCover: Boolean(record.coverImageId || record.coverUrl),
      hasSummary: Boolean(record.summary),
      hasReleaseDate: Boolean(record.firstReleaseDate),
      platformCount: platforms.length,
      companyCount: companies.length,
      websiteCount: websites.length,
      externalProductCount: externalProducts.length,
    }),
    platformCount: platforms.length,
    externalProductCount: externalProducts.length,
    websiteCount: websites.length,
    hasFranchise: Boolean(record.franchiseId || (Array.isArray(record.franchises) && record.franchises.length)),
    hasCollection: Boolean(Array.isArray(record.collections) && record.collections.length),
    hasParentGame: Boolean(record.parentGameId),
    isVersion: Boolean(record.versionParentId),
  };
}

export function getContentTypeWeight(gameType?: string | null): number {
  switch ((gameType || '').toLowerCase()) {
    case 'main_game': return 1;
    case 'remake': return 0.94;
    case 'remaster': return 0.9;
    case 'expanded_game': return 0.84;
    case 'standalone_expansion': return 0.78;
    case 'port': return 0.7;
    case 'expansion': return 0.58;
    case 'dlc_addon': return 0.45;
    case 'bundle':
    case 'pack': return 0.35;
    case 'mod': return 0.16;
    default: return 0.25;
  }
}

export function calculateCatalogImportance(record: Pick<CompactGameLookupRecord, 'gameType' | 'defaultVisible' | 'rank'>): number {
  const rank = record.rank;
  if (!rank) return 0;

  const evidence = Math.log1p(boundedCount(rank.totalRatingCount))
    + Math.log1p(boundedCount(rank.userRatingCount)) * 0.35
    + Math.log1p(boundedCount(rank.criticRatingCount)) * 0.8;
  const ratingQuality = (rank.totalRating ?? rank.userRating ?? rank.criticRating ?? 0) / 10;
  const hype = Math.log1p(boundedCount(rank.hypeCount));
  const legitimacy = Math.log1p(boundedCount(rank.externalProductCount)) * 0.35
    + (rank.hasFranchise ? 0.3 : 0)
    + (rank.hasCollection ? 0.2 : 0);
  const confidence = (rank.metadataConfidence ?? 0) / 100;
  const typeWeight = getContentTypeWeight(record.gameType);

  return (
    evidence * 12
    + ratingQuality * Math.min(evidence, 10) * 4
    + hype * 9
    + legitimacy * 8
    + confidence * 8
    + typeWeight * 18
    + (record.defaultVisible ? 8 : 0)
    - (rank.isVersion ? 8 : 0)
  );
}

/**
 * Ranks unreleased discovery records without consulting any rating value or
 * rating count. Pre-release scores remain display data only; demonstrated
 * audience interest and record legitimacy drive discovery order.
 */
export function calculateUnreleasedPopularityWeight(
  record: Pick<CompactGameLookupRecord, 'gameType' | 'defaultVisible' | 'rank'>,
): number {
  const rank = record.rank;
  if (!rank) return 0;

  const anticipation = Math.log1p(boundedCount(rank.hypeCount));
  const legitimacy = Math.log1p(boundedCount(rank.externalProductCount)) * 0.35
    + (rank.hasFranchise ? 0.3 : 0)
    + (rank.hasCollection ? 0.2 : 0);
  const reach = Math.log1p(boundedCount(rank.platformCount));
  const confidence = (rank.metadataConfidence ?? 0) / 100;
  const typeWeight = getContentTypeWeight(record.gameType);

  return (
    anticipation * 120
    + legitimacy * 25
    + reach * 5
    + confidence * 15
    + typeWeight * 25
    + (record.defaultVisible ? 10 : 0)
    - (rank.isVersion ? 15 : 0)
  );
}
