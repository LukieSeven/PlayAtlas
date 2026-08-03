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
const TARGET_LIMIT = IMPORT_LIMIT_ENV ? parseInt(IMPORT_LIMIT_ENV, 10) : 500;
const BATCH_LIMIT = Math.min(250, Math.floor(TARGET_LIMIT / 2));

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
  gameStatus: string | null;

  firstReleaseDate: string | null;
  firstReleaseTimestamp: number | null;
  datePrecision: string | null;

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
  coverImageId: string | null;
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
  recentIgdbRecordsReceived: number;
  upcomingIgdbRecordsReceived: number;
  recordsBeforeDeduplication: number;
  duplicateRecordsRemoved: number;
  finalNormalizedRecords: number;

  recordsWithExactFirstReleaseDates: number;
  recordsWithPartialFirstReleaseDates: number;
  recordsWithPlatformSpecificDates: number;
  recordsWithCovers: number;
  recordsWithoutCovers: number;

  defaultVisibleRecords: number;
  hiddenRecords: number;
  unknownGameTypes: number;
  invalidRecordsSkipped: number;

  generatedDatabaseSize: number;
  generatedManifestSize: number;

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

/**
 * Centralized Cover Image URL Builder from IGDB image_id
 */
function buildCoverUrl(imageId: string | undefined | null, size: string = 't_cover_big'): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId.trim()}.jpg`;
}

/**
 * Execute IGDB API Query over HTTPS with Apicalypse Body
 */
async function queryIgdb(apqBody: string, clientId: string, token: string): Promise<any[]> {
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: apqBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`IGDB API Query Error (HTTP ${res.status}): ${errText}`);
  }

  return await res.json();
}

async function runIgdbImporter() {
  console.log('🚀 Starting IGDB Play Atlas Live Database Importer Pipeline...');

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    console.error('❌ ERROR: Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET environment variables.');
    console.error('Please ensure IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are set before running this script.');
    process.exit(1);
  }

  console.log('🔐 Requesting Twitch Application Access Token...');
  const accessToken = await getTwitchAccessToken(IGDB_CLIENT_ID, IGDB_CLIENT_SECRET);
  console.log('✅ Twitch Authentication Successful! (Token acquired & masked).');

  const now = new Date();
  const currentTimestamp = Math.floor(now.getTime() / 1000);
  const twoYearsAgoTimestamp = Math.floor((now.getTime() - 2 * 365.25 * 86400 * 1000) / 1000);

  const diagnosticDate = now.toISOString().split('T')[0];
  const diagnosticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const fieldsSelection = `
    fields name, slug, game_type.type, game_status.status, first_release_date,
           release_dates.date,
           release_dates.platform.id,
           release_dates.platform.name,
           release_dates.platform.abbreviation,
           release_dates.release_region.region,
           release_dates.date_format.format,
           release_dates.status.name,
           platforms.id,
           platforms.name,
           platforms.abbreviation,
           genres.id,
           genres.name,
           cover.image_id,
           summary,
           storyline,
           external_games.external_game_source.name,
           external_games.uid,
           updated_at;
  `;

  // Query 1: 250 Recently Released Games
  console.log(`📥 Query 1: Fetching up to ${BATCH_LIMIT} recently released IGDB games...`);
  const query1Body = `
    ${fieldsSelection}
    where first_release_date != null
      & first_release_date <= ${currentTimestamp}
      & first_release_date >= ${twoYearsAgoTimestamp};
    sort first_release_date desc;
    limit ${BATCH_LIMIT};
  `;
  const recentGames = await queryIgdb(query1Body, IGDB_CLIENT_ID, accessToken);
  console.log(`✅ Query 1 received ${recentGames.length} recent games.`);

  // Query 2: 250 Upcoming Games
  console.log(`📥 Query 2: Fetching up to ${BATCH_LIMIT} upcoming IGDB games...`);
  const query2Body = `
    ${fieldsSelection}
    where first_release_date != null
      & first_release_date > ${currentTimestamp};
    sort first_release_date asc;
    limit ${BATCH_LIMIT};
  `;
  const upcomingGames = await queryIgdb(query2Body, IGDB_CLIENT_ID, accessToken);
  console.log(`✅ Query 2 received ${upcomingGames.length} upcoming games.`);

  const mergedRawGames = [...recentGames, ...upcomingGames];
  console.log(`🔄 Total raw games before deduplication: ${mergedRawGames.length}`);

  const failedRecordRequests: FailedRecordRequest[] = [];
  const normalizedRecords: GameIndexRecord[] = [];
  const seenIds = new Set<number>();
  let duplicateCount = 0;
  let invalidCount = 0;
  let unknownTypeCount = 0;
  let exactFirstReleaseDateCount = 0;
  let partialFirstReleaseDateCount = 0;
  let recordsWithCoversCount = 0;
  let recordsWithoutCoversCount = 0;

  for (const raw of mergedRawGames) {
    if (!raw.id || !raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
      invalidCount++;
      continue;
    }

    if (seenIds.has(raw.id)) {
      duplicateCount++;
      continue;
    }
    seenIds.add(raw.id);

    const recordId = `igdb:${raw.id}`;

    // Cover image_id handling
    const imageId = raw.cover?.image_id || null;
    const coverUrl = buildCoverUrl(imageId, 't_cover_big');
    if (coverUrl) recordsWithCoversCount++;
    else recordsWithoutCoversCount++;

    // Game Type & Default Visibility
    const rawCategoryNumber = raw.game_type?.type ?? raw.game_type;
    const { gameType, defaultVisible } = mapGameType(rawCategoryNumber);
    if (gameType === 'Unknown') unknownTypeCount++;

    // Release Dates
    const firstReleaseDate = parseTimestampToIso(raw.first_release_date);
    const platformReleaseDates: PlatformReleaseDate[] = [];

    let overallPrecision = 'Exact day';
    if (Array.isArray(raw.release_dates) && raw.release_dates.length > 0) {
      for (const rd of raw.release_dates) {
        const dateStr = parseTimestampToIso(rd.date);
        let pId: number | null = null;
        let pName = 'Unknown Platform';

        if (rd.platform) {
          pId = rd.platform.id || (typeof rd.platform === 'number' ? rd.platform : null);
          pName = rd.platform.name || 'Unknown Platform';
        }

        const precision = mapDatePrecision(rd.date_format);
        if (precision !== 'Exact day') overallPrecision = precision;

        platformReleaseDates.push({
          platformId: pId,
          platformName: pName,
          date: dateStr,
          region: mapRegion(rd.release_region),
          status: rd.status?.name || null,
          datePrecision: precision,
        });
      }
    }

    if (firstReleaseDate) {
      if (overallPrecision === 'Exact day') exactFirstReleaseDateCount++;
      else partialFirstReleaseDateCount++;
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

    const gameStatus = raw.game_status?.status ? String(raw.game_status.status) : null;

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
      gameStatus,
      firstReleaseDate,
      firstReleaseTimestamp: raw.first_release_date || null,
      datePrecision: overallPrecision,
      platformReleaseDates,
      platforms,
      genres,
      coverUrl,
      coverImageId: imageId,
      summary: raw.summary || raw.storyline || null,
      externalIds,
      igdbUpdatedAt: raw.updated_at ? new Date(raw.updated_at * 1000).toISOString() : null,
      sourceRecordPath: `https://api.igdb.com/v4/games/${raw.id}`,
    };

    normalizedRecords.push(record);
  }

  // Mandatory Validation Checks
  if (normalizedRecords.length === 0) {
    console.error('❌ VALIDATION FAILURE: 0 records normalized.');
    process.exit(1);
  }

  if (normalizedRecords.length < 400 && mergedRawGames.length >= 400) {
    console.error(`❌ VALIDATION FAILURE: Expected at least 400 records, but got ${normalizedRecords.length}.`);
    process.exit(1);
  }

  // Diagnostics Calculation
  const defaultVisibleRecords = normalizedRecords.filter(r => r.defaultVisible).length;
  const hiddenRecords = normalizedRecords.filter(r => !r.defaultVisible).length;
  const recordsWithPlatformSpecificDates = normalizedRecords.filter(r => r.platformReleaseDates.length > 0).length;

  const diagnostics: IndexDiagnostics = {
    recentIgdbRecordsReceived: recentGames.length,
    upcomingIgdbRecordsReceived: upcomingGames.length,
    recordsBeforeDeduplication: mergedRawGames.length,
    duplicateRecordsRemoved: duplicateCount,
    finalNormalizedRecords: normalizedRecords.length,
    recordsWithExactFirstReleaseDates: exactFirstReleaseDateCount,
    recordsWithPartialFirstReleaseDates: partialFirstReleaseDateCount,
    recordsWithPlatformSpecificDates,
    recordsWithCovers: recordsWithCoversCount,
    recordsWithoutCovers: recordsWithoutCoversCount,
    defaultVisibleRecords,
    hiddenRecords,
    unknownGameTypes: unknownTypeCount,
    invalidRecordsSkipped: invalidCount,
    generatedDatabaseSize: 0,
    generatedManifestSize: 0,
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
    defaultVisibleCount: defaultVisibleRecords,
    fileCount: 1,
    files: ['data/igdb_index.json'],
    dataFile: 'data/igdb_index.json',
  };

  const compiledIndex: CompiledGameIndex = {
    manifest,
    diagnostics,
    records: normalizedRecords,
  };

  // Write Test Output Files to public/data/igdb_index_manifest.json and public/data/igdb_index.json
  const dataDir = path.join(process.cwd(), 'public/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const manifestPath = path.join(dataDir, 'igdb_index_manifest.json');
  const indexPath = path.join(dataDir, 'igdb_index.json');

  const manifestStr = JSON.stringify(manifest, null, 2);
  const indexStr = JSON.stringify(compiledIndex, null, 2);

  diagnostics.generatedManifestSize = Buffer.byteLength(manifestStr, 'utf-8');
  diagnostics.generatedDatabaseSize = Buffer.byteLength(indexStr, 'utf-8');

  // Credential Leak Verification Check
  if (indexStr.includes(accessToken) || manifestStr.includes(accessToken)) {
    console.error('❌ SECURITY FAILURE: Access token detected in output files!');
    process.exit(1);
  }

  fs.writeFileSync(manifestPath, manifestStr, 'utf-8');
  fs.writeFileSync(indexPath, indexStr, 'utf-8');

  console.log('====================================================');
  console.log('📊 LIVE IGDB IMPORTER DIAGNOSTICS REPORT');
  console.log('====================================================');
  console.log(`Recent IGDB records received:       ${recentGames.length}`);
  console.log(`Upcoming IGDB records received:     ${upcomingGames.length}`);
  console.log(`Records before deduplication:       ${mergedRawGames.length}`);
  console.log(`Duplicate records removed:          ${duplicateCount}`);
  console.log(`Final normalized records:           ${normalizedRecords.length}`);
  console.log(`Records with exact release dates:   ${exactFirstReleaseDateCount}`);
  console.log(`Records with partial release dates: ${partialFirstReleaseDateCount}`);
  console.log(`Records with platform dates:        ${recordsWithPlatformSpecificDates}`);
  console.log(`Records with covers:                ${recordsWithCoversCount}`);
  console.log(`Records without covers:             ${recordsWithoutCoversCount}`);
  console.log(`Default-visible records:            ${defaultVisibleRecords}`);
  console.log(`Hidden records:                     ${hiddenRecords}`);
  console.log(`Unknown game types:                 ${unknownTypeCount}`);
  console.log(`Invalid records skipped:            ${invalidCount}`);
  console.log(`Generated manifest size:            ${diagnostics.generatedManifestSize} bytes`);
  console.log(`Generated database size:            ${(diagnostics.generatedDatabaseSize / 1024).toFixed(1)} KB`);
  console.log('====================================================');
  console.log('✅ Live IGDB Importer Completed Successfully!');
}

runIgdbImporter().catch(err => {
  console.error('❌ IGDB Importer Failed:', err);
  process.exit(1);
});
