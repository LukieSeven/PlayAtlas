import { getBasePathAwareUrl } from './catalogDataSource';
import { fetchAndDecompressJson } from '../utils/decompression';
import { GameItem } from '../types/game';
import { CompactGameLookupRecord, CompactRankSignals } from '../types/catalog';
import { openIndexedDB } from './indexDbStorage';

export interface CompactPlatformReleaseDate {
  p: number; // platform ID
  d: string; // date YYYY-MM-DD
}

export interface ReleaseListingRecord {
  id: string;
  sourceId: number;
  name: string;
  slug: string | null;
  gameType: string;
  gameTypeLabel: string;
  defaultVisible: boolean;
  firstReleaseDate: string | null;
  firstReleaseDatePrecision: string;
  platformReleaseDates: CompactPlatformReleaseDate[];
  platforms: Array<{
    id: number;
    name: string;
    abbreviation: string | null;
  }>;
  coverUrl: string | null;
  summaryPreview: string | null;
  dataChunk: string;
  rank?: CompactRankSignals;
}

export interface ReleaseManifestPartition {
  key: string;
  file: string;
  recordCount: number;
  compressedByteSize: number;
  uncompressedByteSize: number;
  sha256: string;
  compression: 'gzip';
}

export interface ReleaseCatalogManifest {
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  partitionCount: number;
  partitions: ReleaseManifestPartition[];
  platformsMetadata?: {
    file: string;
    recordCount: number;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  };
}

export interface ReleaseFeedPartition {
  items: Array<{ record: ReleaseListingRecord }>;
}

export interface ReleaseQueryOptions {
  timeframe: 'new_releases' | 'upcoming' | 'past_30_days' | 'next_30_days';
  viewType?: 'first_release' | 'platform_release';
  includeHidden?: boolean;
}

export interface ReleaseQueryResult {
  games: GameItem[];
  records: ReleaseListingRecord[];
  selectedDate: string;
  userTimezone: string;
  matchingPartitionsLoaded: number;
}

let cachedManifest: ReleaseCatalogManifest | null = null;
let cachedPartitionsMap = new Map<string, ReleaseListingRecord[]>();
let sharedPlatformsMapCache: Record<number, { name: string; abbreviation: string | null }> | null = null;

export function getDynamicLocalDate(): { dateStr: string; timezone: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return { dateStr: `${year}-${month}-${day}`, timezone };
}

export function parseYMDLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function calculateDynamicDateRange(timeframe: string, todayStr: string): { startDate: string; endDate: string } {
  const today = parseYMDLocal(todayStr);
  const start = new Date(today);
  const end = new Date(today);

  if (timeframe === 'day') {
    // Exact day
  } else if (timeframe === 'week') {
    start.setDate(today.getDate() - 6);
  } else if (timeframe === 'month') {
    start.setDate(1);
  } else if (timeframe === 'new_releases' || timeframe === 'past_30_days') {
    start.setDate(today.getDate() - 30);
  } else if (timeframe === 'upcoming' || timeframe === 'next_30_days') {
    end.setDate(today.getDate() + 90);
  }

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  return { startDate: format(start), endDate: format(end) };
}

