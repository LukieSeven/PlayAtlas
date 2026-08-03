import { GameIndexRecord, CompiledGameIndex, IndexDiagnostics, IndexManifest } from '../types/indexSchema';
import { syncGameIndexCatalog } from './indexDbStorage';
import { GameItem } from '../types/game';

export interface QueryOptions {
  viewType: 'first_release' | 'platform_release'; // Dual View Modes
  timeframe: 'day' | 'week' | 'month';
  category?: string;
  genre?: string;
  platform?: string;
  includeHidden?: boolean; // Set true for search queries
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
 * Helper to map GameCategory/GameType to GameItem category union
 */
function mapRecordCategoryToUiCategory(record: GameIndexRecord): 'Base Game' | 'DLC / Expansion' | 'Bundle' | 'Remake' | 'Mod' | undefined {
  const typeStr = record.gameType || record.category || 'Main Game';
  if (typeStr === 'Main Game' || typeStr === 'Base Game' || typeStr === 'Expanded Game' || typeStr === 'Port') return 'Base Game';
  if (typeStr.includes('DLC') || typeStr.includes('Expansion') || typeStr.includes('Pack')) return 'DLC / Expansion';
  if (typeStr.includes('Bundle')) return 'Bundle';
  if (typeStr.includes('Remake') || typeStr.includes('Remaster')) return 'Remake';
  if (typeStr.includes('Mod')) return 'Mod';
  return 'Base Game';
}

/**
 * Adapter: Convert GameIndexRecord to UI GameItem
 */
export function convertIndexRecordToGameItem(record: GameIndexRecord): GameItem {
  const title = record.name || record.title || 'Untitled Game';
  return {
    id: record.id,
    title,
    coverUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: record.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: record.firstReleaseDate || 'Unknown',
    platforms: record.platforms.map(p => p.name),
    genres: record.genres.map(g => g.name),
    developer: 'Game Studio',
    summary: record.summary || `Source: ${record.sourceRecordPath || 'IGDB'}`,
    category: mapRecordCategoryToUiCategory(record),
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

  console.log(`[Query Diagnostics] Selected date: ${userToday} (${userTimezone})`);
  console.log(`[Query Diagnostics] Selected release mode: ${options.viewType} | Timeframe: ${options.timeframe}`);
  console.log(`[Query Diagnostics] Total catalog records in IndexedDB: ${records.length}`);

  // Step 1: Match by date & release view mode (before UI filters)
  const dateMatchedRecords = records.filter(record => {
    // Respect defaultVisible unless includeHidden is true
    if (!options.includeHidden && record.defaultVisible === false) {
      return false;
    }

    if (options.viewType === 'first_release') {
      // Mode 1: Games receiving their first-ever release on selected date
      if (options.timeframe === 'day') {
        return record.firstReleaseDate === userToday;
      } else if (options.timeframe === 'week') {
        return record.firstReleaseDate !== null && record.firstReleaseDate >= '2026-07-24' && record.firstReleaseDate <= userToday;
      } else if (options.timeframe === 'month') {
        return record.firstReleaseDate !== null && record.firstReleaseDate >= '2026-07-01' && record.firstReleaseDate <= userToday;
      }
    } else {
      // Mode 2: Games receiving a platform-specific release on selected date
      if (options.timeframe === 'day') {
        return record.platformReleaseDates.some(p => p.date === userToday || p.dateStr === userToday);
      } else if (options.timeframe === 'week') {
        return record.platformReleaseDates.some(
          p => (p.date != null && p.date >= '2026-07-24' && p.date <= userToday) ||
               (p.dateStr != null && p.dateStr >= '2026-07-24' && p.dateStr <= userToday)
        );
      } else if (options.timeframe === 'month') {
        return record.platformReleaseDates.some(
          p => (p.date != null && p.date >= '2026-07-01' && p.date <= userToday) ||
               (p.dateStr != null && p.dateStr >= '2026-07-01' && p.dateStr <= userToday)
        );
      }
    }
    return false;
  });

  console.log(`[Query Diagnostics] Number of matching records BEFORE UI filters: ${dateMatchedRecords.length}`);

  // Step 2: Apply UI filters (category, genre, platform)
  const finalFilteredRecords = dateMatchedRecords.filter(record => {
    if (options.category && options.category !== 'All') {
      const cat = record.gameType || record.category;
      if (options.category === 'Main Games' && cat !== 'Main Game' && cat !== 'Base Game') return false;
      if (options.category !== 'Main Games' && cat !== options.category) return false;
    }

    if (options.genre && options.genre !== 'all') {
      if (!record.genres.some(g => g.name.toLowerCase() === options.genre?.toLowerCase())) return false;
    }

    if (options.platform && options.platform !== 'all') {
      if (!record.platforms.some(p => p.name.toLowerCase() === options.platform?.toLowerCase())) return false;
    }

    return true;
  }).sort((a, b) => {
    const tsA = a.firstReleaseTimestamp || (a.firstReleaseDate ? new Date(a.firstReleaseDate).getTime() : 0);
    const tsB = b.firstReleaseTimestamp || (b.firstReleaseDate ? new Date(b.firstReleaseDate).getTime() : 0);
    return tsB - tsA; // Chronological descending sort
  });

  console.log(`[Query Diagnostics] Number of matching records AFTER UI filters: ${finalFilteredRecords.length}`);

  const games = finalFilteredRecords.map(convertIndexRecordToGameItem);

  return {
    games,
    records: finalFilteredRecords,
    manifest: compiledCatalogCache.manifest,
    diagnostics: compiledCatalogCache.diagnostics,
    selectedDate: userToday,
    userTimezone,
  };
}
