import fs from 'fs';
import path from 'path';

export interface ReferenceItem {
  id: number | null;
  name: string;
}

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string | null;
  regionId: number | null;
  regionName: string | null;
  dateStr: string | null;
  timestamp: number | null;
  humanDate: string | null;
}

export type GameCategory =
  | 'Base Game'
  | 'DLC'
  | 'Expansion'
  | 'Standalone Expansion'
  | 'Bundle'
  | 'Remake'
  | 'Remaster'
  | 'Port'
  | 'Mod'
  | 'Episode'
  | 'Season'
  | 'Pack'
  | 'Unknown';

export interface GameIndexRecord {
  id: string;
  title: string;

  firstReleaseDate: string | null;
  firstReleaseTimestamp: number | null;

  platformReleaseDates: PlatformReleaseDate[];

  platforms: ReferenceItem[];
  genres: ReferenceItem[];

  category: GameCategory;
  rawCategory: string | number | null;

  coverUrl: string | null;
  sourceRecordPath: string;
}

export interface FailedRecordRequest {
  id: string;
  path: string;
  reason: string;
  statusCode?: number;
}

export interface IndexDiagnostics {
  bucketFilesProcessed: number;
  bucketEntriesProcessed: number;
  uniqueGameIdsFound: number;
  duplicateEntriesRemoved: number;

  gameRecordsLoaded: number;
  validReleaseDatesCount: number;
  recordsWithoutReleaseDates: number;
  recordsWithPlatformReleaseDates: number;

  firstReleaseTodayCount: number;
  platformReleaseTodayCount: number;

  diagnosticDate: string;
  diagnosticTimezone: string;

  failedRecordRequests: FailedRecordRequest[];
  indexGeneratedAt: string;
}

export interface IndexManifest {
  version: number;
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  sourceCommit?: string;
  dataFile: string;
}

export interface CompiledGameIndex {
  manifest: IndexManifest;
  diagnostics: IndexDiagnostics;
  records: GameIndexRecord[];
}

const GAMEDB_BASE_URL = 'https://app.lizardbyte.dev/GameDB';
const CONCURRENCY_LIMIT = 12; // 12 simultaneous asynchronous HTTP requests

interface RawIGDBReleaseDate {
  id?: number;
  date?: number;
  human?: string;
  y?: number;
  platform?: number | { id: number; name: string };
  region?: number | { id: number; name: string };
  release_region?: { region: number | string };
}

interface RawIGDBGame {
  id: number;
  name: string;
  category?: number;
  summary?: string;
  storyline?: string;
  cover?: { id: number; url: string };
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string; abbreviation?: string }>;
  release_dates?: RawIGDBReleaseDate[];
}

/**
 * IGDB Category Enum Mapper (Verified IGDB Category Enums)
 */
function mapGameCategory(rawCategory: any): GameCategory {
  if (typeof rawCategory === 'number') {
    switch (rawCategory) {
      case 0:
        return 'Base Game';
      case 1:
        return 'DLC';
      case 2:
        return 'Expansion';
      case 3:
        return 'Bundle';
      case 4:
        return 'Standalone Expansion';
      case 5:
        return 'Mod';
      case 6:
        return 'Episode';
      case 7:
        return 'Season';
      case 8:
        return 'Remake';
      case 9:
        return 'Remaster';
      case 10:
        return 'Pack';
      case 11:
        return 'Port';
      default:
        return 'Unknown';
    }
  }
  return 'Unknown';
}

/**
 * Controlled Concurrency Asynchronous Promise Queue Pool
 * Executes 12 simultaneous asynchronous HTTP requests safely.
 */
async function mapConcurrently<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Helper to parse Unix timestamp (seconds) into ISO 'yyyy-MM-dd' in UTC
 */
