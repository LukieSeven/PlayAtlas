import fs from 'fs';
import path from 'path';

// Helper to load local .env or .env.local file if present
function loadEnvFile() {
  const envPaths = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.local')];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnvFile();

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const IMPORT_LIMIT_ENV = process.env.IGDB_IMPORT_LIMIT;
const IMPORT_LIMIT = IMPORT_LIMIT_ENV ? parseInt(IMPORT_LIMIT_ENV, 10) : 500; // Default 500 for test milestone

export interface ReferenceItem {
  id: number | null;
  name: string;
}

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string;
  date: string | null;
  region: string | null;
  status: string | null;
  datePrecision: string | null;
}

export interface GameIndexRecord {
  id: string; // e.g. "igdb:12345"
  source: 'igdb';
  sourceId: number;

  name: string;
  title: string;
  slug: string | null;

  gameType: string;
  rawGameType: number | null;
  defaultVisible: boolean;
  category: string;

  firstReleaseDate: string | null;
  firstReleaseTimestamp: number | null;

  platformReleaseDates: PlatformReleaseDate[];

  platforms: Array<{
    id: number;
    name: string;
    abbreviation: string | null;
  }>;

  genres: Array<{
    id: number;
    name: string;
  }>;

  coverUrl: string | null;
  summary: string | null;

  externalIds: {
    steam?: string;
    gog?: string;
    epic?: string;
    xbox?: string;
    playstation?: string;
    nintendo?: string;
    [key: string]: string | undefined;
  };

  igdbUpdatedAt: string | null;
  sourceRecordPath: string;
}

export interface FailedRecordRequest {
  id: string;
  path: string;
  reason: string;
  statusCode?: number;
}

export interface IndexDiagnostics {
  igdbGamesDownloaded: number;
  recordsNormalized: number;
  recordsWithReleaseDates: number;
  recordsWithPlatformReleaseDates: number;
  defaultVisibleCount: number;
  hiddenDlcCount: number;
  unknownGameTypesCount: number;
  duplicateRecordsRemoved: number;
  invalidRecordsSkipped: number;

  gameRecordsLoaded: number;
  validReleaseDatesCount: number;
  recordsWithoutReleaseDates: number;
  firstReleaseTodayCount: number;
  platformReleaseTodayCount: number;

  diagnosticDate: string;
  diagnosticTimezone: string;
  failedRecordRequests: FailedRecordRequest[];
  indexGeneratedAt: string;
}

export interface IndexManifest {
  source: 'igdb';
  version: number;
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  defaultVisibleCount: number;
  fileCount: number;
  files: string[];
  sourceCommit?: string;
  dataFile: string;
}

export interface CompiledGameIndex {
  manifest: IndexManifest;
  diagnostics: IndexDiagnostics;
  records: GameIndexRecord[];
}

/**
 * Twitch OAuth Client Credentials Access Token Request
 */
async function getTwitchAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
    clientId
  )}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;

  const res = await fetch(tokenUrl, { method: 'POST' });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Twitch OAuth Token request failed (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Twitch OAuth response missing access_token');
  }

  return data.access_token;
}

/**
 * IGDB Game Type Enum Mapping & Default Visibility Rules
 */
