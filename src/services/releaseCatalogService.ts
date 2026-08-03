import { getBasePathAwareUrl } from './catalogDataSource';
import { GameItem } from '../types/game';
import { openIndexedDB } from './indexDbStorage';
import { ReleaseListingRecord } from '../../scripts/build-browser-catalog';

export interface ReleaseManifestPartition {
  key: string;
  file: string;
  recordCount: number;
  byteSize: number;
  sha256: string;
}

export interface ReleaseManifest {
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  totalBytes: number;
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
    // 7 rolling days (today - 6 days through today)
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
    // Month mode: 1st of current month through today
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
 * Fetch & Cache Individual Release Partition File
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

  const fileUrl = getBasePathAwareUrl(`data/${relPath}`);
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch release partition file ${relPath} (${res.status})`);
  }

  const records: ReleaseListingRecord[] = await res.json();
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
export function convertReleaseRecordToGameItem(record: ReleaseListingRecord): GameItem {
  const typeStr = record.gameTypeLabel || record.gameType || 'Main Game';
  let category: GameItem['category'] = 'Base Game';
  if (typeStr.includes('DLC') || typeStr.includes('Expansion') || typeStr.includes('Pack')) category = 'DLC / Expansion';
  else if (typeStr.includes('Bundle')) category = 'Bundle';
  else if (typeStr.includes('Remake') || typeStr.includes('Remaster')) category = 'Remake';
  else if (typeStr.includes('Mod')) category = 'Mod';

  return {
    id: record.id,
    title: record.name,
    coverUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: record.firstReleaseDate || 'Unknown',
    platforms: record.platforms.map(p => p.name),
    genres: [],
    developer: 'Game Studio',
    summary: record.summaryPreview || 'IGDB Source Record',
    category,
  };
}

/**
 * Query Partitioned Release Catalog (Dynamic Dates, Base-Path Aware)
 */
export async function queryReleaseCatalog(options: ReleaseQueryOptions): Promise<ReleaseQueryResult> {
  const { dateStr: localToday, timezone: userTimezone } = getDynamicLocalDate();
  const { startDate, endDate } = calculateDynamicDateRange(options.timeframe, localToday);

  const manifest = await fetchReleaseManifest();

  // Find relevant partition files for the date range
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);

  const targetPartitions = manifest.partitions.filter(p => {
    // Match year or year/month subfolder
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
      // Platform release mode
      if (!Array.isArray(record.platformReleaseDates) || record.platformReleaseDates.length === 0) {
        if (!record.firstReleaseDate) return false;
        return record.firstReleaseDate >= startDate && record.firstReleaseDate <= endDate;
      }

      return record.platformReleaseDates.some(
        prd => prd.date != null && prd.date >= startDate && prd.date <= endDate
      );
    }
  }).sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));

  const games = filteredRecords.map(convertReleaseRecordToGameItem);

  return {
    games,
    records: filteredRecords,
    selectedDate: localToday,
    userTimezone,
    matchingPartitionsLoaded: partitionsToLoad.length,
  };
}
