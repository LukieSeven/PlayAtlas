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

  gameType: string; // Stable key e.g. "main_game"
  gameTypeLabel: string; // Display label e.g. "Main Game"
  rawGameType: string | number | null;
  defaultVisible: boolean;
  category: string;

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

  gameStatus: string | null;
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

  missingGameTypeCount: number;
  unknownGameTypeCount: number;
  gameTypeFrequency: Record<string, number>;
  gameTypeCounts: Record<string, number>;

  exactDateCount: number;
  monthOnlyCount: number;
  yearOnlyCount: number;
  quarterOnlyCount: number;
  tbdCount: number;
  unknownPrecisionCount: number;
  dateFormatFrequency: Record<string, number>;

  recordsWithPlatformSpecificDates: number;
  recordsWithCovers: number;
  recordsWithoutCovers: number;

  defaultVisibleRecords: number;
  hiddenRecords: number;
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

const GAME_TYPE_LABELS: Record<string, string> = {
  main_game: 'Main Game',
  dlc_addon: 'DLC / Add-on',
  expansion: 'Expansion',
  bundle: 'Bundle',
  standalone_expansion: 'Standalone Expansion',
  mod: 'Mod',
  episode: 'Episode',
  season: 'Season',
  remake: 'Remake',
  remaster: 'Remaster',
  expanded_game: 'Expanded Game',
  port: 'Port',
  fork: 'Fork',
  pack: 'Pack',
  update: 'Update',
};

const DEFAULT_VISIBLE_GAME_TYPES = new Set([
  'main_game',
  'standalone_expansion',
  'remake',
  'remaster',
  'expanded_game',
  'port',
]);

function normalizeGameTypeKey(value: string | null | undefined): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_') ?? 'unknown'
  );
}

function parseRawGameTypeKey(gameTypeVal: any): string {
  if (gameTypeVal === null || gameTypeVal === undefined) return 'unknown';
  if (typeof gameTypeVal === 'object' && gameTypeVal.type !== undefined) {
    return normalizeGameTypeKey(String(gameTypeVal.type));
  }
  if (typeof gameTypeVal === 'string') {
    return normalizeGameTypeKey(gameTypeVal);
  }
  if (typeof gameTypeVal === 'number') {
    const numMap: Record<number, string> = {
      0: 'main_game',
      1: 'dlc_addon',
      2: 'expansion',
      3: 'bundle',
      4: 'standalone_expansion',
      5: 'mod',
      6: 'episode',
      7: 'season',
      8: 'remake',
      9: 'remaster',
      10: 'expanded_game',
      11: 'port',
      12: 'fork',
      13: 'pack',
      14: 'update',
    };
    return numMap[gameTypeVal] || 'unknown';
  }
  return 'unknown';
}

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

function parseDateFormatPrecision(fmtVal: any): string {
  if (fmtVal === null || fmtVal === undefined) return 'unknown';
  const str = (typeof fmtVal === 'object' ? fmtVal.format || fmtVal.name || '' : String(fmtVal)).toUpperCase();
  if (str.includes('YYYYMMMMDD') || str.includes('EXACT')) return 'exact day';
  if (str.includes('YYYYMMMM') || str.includes('MONTH')) return 'month';
  if (str.includes('YYYYQ') || str.includes('QUARTER')) return 'quarter';
  if (str.includes('YYYY') || str.includes('YEAR')) return 'year';
  if (str.includes('TBD')) return 'TBD';
  return 'unknown';
}

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

