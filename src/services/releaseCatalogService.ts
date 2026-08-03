import { getBasePathAwareUrl } from './catalogDataSource';
import { fetchAndDecompressJson } from '../utils/decompression';
import { GameItem } from '../types/game';
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

export interface ReleaseManifest {
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  totalBytes: number;
  platformsMetadata?: {
    file: string;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  };
  partitions: ReleaseManifestPartition[];
}

export interface ReleaseQueryOptions {
  viewType: 'first_release' | 'platform_release';
  timeframe: 'day' | 'week' | 'month';
  category?: string;
  genre?: string;
  platform?: string;
  includeHidden?: boolean;
}

export interface ReleaseQueryResult {
  games: GameItem[];
  records: ReleaseListingRecord[];
  selectedDate: string;
  userTimezone: string;
  matchingPartitionsLoaded: number;
}

let releaseManifestCache: ReleaseManifest | null = null;
let sharedPlatformsMapCache: Record<number, { name: string; abbreviation: string | null }> | null = null;
const cachedPartitionsMap = new Map<string, ReleaseListingRecord[]>();

/**
 * Get User's Local Browser Date & Timezone dynamically
 */
export function getDynamicLocalDate(): {
  dateStr: string;
  year: string;
  month: string;
  day: string;
  timezone: string;
} {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return { dateStr, year, month, day, timezone };
}

/**
 * Calculate Date Range dynamically for day, week (7 rolling days), and month (1st of month to today)
 */
export function calculateDynamicDateRange(
  timeframe: 'day' | 'week' | 'month',
  localTodayStr: string
): { startDate: string; endDate: string } {
  const [y, m, d] = localTodayStr.split('-').map(Number);
  const todayDate = new Date(y, m - 1, d);

  if (timeframe === 'day') {
    return { startDate: localTodayStr, endDate: localTodayStr };
  } else if (timeframe === 'week') {
    const startDateObj = new Date(todayDate);
    startDateObj.setDate(startDateObj.getDate() - 6);
    const startY = startDateObj.getFullYear();
    const startM = String(startDateObj.getMonth() + 1).padStart(2, '0');
    const startD = String(startDateObj.getDate()).padStart(2, '0');
    return {
      startDate: `${startY}-${startM}-${startD}`,
      endDate: localTodayStr,
    };
  } else {
    const startM = String(m).padStart(2, '0');
    return {
      startDate: `${y}-${startM}-01`,
      endDate: localTodayStr,
    };
  }
}

/**
 * Fetch Release Manifest (Base-Path Aware)
 */
export async function fetchReleaseManifest(): Promise<ReleaseManifest> {
  if (releaseManifestCache) return releaseManifestCache;

  const manifestUrl = getBasePathAwareUrl('data/releases/release_manifest.json');
  const res = await fetch(manifestUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch release manifest (${res.status}): ${res.statusText}`);
  }

  releaseManifestCache = await res.json();
  return releaseManifestCache!;
}

/**
 * Fetch & Decompress Shared Platforms Metadata (metadata/platforms.json.gz)
 */
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

/**
 * Fetch & Decompress Individual Release Partition File (.json.gz)
 */
export async function fetchReleasePartitionFile(relPath: string): Promise<ReleaseListingRecord[]> {
  if (cachedPartitionsMap.has(relPath)) {
    return cachedPartitionsMap.get(relPath)!;
  }

  // Check IndexedDB
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

  // Save to IndexedDB
  try {
    const db = await openIndexedDB();
    const tx = db.transaction('release_partitions', 'readwrite');
    tx.objectStore('release_partitions').put({ year: relPath, records });
  } catch (err) {
    console.warn('Failed to store partition in IndexedDB:', err);
  }

  return records;
}

/**
 * Adapter: Convert ReleaseListingRecord to UI GameItem
 */
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
    rating: 9.0,
    releaseDate: record.firstReleaseDate || 'Unknown',
    platforms: platformNames,
    genres: [],
    developer: 'Game Studio',
    summary: record.summaryPreview || 'IGDB Source Record',
    category,
  };
}

/**
 * Query Partitioned Release Catalog (Dynamic Dates, Base-Path Aware, Gzip Decompression)
 */
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

  // Filter records by date range, defaultVisibility, and UI filters
  const filteredRecords = loadedRecords.filter(record => {
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
  }).sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));

  const games = filteredRecords.map(r => convertReleaseRecordToGameItem(r, platformsMap));

  return {
    games,
    records: filteredRecords,
    selectedDate: localToday,
    userTimezone,
    matchingPartitionsLoaded: partitionsToLoad.length,
  };
}