function mapGameType(rawType: number | undefined | null): { gameType: string; defaultVisible: boolean } {
  if (typeof rawType !== 'number') {
    return { gameType: 'Unknown', defaultVisible: false };
  }

  switch (rawType) {
    case 0:
      return { gameType: 'Main Game', defaultVisible: true };
    case 1:
      return { gameType: 'DLC / Add-on', defaultVisible: false };
    case 2:
      return { gameType: 'Expansion', defaultVisible: false };
    case 3:
      return { gameType: 'Bundle', defaultVisible: false };
    case 4:
      return { gameType: 'Standalone Expansion', defaultVisible: true };
    case 5:
      return { gameType: 'Mod', defaultVisible: false };
    case 6:
      return { gameType: 'Episode', defaultVisible: false };
    case 7:
      return { gameType: 'Season', defaultVisible: false };
    case 8:
      return { gameType: 'Remake', defaultVisible: true };
    case 9:
      return { gameType: 'Remaster', defaultVisible: true };
    case 10:
      return { gameType: 'Expanded Game', defaultVisible: true };
    case 11:
      return { gameType: 'Port', defaultVisible: true };
    case 12:
      return { gameType: 'Fork', defaultVisible: false };
    case 13:
      return { gameType: 'Pack', defaultVisible: false };
    case 14:
      return { gameType: 'Update', defaultVisible: false };
    default:
      return { gameType: 'Unknown', defaultVisible: false };
  }
}

/**
 * IGDB Region Enum Mapping
 */
function mapRegion(regionVal: any): string | null {
  const code = typeof regionVal === 'object' && regionVal ? regionVal.region : regionVal;
  if (typeof code === 'number') {
    switch (code) {
      case 1:
        return 'Europe';
      case 2:
        return 'North America';
      case 3:
        return 'Australia';
      case 4:
        return 'New Zealand';
      case 5:
        return 'Japan';
      case 6:
        return 'China';
      case 7:
        return 'Asia';
      case 8:
        return 'Worldwide';
      default:
        return 'Worldwide';
    }
  }
  return null;
}

/**
 * IGDB Date Format / Precision Mapping
 */