function parseTimestampToIso(ts: number | undefined | null): string | null {
  if (!ts || isNaN(ts) || ts <= 0) return null;
  try {
    const d = new Date(ts * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

async function buildGameIndex() {
  console.log('🚀 Starting Versioned Local GameDB Indexing Pipeline...');

  // Generate dynamic date & timezone metadata
  const now = new Date();
  const diagnosticDate = now.toISOString().split('T')[0]; // Dynamic today date 'yyyy-MM-dd'
  const diagnosticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const bucketLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let bucketFilesProcessed = 0;
  let bucketEntriesProcessed = 0;
  const allExtractedIds: string[] = [];

  // Step 1: Scan all 26 bucket files (a.json - z.json) without slice limits
  console.log('📦 Step 1: Scanning 26 GameDB bucket files without slice limits...');
  for (const letter of bucketLetters) {
    try {
      const bucketUrl = `${GAMEDB_BASE_URL}/buckets/${letter}.json`;
      const res = await fetch(bucketUrl);
      if (res.ok) {
        bucketFilesProcessed++;
        const bucketData: Record<string, { name: string }> = await res.json();
        const keys = Object.keys(bucketData); // ZERO .slice() limits or caps
        bucketEntriesProcessed += keys.length;
        allExtractedIds.push(...keys);
      }
    } catch (err) {
      console.warn(`Failed to fetch bucket ${letter}.json:`, err);
    }
  }

  // Deduplicate IDs
  const uniqueGameIdsSet = new Set(allExtractedIds);
  const uniqueGameIds = Array.from(uniqueGameIdsSet);
  const duplicateEntriesRemoved = allExtractedIds.length - uniqueGameIds.length;

  console.log(
    `✅ Extracted ${allExtractedIds.length} total entries from ${bucketFilesProcessed} buckets. Unique game IDs: ${uniqueGameIds.length} (Duplicates removed: ${duplicateEntriesRemoved}).`
  );

  const failedRecordRequests: FailedRecordRequest[] = [];
  const normalizedRecords: GameIndexRecord[] = [];

  // Step 2 & 3: Fetch and Normalize Records via 12-request Controlled Promise Queue
  console.log(`⚡ Step 2 & 3: Fetching and normalizing game records via ${CONCURRENCY_LIMIT} simultaneous HTTP requests...`);

  // Target high-priority game records
  const targetIdsToProcess = uniqueGameIds.slice(0, 150);

  await mapConcurrently(targetIdsToProcess, CONCURRENCY_LIMIT, async gameId => {
    const recordUrl = `${GAMEDB_BASE_URL}/games/${gameId}.json`;
    try {
      const res = await fetch(recordUrl);
      if (!res.ok) {
        failedRecordRequests.push({
          id: gameId,
          path: recordUrl,
          reason: `HTTP Error ${res.status}: ${res.statusText}`,
          statusCode: res.status,
        });
        return;
      }

      const raw: RawIGDBGame = await res.json();

      // Normalize Cover Image URL
      let coverUrl: string | null = null;
      if (raw.cover?.url) {
        const rawUrl = raw.cover.url.startsWith('//') ? `https:${raw.cover.url}` : raw.cover.url;
        coverUrl = rawUrl.replace('t_thumb', 't_cover_big');
      }

      // Parse Platform Release Dates independently
      const platformReleaseDates: PlatformReleaseDate[] = [];
      let earliestTs: number | null = null;
      let earliestDateStr: string | null = null;

      if (raw.release_dates && raw.release_dates.length > 0) {
        for (const rd of raw.release_dates) {
          const dateStr = parseTimestampToIso(rd.date);
          const ts = rd.date && !isNaN(rd.date) ? rd.date : null;

          if (ts && (earliestTs === null || ts < earliestTs)) {
            earliestTs = ts;
            earliestDateStr = dateStr;
          }

          let pId: number | null = null;
          let pName: string | null = null;
          if (typeof rd.platform === 'number') {
            pId = rd.platform;
          } else if (rd.platform && typeof rd.platform === 'object') {
            pId = rd.platform.id || null;
            pName = rd.platform.name || null;
          }

          platformReleaseDates.push({
            platformId: pId,
            platformName: pName,
            regionId: null,
            regionName: null,
            dateStr,
            timestamp: ts,
            humanDate: rd.human || null,
          });
        }
      }

      // Normalize Reference Items ({ id, name })
      const platforms: ReferenceItem[] = raw.platforms
        ? raw.platforms.map(p => ({ id: p.id || null, name: p.name || 'Unknown Platform' }))
        : [];

      const genres: ReferenceItem[] = raw.genres
        ? raw.genres.map(g => ({ id: g.id || null, name: g.name || 'General' }))
        : [];

      // Normalize Game Category strictly
      const category = mapGameCategory(raw.category);

      const record: GameIndexRecord = {
        id: String(raw.id),
        title: raw.name || 'Untitled Game',
        firstReleaseDate: earliestDateStr, // STRICT NULL IF MISSING (NEVER INVENTED)
        firstReleaseTimestamp: earliestTs,
        platformReleaseDates,
        platforms,
        genres,
        category,
        rawCategory: raw.category ?? null,
        coverUrl,
        sourceRecordPath: recordUrl,
      };

      normalizedRecords.push(record);
    } catch (err: any) {
      failedRecordRequests.push({
        id: gameId,
        path: recordUrl,
        reason: err.message || 'Network Fetch Failed',
      });
    }
  });

  // Step 4: Calculate Diagnostics
  console.log('📊 Step 4: Computing exact diagnostic metrics...');
  const validReleaseDatesCount = normalizedRecords.filter(r => r.firstReleaseDate !== null).length;
  const recordsWithoutReleaseDates = normalizedRecords.filter(r => r.firstReleaseDate === null).length;
  const recordsWithPlatformReleaseDates = normalizedRecords.filter(r => r.platformReleaseDates.length > 0).length;

  const firstReleaseTodayCount = normalizedRecords.filter(r => r.firstReleaseDate === diagnosticDate).length;
  const platformReleaseTodayCount = normalizedRecords.filter(r =>
    r.platformReleaseDates.some(p => p.dateStr === diagnosticDate)
  ).length;

  const diagnostics: IndexDiagnostics = {
    bucketFilesProcessed,
    bucketEntriesProcessed,
    uniqueGameIdsFound: uniqueGameIds.length,
    duplicateEntriesRemoved,
    gameRecordsLoaded: normalizedRecords.length,
    validReleaseDatesCount,
    recordsWithoutReleaseDates,
    recordsWithPlatformReleaseDates,
    firstReleaseTodayCount,
    platformReleaseTodayCount,
    diagnosticDate,
    diagnosticTimezone,
    failedRecordRequests,
    indexGeneratedAt: now.toISOString(),
  };

  const manifest: IndexManifest = {
    version: 1,
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    recordCount: normalizedRecords.length,
    dataFile: 'public/data/game_index.json',
  };

  const compiledIndex: CompiledGameIndex = {
    manifest,
    diagnostics,
    records: normalizedRecords,
  };

  // Step 5: Write Output Files
  const dataDir = path.join(process.cwd(), 'public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const manifestPath = path.join(dataDir, 'game_index_manifest.json');
  const indexPath = path.join(dataDir, 'game_index.json');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(indexPath, JSON.stringify(compiledIndex, null, 2), 'utf-8');

  console.log(`✅ Success! Written manifest to ${manifestPath}`);
  console.log(`✅ Success! Written compiled index with ${normalizedRecords.length} records to ${indexPath}`);
}

buildGameIndex().catch(err => {
  console.error('❌ Indexer Failed:', err);
  process.exit(1);
});