function buildCoverUrl(imageId: string | undefined | null, size: string = 't_cover_big'): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId.trim()}.jpg`;
}

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
    fields name, slug, game_type.id, game_type.type, game_status.status, first_release_date,
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

  // Safe Pre-Normalization Diagnostics
  console.log('--- SAFE PRE-NORMALIZATION DIAGNOSTICS ---');
  const sampleGameTypes = mergedRawGames.slice(0, 5).map(g => ({ id: g.id, name: g.name, game_type: g.game_type }));
  console.log('First 5 returned game_type objects:', JSON.stringify(sampleGameTypes, null, 2));

  let missingGameTypeCount = 0;
  let missingTypeFieldCount = 0;
  const rawGameTypeFrequency: Record<string, number> = {};
  const rawDateFormatFrequency: Record<string, number> = {};

  for (const g of mergedRawGames) {
    if (!g.game_type) {
      missingGameTypeCount++;
    } else if (typeof g.game_type === 'object' && g.game_type.type === undefined) {
      missingTypeFieldCount++;
    }

    const rawTypeKey = typeof g.game_type === 'object' ? String(g.game_type?.type || 'unknown') : String(g.game_type || 'unknown');
    rawGameTypeFrequency[rawTypeKey] = (rawGameTypeFrequency[rawTypeKey] || 0) + 1;

    if (Array.isArray(g.release_dates)) {
      for (const rd of g.release_dates) {
        const fmtStr = typeof rd.date_format === 'object' ? String(rd.date_format?.format || 'unknown') : String(rd.date_format || 'unknown');
        rawDateFormatFrequency[fmtStr] = (rawDateFormatFrequency[fmtStr] || 0) + 1;
      }
    }
  }

  console.log('Raw game_type.type Frequency Table:', JSON.stringify(rawGameTypeFrequency, null, 2));
  console.log(`Count where game_type is absent: ${missingGameTypeCount}`);
  console.log(`Count where game_type exists but type is absent: ${missingTypeFieldCount}`);
  console.log('-------------------------------------------');

  const failedRecordRequests: FailedRecordRequest[] = [];
  const normalizedRecords: GameIndexRecord[] = [];
  const seenIds = new Set<number>();
  let duplicateCount = 0;
  let invalidCount = 0;
  let unknownTypeCount = 0;

  let exactDateCount = 0;
  let monthOnlyCount = 0;
  let yearOnlyCount = 0;
  let quarterOnlyCount = 0;
  let tbdCount = 0;
  let unknownPrecisionCount = 0;

  let recordsWithCoversCount = 0;
  let recordsWithoutCoversCount = 0;

  const gameTypeCounts: Record<string, number> = {};

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
    const gameTypeKey = parseRawGameTypeKey(raw.game_type);
    const gameTypeLabel = GAME_TYPE_LABELS[gameTypeKey] || 'Unknown';
    const defaultVisible = DEFAULT_VISIBLE_GAME_TYPES.has(gameTypeKey);

    if (gameTypeKey === 'unknown') unknownTypeCount++;
    gameTypeCounts[gameTypeLabel] = (gameTypeCounts[gameTypeLabel] || 0) + 1;

    // Release Dates & Precision
    const firstReleaseDate = parseTimestampToIso(raw.first_release_date);
    const platformReleaseDates: PlatformReleaseDate[] = [];

    let overallPrecision = 'unknown';

    if (Array.isArray(raw.release_dates) && raw.release_dates.length > 0) {
      for (const rd of raw.release_dates) {
        const dateStr = parseTimestampToIso(rd.date);
        let pId: number | null = null;
        let pName = 'Unknown Platform';

        if (rd.platform) {
          pId = rd.platform.id || (typeof rd.platform === 'number' ? rd.platform : null);
          pName = rd.platform.name || 'Unknown Platform';
        }

        const precision = parseDateFormatPrecision(rd.date_format);

        // If date matches first_release_date, adopt its precision
        if (dateStr && dateStr === firstReleaseDate && overallPrecision === 'unknown') {
          overallPrecision = precision;
        }

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

    if (firstReleaseDate && overallPrecision === 'unknown') {
      overallPrecision = 'exact day'; // Fallback if timestamp exists
    }

    // Tally Date Precision
    switch (overallPrecision) {
      case 'exact day':
        exactDateCount++;
        break;
      case 'month':
        monthOnlyCount++;
        break;
      case 'quarter':
        quarterOnlyCount++;
        break;
      case 'year':
        yearOnlyCount++;
        break;
      case 'TBD':
        tbdCount++;
        break;
      default:
        unknownPrecisionCount++;
        break;
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
      gameType: gameTypeKey,
      gameTypeLabel,
      rawGameType: typeof raw.game_type === 'object' ? JSON.stringify(raw.game_type) : raw.game_type ?? null,
      defaultVisible,
      category: gameTypeLabel,
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

  // Mandatory Validation Checks (Item 4)
  const defaultVisibleRecords = normalizedRecords.filter(r => r.defaultVisible).length;
  const hiddenRecords = normalizedRecords.filter(r => !r.defaultVisible).length;

  if (normalizedRecords.length === 0) {
    console.error('❌ VALIDATION FAILURE: 0 records normalized.');
    process.exit(1);
  }

  if (unknownTypeCount / normalizedRecords.length > 0.10) {
    console.error(`❌ VALIDATION FAILURE: More than 10% of records have unknown game type (${unknownTypeCount} / ${normalizedRecords.length}).`);
    process.exit(1);
  }

  if (defaultVisibleRecords === 0) {
    console.error('❌ VALIDATION FAILURE: Zero records are marked as default-visible.');
    process.exit(1);
  }

  const invalidMainGame = normalizedRecords.find(r => r.gameType === 'main_game' && !r.defaultVisible);
  if (invalidMainGame) {
    console.error(`❌ VALIDATION FAILURE: Main Game ${invalidMainGame.id} marked as defaultVisible: false.`);
    process.exit(1);
  }

  const invalidDlc = normalizedRecords.find(r => r.gameType === 'dlc_addon' && r.defaultVisible);
  if (invalidDlc) {
    console.error(`❌ VALIDATION FAILURE: DLC / Add-on ${invalidDlc.id} marked as defaultVisible: true.`);
    process.exit(1);
  }

  const recordsWithPlatformSpecificDates = normalizedRecords.filter(r => r.platformReleaseDates.length > 0).length;

  const diagnostics: IndexDiagnostics = {
    recentIgdbRecordsReceived: recentGames.length,
    upcomingIgdbRecordsReceived: upcomingGames.length,
    recordsBeforeDeduplication: mergedRawGames.length,
    duplicateRecordsRemoved: duplicateCount,
    finalNormalizedRecords: normalizedRecords.length,

    missingGameTypeCount,
    unknownGameTypeCount: unknownTypeCount,
    gameTypeFrequency: rawGameTypeFrequency,
    gameTypeCounts,

    exactDateCount,
    monthOnlyCount,
    yearOnlyCount,
    quarterOnlyCount,
    tbdCount,
    unknownPrecisionCount,
    dateFormatFrequency: rawDateFormatFrequency,

    recordsWithPlatformSpecificDates,
    recordsWithCovers: recordsWithCoversCount,
    recordsWithoutCovers: recordsWithoutCoversCount,

    defaultVisibleRecords,
    hiddenRecords,
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
  console.log('----------------------------------------------------');
  console.log('Game Type Counts:', JSON.stringify(gameTypeCounts, null, 2));
  console.log(`Default-visible records:            ${defaultVisibleRecords}`);
  console.log(`Hidden records:                     ${hiddenRecords}`);
  console.log(`Unknown game types:                 ${unknownTypeCount}`);
  console.log('----------------------------------------------------');
  console.log(`Exact-date count:                   ${exactDateCount}`);
  console.log(`Month-only count:                   ${monthOnlyCount}`);
  console.log(`Year-only count:                    ${yearOnlyCount}`);
  console.log(`Quarter-only count:                 ${quarterOnlyCount}`);
  console.log(`TBD count:                          ${tbdCount}`);
  console.log(`Unknown-precision count:            ${unknownPrecisionCount}`);
  console.log('Raw Date-Format Frequency:', JSON.stringify(rawDateFormatFrequency, null, 2));
  console.log('----------------------------------------------------');
  console.log(`Records with platform dates:        ${recordsWithPlatformSpecificDates}`);
  console.log(`Records with covers:                ${recordsWithCoversCount}`);
  console.log(`Records without covers:             ${recordsWithoutCoversCount}`);
  console.log(`Generated manifest size:            ${diagnostics.generatedManifestSize} bytes`);
  console.log(`Generated database size:            ${(diagnostics.generatedDatabaseSize / 1024).toFixed(1)} KB`);
  console.log('====================================================');
  console.log('✅ Live IGDB Importer & Validation Completed Successfully!');
}

runIgdbImporter().catch(err => {
  console.error('❌ IGDB Importer Failed:', err);
  process.exit(1);
});
