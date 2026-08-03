import { NormalizedScore, normalizeExternalGameScore, normalizePersonalScore } from '../services/scoreNormalizationService';
import { GameTypeCategory, normalizeGameType, shouldShowGameTypeBadge, getGameTypeLabel } from '../services/gameTypePresentationService';
import { PlayStatus, InterestStatus } from '../types/personal';
import { personalGameStore } from '../services/personalGameStore';
import { normalizeCatalogPlatform } from '../services/platformTaxonomyService';

export interface GameCardViewModel {
  gameId: string;
  numericId: number;

  title: string;
  coverUrl?: string;
  releaseYearDisplay: string;

  primaryPlatforms: string[];
  genresDisplay: string[];

  externalScore: NormalizedScore;
  personalScore?: NormalizedScore;

  gameType: GameTypeCategory;
  shouldShowGameTypeBadge: boolean;
  gameTypeBadgeLabel?: string;

  isOwned: boolean;
  currentPlayStatus?: PlayStatus;
  interestStatus?: InterestStatus;
  inBacklog: boolean;
}

export function mapToGameCardViewModel(catalogRecord: unknown): GameCardViewModel {
  if (!catalogRecord || typeof catalogRecord !== 'object') {
    return {
      gameId: '0',
      numericId: 0,
      title: 'Unknown Game',
      releaseYearDisplay: 'TBA',
      primaryPlatforms: [],
      genresDisplay: [],
      externalScore: { ratingValue: null, displayString: 'Not Rated', isUnrated: true },
      gameType: 'unknown',
      shouldShowGameTypeBadge: false,
      isOwned: false,
      inBacklog: false,
    };
  }

  const rec = catalogRecord as Record<string, unknown>;

  // Extract ID
  const numericId = typeof rec.id === 'number' ? rec.id : parseInt(String(rec.id || 0), 10);
  const gameId = rec.gameId ? String(rec.gameId) : String(numericId);

  // Extract Title (handling object-backed name)
  let title = 'Unknown Title';
  if (typeof rec.name === 'string') {
    title = rec.name;
  } else if (typeof rec.title === 'string') {
    title = rec.title;
  } else if (rec.name && typeof rec.name === 'object' && 'name' in rec.name) {
    title = String((rec.name as { name: unknown }).name);
  }

  // Extract Cover URL
  let coverUrl: string | undefined = undefined;
  if (typeof rec.coverUrl === 'string' && rec.coverUrl.trim()) {
    coverUrl = rec.coverUrl.trim();
  } else if (typeof rec.cover === 'string' && rec.cover.trim()) {
    coverUrl = rec.cover.trim();
  } else if (rec.cover && typeof rec.cover === 'object' && 'url' in rec.cover) {
    coverUrl = String((rec.cover as { url: unknown }).url);
  }

  // Extract Release Year Display
  let releaseYearDisplay = 'TBA';
  if (typeof rec.year === 'number') {
    releaseYearDisplay = String(rec.year);
  } else if (typeof rec.releaseYear === 'number') {
    releaseYearDisplay = String(rec.releaseYear);
  } else if (typeof rec.firstReleaseDate === 'number') {
    releaseYearDisplay = String(new Date(rec.firstReleaseDate * 1000).getFullYear());
  } else if (typeof rec.releaseDate === 'string') {
    const match = rec.releaseDate.match(/\b(19|20)\d{2}\b/);
    if (match) releaseYearDisplay = match[0];
  }

  // Extract Platforms (safely handling string, number, or object arrays)
  const primaryPlatforms: string[] = [];
  const rawPlatforms = Array.isArray(rec.platforms) ? rec.platforms : [];
  for (const p of rawPlatforms.slice(0, 3)) {
    primaryPlatforms.push(normalizeCatalogPlatform(p));
  }

  // Extract Genres (safely handling string or object arrays)
  const genresDisplay: string[] = [];
  const rawGenres = Array.isArray(rec.genres) ? rec.genres : [];
  for (const g of rawGenres.slice(0, 2)) {
    if (typeof g === 'string') {
      genresDisplay.push(g);
    } else if (g && typeof g === 'object' && 'name' in g) {
      genresDisplay.push(String((g as { name: unknown }).name));
    }
  }

  // External Score
  const externalScore = normalizeExternalGameScore(rec);

  // Game Type
  const gameType = normalizeGameType(rec.gameType || rec.type);
  const showBadge = shouldShowGameTypeBadge(gameType);
  const gameTypeBadgeLabel = showBadge ? getGameTypeLabel(gameType) : undefined;

  // Personal Game Store Overlay
  const personalRec = personalGameStore.getRecord(gameId) || personalGameStore.getRecord(`igdb_${numericId}`) || personalGameStore.getRecord(String(numericId));

  const isOwned = Boolean(personalRec && personalRec.ownerships.length > 0);
  const currentPlayStatus = personalRec?.currentPlayStatus;
  const interestStatus = personalRec?.interestStatus;
  const inBacklog = Boolean(personalRec?.inBacklogQueue);
  const personalScore = personalRec?.userRating !== undefined ? normalizePersonalScore(personalRec.userRating) : undefined;

  return {
    gameId,
    numericId,
    title,
    coverUrl,
    releaseYearDisplay,
    primaryPlatforms,
    genresDisplay,
    externalScore,
    personalScore,
    gameType,
    shouldShowGameTypeBadge: showBadge,
    gameTypeBadgeLabel,
    isOwned,
    currentPlayStatus,
    interestStatus,
    inBacklog,
  };
}