function mapDatePrecision(formatVal: any): string | null {
  const fmt = typeof formatVal === 'object' && formatVal ? formatVal.format : formatVal;
  if (typeof fmt === 'number') {
    switch (fmt) {
      case 0:
        return 'Exact day';
      case 1:
        return 'Month only';
      case 2:
        return 'Quarter only';
      case 3:
        return 'Year only';
      case 4:
        return 'TBD';
      default:
        return 'Exact day';
    }
  }
  return 'Exact day';
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

async function runIgdbImporter() {
  console.log('🚀 Starting IGDB Play Atlas Database Importer...');

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    console.error('❌ ERROR: Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET environment variables.');
    console.error('Please ensure IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are set before running this script.');
    process.exit(1);
  }

  console.log('🔐 Requesting Twitch Application Access Token...');
  const accessToken = await getTwitchAccessToken(IGDB_CLIENT_ID, IGDB_CLIENT_SECRET);
  console.log('✅ Twitch Authentication Successful! (Access token acquired & masked).');

  const now = new Date();
  const diagnosticDate = now.toISOString().split('T')[0];
  const diagnosticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  console.log(`📥 Querying IGDB API /games endpoint (Limit: ${IMPORT_LIMIT} records)...`);

  // Target query: centered on recent & upcoming release window (from Jan 1, 2024 onwards)
  const apqBody = `
    fields name, slug, game_type.type, first_release_date,
           release_dates.date, release_dates.platform.id, release_dates.platform.name, release_dates.platform.abbreviation, release_dates.release_region.region, release_dates.date_format.format, release_dates.status.name,
           platforms.id, platforms.name, platforms.abbreviation,
           genres.id, genres.name,
           cover.url, summary, storyline, status,
           external_games.external_game_source.name, external_games.uid,
           updated_at;
    where first_release_date != null & first_release_date >= 1704067200;
    sort first_release_date desc;
    limit ${IMPORT_LIMIT};
  `;

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': IGDB_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body: apqBody,
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`❌ IGDB API Query Failed (HTTP ${res.status}): ${errBody}`);
    process.exit(1);
  }

  const rawGames: any[] = await res.json();
  console.log(`✅ Received ${rawGames.length} raw IGDB game records.`);

  const failedRecordRequests: FailedRecordRequest[] = [];
  const normalizedRecords: GameIndexRecord[] = [];
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  let invalidCount = 0;
  let unknownTypeCount = 0;

  for (const raw of rawGames) {
    if (!raw.id || !raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
      invalidCount++;
      continue;
    }

    const recordId = `igdb:${raw.id}`;
    if (seenIds.has(recordId)) {
      duplicateCount++;
      continue;
    }
    seenIds.add(recordId);

    // Normalize Cover Image URL
    let coverUrl: string | null = null;
    if (raw.cover?.url) {
      const rawUrl = raw.cover.url.startsWith('//') ? `https:${raw.cover.url}` : raw.cover.url;
      coverUrl = rawUrl.replace('t_thumb', 't_cover_big');
    }

    // Game Type & Default Visibility
    const rawCategoryNumber = raw.game_type?.type ?? raw.game_type;
    const { gameType, defaultVisible } = mapGameCategory(rawCategoryNumber);
    if (gameType === 'Unknown') unknownTypeCount++;

    // Release Dates
    const firstReleaseDate = parseTimestampToIso(raw.first_release_date);
    const platformReleaseDates: PlatformReleaseDate[] = [];

    if (Array.isArray(raw.release_dates)) {
      for (const rd of raw.release_dates) {
        const dateStr = parseTimestampToIso(rd.date);
        let pId: number | null = null;
        let pName = 'Unknown Platform';

        if (rd.platform) {
          pId = rd.platform.id || (typeof rd.platform === 'number' ? rd.platform : null);
          pName = rd.platform.name || 'Unknown Platform';
        }

        platformReleaseDates.push({
          platformId: pId,
          platformName: pName,
          date: dateStr,
          region: mapRegion(rd.release_region),
          status: rd.status?.name || null,
          datePrecision: mapDatePrecision(rd.date_format),
        });
      }
    }

    // Platforms
    const platforms = Array.isArray(raw.platforms)
      ? raw.platforms.map((p: any) => ({
          id: p.id || 0,
          name: p.name || 'Unknown Platform',
          abbreviation: p.abbreviation || null,
        }))
      : [];

    // Genres
    const genres = Array.isArray(raw.genres)
      ? raw.genres.map((g: any) => ({
          id: g.id || 0,
          name: g.name || 'General',
        }))
      : [];

    // External Store IDs
    const externalIds: GameIndexRecord['externalIds'] = {};
    if (Array.isArray(raw.external_games)) {
      for (const ext of raw.external_games) {
        const sourceName = (ext.external_game_source?.name || '').toLowerCase();
        const uid = ext.uid;
        if (uid) {
          if (sourceName.includes('steam')) externalIds.steam = uid;
          else if (sourceName.includes('gog')) externalIds.gog = uid;
          else if (sourceName.includes('epic')) externalIds.epic = uid;
          else if (sourceName.includes('xbox') || sourceName.includes('microsoft')) externalIds.xbox = uid;
          else if (sourceName.includes('playstation')) externalIds.playstation = uid;
          else if (sourceName.includes('nintendo')) externalIds.nintendo = uid;
          else externalIds[sourceName] = uid;
        }
      }
    }

    const record: GameIndexRecord = {
      id: recordId,
      source: 'igdb',
      sourceId: raw.id,
      name: raw.name.trim(),
      title: raw.name.trim(),
      slug: raw.slug || null,
      gameType,
      rawGameType: typeof rawCategoryNumber === 'number' ? rawCategoryNumber : null,
      defaultVisible,
      category: gameType,
      firstReleaseDate,
      firstReleaseTimestamp: raw.first_release_date || null,
      platformReleaseDates,
      platforms,
      genres,
      coverUrl,
      summary: raw.summary || raw.storyline || null,
      externalIds,
      igdbUpdatedAt: raw.updated_at ? new Date(raw.updated_at * 1000).toISOString() : null,
      sourceRecordPath: `https://api.igdb.com/v4/games/${raw.id}`,
    };

    normalizedRecords.push(record);
  }

  // Diagnostics Calculation
  const defaultVisibleCount = normalizedRecords.filter(r => r.defaultVisible).length;
  const hiddenDlcCount = normalizedRecords.filter(r => !r.defaultVisible).length;
  const validReleaseDatesCount = normalizedRecords.filter(r => r.firstReleaseDate !== null).length;
  const recordsWithPlatformReleaseDates = normalizedRecords.filter(r => r.platformReleaseDates.length > 0).length;
  const firstReleaseTodayCount = normalizedRecords.filter(r => r.firstReleaseDate === diagnosticDate).length;
  const platformReleaseTodayCount = normalizedRecords.filter(r =>
    r.platformReleaseDates.some(p => p.date === diagnosticDate)
  ).length;

  const diagnostics: IndexDiagnostics = {
    igdbGamesDownloaded: rawGames.length,
    recordsNormalized: normalizedRecords.length,
    recordsWithReleaseDates: validReleaseDatesCount,
    recordsWithPlatformReleaseDates,
    defaultVisibleCount,
    hiddenDlcCount,
    unknownGameTypesCount: unknownTypeCount,
    duplicateRecordsRemoved: duplicateCount,
    invalidRecordsSkipped: invalidCount,
    gameRecordsLoaded: normalizedRecords.length,
    validReleaseDatesCount,
    recordsWithoutReleaseDates: normalizedRecords.length - validReleaseDatesCount,
    firstReleaseTodayCount,
    platformReleaseTodayCount,
    diagnosticDate,
    diagnosticTimezone,
    failedRecordRequests,
    indexGeneratedAt: now.toISOString(),
  };

  const manifest: IndexManifest = {
    source: 'igdb',
    version: 1,
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    recordCount: normalizedRecords.length,
    defaultVisibleCount,
    fileCount: 1,
    files: ['data/igdb_index.json'],
    dataFile: 'data/igdb_index.json',
  };

  const compiledIndex: CompiledGameIndex = {
    manifest,
    diagnostics,
    records: normalizedRecords,
  };

  // Write output files to public/data/igdb_index_manifest.json and public/data/igdb_index.json
  const dataDir = path.join(process.cwd(), 'public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const manifestPath = path.join(dataDir, 'igdb_index_manifest.json');
  const indexPath = path.join(dataDir, 'igdb_index.json');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(indexPath, JSON.stringify(compiledIndex, null, 2), 'utf-8');

  console.log('----------------------------------------------------');
  console.log('📊 IGDB IMPORTER DIAGNOSTICS REPORT');
  console.log('----------------------------------------------------');
  console.log(`📥 IGDB Games Downloaded:        ${rawGames.length}`);
  console.log(`✅ Records Normalized:            ${normalizedRecords.length}`);
  console.log(`📅 Records with Release Dates:    ${validReleaseDatesCount}`);
  console.log(`🎮 Default-Visible Records:       ${defaultVisibleCount}`);
  console.log(`📦 Hidden DLC / Add-ons:          ${hiddenDlcCount}`);
  console.log(`❓ Unknown Game Types:            ${unknownTypeCount}`);
  console.log(`🔁 Duplicates Removed:            ${duplicateCount}`);
  console.log(`⚠️ Invalid Records Skipped:       ${invalidCount}`);
  console.log(`📁 Manifest File:                 ${manifestPath}`);
  console.log(`📁 Database File:                 ${indexPath} (${(fs.statSync(indexPath).size / 1024).toFixed(1)} KB)`);
  console.log('----------------------------------------------------');
  console.log('✅ IGDB Importer Completed Successfully!');
}

function mapGameCategory(rawType: any): { gameType: string; defaultVisible: boolean } {
  const code = typeof rawType === 'object' && rawType ? rawType.type : rawType;
  return mapGameType(code);
}

runIgdbImporter().catch(err => {
  console.error('❌ IGDB Importer Failed:', err);
  process.exit(1);
});
