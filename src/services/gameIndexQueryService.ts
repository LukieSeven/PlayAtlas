import { GameIndexRecord, CompiledGameIndex, IndexDiagnostics, IndexManifest } from '../types/indexSchema';
import { syncGameIndexCatalog } from './indexDbStorage';
import { GameItem } from '../types/game';

export interface QueryOptions {
  viewType: 'first_release' | 'platform_release'; // Dual View Modes
  timeframe: 'day' | 'week' | 'month';
  category?: string;
  genre?: string;
  platform?: string;
}

export interface QueryResult {
  games: GameItem[];
  records: GameIndexRecord[];
  manifest: IndexManifest | null;
  diagnostics: IndexDiagnostics | null;
  selectedDate: string;
  userTimezone: string;
}

let compiledCatalogCache: CompiledGameIndex | null = null;

/**
 * Get User's Local Browser Timezone & ISO Date ('yyyy-MM-dd')
 */
export function getUserLocalDate(): { dateStr: string; timezone: string } {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    timezone,
  };
}

/**
 * Helper to map GameCategory to GameItem category union
 */
function mapRecordCategoryToUiCategory(recordCategory: string): 'Base Game' | 'DLC / Expansion' | 'Bundle' | 'Remake' | 'Mod' | undefined {
  if (recordCategory === 'Base Game') return 'Base Game';
  if (recordCategory === 'DLC' || recordCategory === 'Expansion' || recordCategory === 'Standalone Expansion' || recordCategory === 'Pack') return 'DLC / Expansion';
  if (recordCategory === 'Bundle') return 'Bundle';
  if (recordCategory === 'Remake' || recordCategory === 'Remaster') return 'Remake';
  if (recordCategory === 'Mod') return 'Mod';
  return 'Base Game';
}

/**
 * Adapter: Convert GameIndexRecord to UI GameItem
 */
export function convertIndexRecordToGameItem(record: GameIndexRecord): GameItem {
  return {
    id: record.id,
    title: record.title,
    coverUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: record.firstReleaseDate || 'Unknown',
    platforms: record.platforms.map(p => p.name),
    genres: record.genres.map(g => g.name),
    developer: 'Game Studio',
    summary: `Source path: ${record.sourceRecordPath}`,
    category: mapRecordCategoryToUiCategory(record.category),
  };
}

/**
 * Query Local IndexedDB Catalog Chronologically by Date
 */
export async function queryGameIndex(options: QueryOptions): Promise<QueryResult> {
  if (!compiledCatalogCache) {
    compiledCatalogCache = await syncGameIndexCatalog();
  }

  const { dateStr: userToday, timezone: userTimezone } = getUserLocalDate();
  const records = compiledCatalogCache.records;

  // Filter records chronologically by date and view type
  const matchedRecords = records.filter(record => {
    let dateMatch = false;

    if (options.viewType === 'first_release') {
      // Mode 1: Games receiving their first-ever release on selected date
      if (options.timeframe === 'day') {
        dateMatch = record.firstReleaseDate === userToday;
      } else if (options.timeframe === 'week') {
        dateMatch = record.firstReleaseDate !== null && record.firstReleaseDate >= '2026-07-24' && record.firstReleaseDate <= userToday;
      } else if (options.timeframe === 'month') {
        dateMatch = record.firstReleaseDate !== null && record.firstReleaseDate >= '2026-07-01' && record.firstReleaseDate <= userToday;
      }
    } else {
      // Mode 2: Games receiving a platform-specific release on selected date
      if (options.timeframe === 'day') {
        dateMatch = record.platformReleaseDates.some(p => p.dateStr === userToday);
      } else if (options.timeframe === 'week') {
        dateMatch = record.platformReleaseDates.some(
          p => p.dateStr !== null && p.dateStr >= '2026-07-24' && p.dateStr <= userToday
        );
      } else if (options.timeframe === 'month') {
        dateMatch = record.platformReleaseDates.some(
          p => p.dateStr !== null && p.dateStr >= '2026-07-01' && p.dateStr <= userToday
        );
      }
    }

    if (!dateMatch) return false;

    // Optional Category Filter
    if (options.category && options.category !== 'All') {
      if (options.category === 'Main Games' && record.category !== 'Base Game') return false;
      if (options.category !== 'Main Games' && record.category !== options.category) return false;
    }

    // Optional Genre Filter
    if (options.genre && options.genre !== 'all') {
      if (!record.genres.some(g => g.name.toLowerCase() === options.genre?.toLowerCase())) return false;
    }

    // Optional Platform Filter
    if (options.platform && options.platform !== 'all') {
      if (!record.platforms.some(p => p.name.toLowerCase() === options.platform?.toLowerCase())) return false;
    }

    return true;
  }).sort((a, b) => {
    const tsA = a.firstReleaseTimestamp || 0;
    const tsB = b.firstReleaseTimestamp || 0;
    return tsB - tsA; // Chronological descending sort
  });

  const games = matchedRecords.map(convertIndexRecordToGameItem);

  return {
    games,
    records: matchedRecords,
    manifest: compiledCatalogCache.manifest,
    diagnostics: compiledCatalogCache.diagnostics,
    selectedDate: userToday,
    userTimezone,
  };
}