export async function fetchReleaseManifest(): Promise<ReleaseCatalogManifest> {
  if (cachedManifest) return cachedManifest;

  let relManifestPath = 'releases/release_manifest.json';

  try {
    const browserManifestUrl = getBasePathAwareUrl('data/browser_catalog_manifest.json');
    const bRes = await fetch(browserManifestUrl);
    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData && typeof bData.releaseManifest === 'string' && bData.releaseManifest.trim()) {
        relManifestPath = bData.releaseManifest.trim();
      }
    }
  } catch {
    // Non-critical fallback to releases/release_manifest.json
  }

  const manifestUrl = getBasePathAwareUrl(`data/${relManifestPath}`);
  const res = await fetch(manifestUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch release manifest at ${manifestUrl}: HTTP ${res.status} ${res.statusText || 'Not Found'}`);
  }

  cachedManifest = await res.json();
  return cachedManifest!;
}

export async function fetchSharedPlatformsMetadata(): Promise<Record<number, { name: string; abbreviation: string | null }>> {
  if (sharedPlatformsMapCache) return sharedPlatformsMapCache;

  const manifest = await fetchReleaseManifest();
  const metaInfo = manifest.platformsMetadata;
  const relPath = metaInfo ? metaInfo.file : 'metadata/platforms.json.gz';
  const url = getBasePathAwareUrl(`data/${relPath}`);

  sharedPlatformsMapCache = await fetchAndDecompressJson<Record<number, { name: string; abbreviation: string | null }>>(
    url,
    metaInfo?.sha256
  );
  return sharedPlatformsMapCache!;
}

export async function fetchReleasePartitionFile(relPath: string): Promise<ReleaseListingRecord[]> {
  if (cachedPartitionsMap.has(relPath)) {
    return cachedPartitionsMap.get(relPath)!;
  }

  try {
    const db = await openIndexedDB();
    const cachedObj: any = await new Promise((resolve, reject) => {
      const tx = db.transaction('release_partitions', 'readonly');
      const store = tx.objectStore('release_partitions');
      const req = store.get(relPath);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (cachedObj && Array.isArray(cachedObj.records)) {
      cachedPartitionsMap.set(relPath, cachedObj.records);
      return cachedObj.records;
    }
  } catch (err) {
    console.warn('IndexedDB partition check warning:', err);
  }

  const manifest = await fetchReleaseManifest();
  const partInfo = manifest.partitions.find(p => p.file === relPath);

  const fileUrl = getBasePathAwareUrl(`data/${relPath}`);
  const records = await fetchAndDecompressJson<ReleaseListingRecord[]>(
    fileUrl,
    partInfo?.sha256
  );

  cachedPartitionsMap.set(relPath, records);

  try {
    const db = await openIndexedDB();
    const tx = db.transaction('release_partitions', 'readwrite');
    tx.objectStore('release_partitions').put({ year: relPath, records });
  } catch (err) {
    // Non-critical cache write error
  }

  return records;
}

export function convertReleaseRecordToGameItem(
  record: ReleaseListingRecord,
  platformsMap?: Record<number, { name: string; abbreviation: string | null }>
): GameItem {
  const typeStr = record.gameTypeLabel || record.gameType || 'Main Game';
  let category: GameItem['category'] = 'Base Game';
  if (typeStr.includes('DLC') || typeStr.includes('Expansion') || typeStr.includes('Pack')) category = 'DLC / Expansion';
  else if (typeStr.includes('Bundle')) category = 'Bundle';
  else if (typeStr.includes('Remake') || typeStr.includes('Remaster')) category = 'Remake';
  else if (typeStr.includes('Mod')) category = 'Mod';

  let platformNames: string[] = [];
  if (Array.isArray(record.platforms) && record.platforms.length > 0) {
    platformNames = record.platforms.map(p => p.name);
  } else if (Array.isArray(record.platformReleaseDates) && record.platformReleaseDates.length > 0 && platformsMap) {
    platformNames = Array.from(
      new Set(record.platformReleaseDates.map(prd => platformsMap[prd.p]?.name || 'Unknown Platform'))
    );
  }

  return {
    id: record.id,
    title: record.name,
    coverUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 0,
    releaseDate: record.firstReleaseDate || 'Unknown',
    platforms: platformNames,
    genres: [],
    developer: 'Game Studio',
    summary: record.summaryPreview || 'IGDB Source Record',
    category,
  };
}

/**
 * Extracts the authoritative numeric chunk index from a production browser-catalog path.
 * Invalid paths remain unresolved rather than being guessed from unrelated digits.
 */
export function getReleaseRecordChunkNumber(dataChunk: string): number | undefined {
  const match = /^chunks\/game_index_(\d+)\.json\.gz$/.exec(dataChunk);
  if (!match) return undefined;

  const chunkNumber = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(chunkNumber) && chunkNumber > 0 ? chunkNumber : undefined;
}

export function convertReleaseRecordToCompactRecord(
  record: ReleaseListingRecord
): CompactGameLookupRecord {
  const releaseYear = record.firstReleaseDate
    ? Number.parseInt(record.firstReleaseDate.slice(0, 4), 10)
    : undefined;

  return {
    id: record.sourceId,
    name: record.name,
    year: Number.isSafeInteger(releaseYear) ? releaseYear : undefined,
    gameType: record.gameType,
    defaultVisible: record.defaultVisible,
    chunk: getReleaseRecordChunkNumber(record.dataChunk),
    coverUrl: record.coverUrl || undefined,
    platforms: record.platforms.map(platform => platform.name),
    rating: record.rank?.totalRating ?? record.rank?.userRating ?? record.rank?.criticRating,
    rank: record.rank,
  };
}

export function sortReleaseRecordsChronologically(
  records: ReleaseListingRecord[],
  direction: 'ascending' | 'descending'
): ReleaseListingRecord[] {
  return [...records].sort((a, b) => {
    const comparison = (a.firstReleaseDate || '').localeCompare(b.firstReleaseDate || '');
    if (comparison !== 0) return direction === 'ascending' ? comparison : -comparison;
    return a.sourceId - b.sourceId;
  });
}

export async function queryReleaseCatalog(options: ReleaseQueryOptions): Promise<ReleaseQueryResult> {
  const { dateStr: localToday, timezone: userTimezone } = getDynamicLocalDate();
  const { startDate, endDate } = calculateDynamicDateRange(options.timeframe, localToday);

  const manifest = await fetchReleaseManifest();
  let platformsMap: Record<number, { name: string; abbreviation: string | null }> | undefined;
  try {
    platformsMap = await fetchSharedPlatformsMetadata();
  } catch {
    // Shared platforms fallback
  }

  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);

  const targetPartitions = manifest.partitions.filter(p => {
    if (p.key.startsWith(startYear) || p.key.startsWith(endYear)) return true;
    return false;
  });

  const partitionsToLoad = targetPartitions.length > 0 ? targetPartitions : manifest.partitions.slice(0, 2);

  const loadedRecords: ReleaseListingRecord[] = [];
  for (const part of partitionsToLoad) {
    const pRecords = await fetchReleasePartitionFile(part.file);
    loadedRecords.push(...pRecords);
  }

  const matchingRecords = loadedRecords.filter(record => {
    if (!options.includeHidden && record.defaultVisible === false) {
      return false;
    }

    if (options.viewType === 'first_release') {
      if (!record.firstReleaseDate) return false;
      return record.firstReleaseDate >= startDate && record.firstReleaseDate <= endDate;
    } else {
      if (!Array.isArray(record.platformReleaseDates) || record.platformReleaseDates.length === 0) {
        if (!record.firstReleaseDate) return false;
        return record.firstReleaseDate >= startDate && record.firstReleaseDate <= endDate;
      }

      return record.platformReleaseDates.some(
        prd => prd.d != null && prd.d >= startDate && prd.d <= endDate
      );
    }
  });

  const isUpcoming = options.timeframe === 'upcoming' || options.timeframe === 'next_30_days';
  const filteredRecords = sortReleaseRecordsChronologically(
    matchingRecords,
    isUpcoming ? 'ascending' : 'descending'
  );

  const games = filteredRecords.map(r => convertReleaseRecordToGameItem(r, platformsMap));

  return {
    games,
    records: filteredRecords,
    selectedDate: localToday,
    userTimezone,
    matchingPartitionsLoaded: partitionsToLoad.length,
  };
}

export async function getNewReleases(limit: number = 30): Promise<ReleaseFeedPartition> {
  const result = await queryReleaseCatalog({ timeframe: 'new_releases' });
  const records = result.records.slice(0, limit);
  return { items: records.map(r => ({ record: r })) };
}

export async function getUpcomingGames(limit: number = 30): Promise<ReleaseFeedPartition> {
  const result = await queryReleaseCatalog({ timeframe: 'upcoming' });
  const records = result.records.slice(0, limit);
  return { items: records.map(r => ({ record: r })) };
}
