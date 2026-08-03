import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatePrecision,
  parseGameTypeInfo,
  normalizeDatePrecision,
} from '../src/utils/igdbNormalization';
import { reconcileCatalogCounts } from '../src/utils/reconciliation';

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
const IMPORT_MODE = (process.env.IGDB_IMPORT_MODE || 'test').toLowerCase();
const OUTPUT_DIR_ENV = process.env.IGDB_OUTPUT_DIR || (IMPORT_MODE === 'full' ? 'generated/igdb-full-test' : 'public/data');
const CHUNK_RECORD_LIMIT = 2500;

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string;
  date: string | null;
  region: string | null;
  status: string | null;
  datePrecision: DatePrecision;
}

export interface GameIndexRecord {
  id: string; // e.g. "igdb:12345"
  source: 'igdb';
  sourceId: number;

  name: string;
  title: string;
  slug: string | null;

  gameType: string;
  gameTypeLabel: string;
  rawGameType: string | number | null;
  defaultVisible: boolean;
  category: string;

  firstReleaseDate: string | null;
  firstReleaseTimestamp: number | null;
  datePrecision: DatePrecision;

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

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const PRECISION_RANK: Record<DatePrecision, number> = {
  day: 1,
  month: 2,
  quarter: 3,
  year: 4,
  tbd: 5,
  unknown: 6,
};

let currentAccessToken: string | null = null;

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

  currentAccessToken = data.access_token;
  return data.access_token;
}

let totalApiRequestCount = 0;
let totalRetryCount = 0;
let http429Count = 0;
let http5xxCount = 0;
let lastRequestTime = 0;

async function queryIgdbWithRetry(
  endpoint: string,
  apqBody: string,
  clientId: string,
  token: string
): Promise<any> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const nowMs = Date.now();
    const timeSinceLast = nowMs - lastRequestTime;
    if (timeSinceLast < 350) {
      await new Promise(r => setTimeout(r, 350 - timeSinceLast));
    }
    lastRequestTime = Date.now();

    totalApiRequestCount++;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: apqBody,
      });

      if (res.ok) {
        return await res.json();
      }

      if (res.status === 401 && attempt === 1) {
        console.warn('⚠️ HTTP 401 received. Attempting automatic token refresh...');
        const newToken = await getTwitchAccessToken(clientId, IGDB_CLIENT_SECRET!);
        token = newToken;
        continue;
      }

      if (res.status === 429) http429Count++;
      if (res.status >= 500) http5xxCount++;

      const isTransient = res.status === 429 || (res.status >= 500 && res.status <= 504);
      if (!isTransient || attempt === maxAttempts) {
        const errBody = await res.text();
        throw new Error(`IGDB API Error (HTTP ${res.status}): ${errBody}`);
      }

      totalRetryCount++;
      const retryAfterHeader = res.headers.get('Retry-After');
      let backoffMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.pow(2, attempt) * 1000 + Math.random() * 500;
      if (isNaN(backoffMs) || backoffMs <= 0) backoffMs = 2000;

      console.warn(`⚠️ Transient HTTP ${res.status} error. Retrying attempt ${attempt}/${maxAttempts} in ${Math.round(backoffMs)}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    } catch (err: any) {
      if (attempt === maxAttempts) throw err;
      totalRetryCount++;
      const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`⚠️ Network error: ${err.message}. Retrying attempt ${attempt}/${maxAttempts} in ${Math.round(backoffMs)}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}

async function getSnapshotMaxId(clientId: string, token: string): Promise<number> {
  const data = await queryIgdbWithRetry(
    'https://api.igdb.com/v4/games',
    'fields id; sort id desc; limit 1;',
    clientId,
    token
  );
  if (!Array.isArray(data) || data.length === 0 || typeof data[0].id !== 'number') {
    throw new Error('Failed to retrieve snapshotMaxId from IGDB API.');
  }
  return data[0].id;
}

async function getSnapshotRecordCount(maxId: number, clientId: string, token: string): Promise<number> {
  const data = await queryIgdbWithRetry(
    'https://api.igdb.com/v4/games/count',
    `where id > 0 & id <= ${maxId};`,
    clientId,
    token
  );
  if (data && typeof data.count === 'number') {
    return data.count;
  }
  throw new Error(`Failed to retrieve snapshot record count for maxId ${maxId}.`);
}

function normalizeRawIgdbRecord(raw: any): GameIndexRecord | null {
  if (!raw.id || !raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
    return null;
  }

  const recordId = `igdb:${raw.id}`;
  const imageId = raw.cover?.image_id || null;
  const coverUrl = buildCoverUrl(imageId, 't_cover_big');

  const typeInfo = parseGameTypeInfo(raw.game_type);
  const gameTypeKey = typeInfo.key;
  const gameTypeLabel = typeInfo.label;
  const defaultVisible = typeInfo.defaultVisible;

  const firstReleaseDate = parseTimestampToIso(raw.first_release_date);
  const platformReleaseDates: PlatformReleaseDate[] = [];
  let bestFirstPrecision: DatePrecision = 'unknown';

  if (Array.isArray(raw.release_dates) && raw.release_dates.length > 0) {
    for (const rd of raw.release_dates) {
      const dateStr = parseTimestampToIso(rd.date);
      let pId: number | null = null;
      let pName = 'Unknown Platform';

      if (rd.platform) {
        pId = rd.platform.id || (typeof rd.platform === 'number' ? rd.platform : null);
        pName = rd.platform.name || 'Unknown Platform';
      }

      const precision = normalizeDatePrecision(
        typeof rd.date_format === 'object' ? rd.date_format?.format : rd.date_format
      );

      if (dateStr && firstReleaseDate && dateStr === firstReleaseDate) {
        if (PRECISION_RANK[precision] < PRECISION_RANK[bestFirstPrecision]) {
          bestFirstPrecision = precision;
        }
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

  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms.map((p: any) => ({
        id: p.id || 0,
        name: p.name || 'Unknown Platform',
        abbreviation: p.abbreviation || null,
      }))
    : [];

  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((g: any) => ({
        id: g.id || 0,
        name: g.name || 'General',
      }))
    : [];

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

  return {
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
    datePrecision: bestFirstPrecision,
    platformReleaseDates,
    platforms,
    genres,
    coverUrl,
    coverImageId: imageId,
    summary: raw.summary || null,
    externalIds,
    igdbUpdatedAt: raw.updated_at ? new Date(raw.updated_at * 1000).toISOString() : null,
    sourceRecordPath: `https://api.igdb.com/v4/games/${raw.id}`,
  };
}

async function runIgdbImporter() {
  console.log(`🚀 Starting IGDB Importer Pipeline (Mode: ${IMPORT_MODE.toUpperCase()})...`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    console.error('❌ ERROR: Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET environment variables.');
    process.exit(1);
  }

  console.log('🔐 Requesting Twitch Application Access Token...');
  const accessToken = await getTwitchAccessToken(IGDB_CLIENT_ID, IGDB_CLIENT_SECRET);
  console.log('✅ Twitch Authentication Successful! (Token acquired & masked).');

  const startTime = Date.now();
  const now = new Date();
  const diagnosticDate = now.toISOString().split('T')[0];
  const diagnosticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const fieldsSelection = `
    fields id, name, slug, game_type.id, game_type.type, game_status.status, first_release_date,
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
           external_games.external_game_source.name,
           external_games.uid,
           updated_at;
  `;

  if (IMPORT_MODE === 'full') {
    // ==========================================
    // FULL CATALOG CURSOR PAGINATION PIPELINE
    // ==========================================
    console.log('📦 Initializing Full Catalog Snapshot Boundary...');
    const snapshotMaxId = await getSnapshotMaxId(IGDB_CLIENT_ID, accessToken);
    const snapshotCountAtStart = await getSnapshotRecordCount(snapshotMaxId, IGDB_CLIENT_ID, accessToken);

    console.log(`📌 Snapshot Max ID:                 ${snapshotMaxId}`);
    console.log(`📌 Snapshot Count At Start:          ${snapshotCountAtStart}`);

    const workingDir = path.join(process.cwd(), 'generated/igdb-full-working');
    const finalDir = path.join(process.cwd(), OUTPUT_DIR_ENV);

    if (fs.existsSync(workingDir)) fs.rmSync(workingDir, { recursive: true, force: true });
    fs.mkdirSync(workingDir, { recursive: true });

    let lastImportedId = 0;
    let totalRawRecords = 0;
    let totalNormalizedRecords = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let successfulBatches = 0;
    let finalBatchSize = 0;

    const globalSeenIds = new Set<number>();
    let currentChunkBuffer: GameIndexRecord[] = [];
    const chunkManifestList: Array<{
      file: string;
      recordCount: number;
      firstSourceId: number;
      lastSourceId: number;
      byteSize: number;
      sha256: string;
    }> = [];

    const gameTypeCounts: Record<string, number> = {};
    const gameTypeFrequency: Record<string, number> = {};

    const releaseEntryPrecisionCounts = { exactDay: 0, monthOnly: 0, quarterOnly: 0, yearOnly: 0, tbd: 0, unknown: 0 };
    let totalReleaseDateEntries = 0;
    const firstReleasePrecisionCounts = { exactDay: 0, monthOnly: 0, quarterOnly: 0, yearOnly: 0, tbd: 0, unknown: 0 };

    let recordsWithFirstReleaseDate = 0;
    let recordsWithoutFirstReleaseDate = 0;
    let recordsWithPlatformReleaseDates = 0;
    let recordsWithCoversCount = 0;
    let recordsWithoutCoversCount = 0;
    let recordsWithSummaryCount = 0;
    let recordsWithoutSummaryCount = 0;

    let chunkIndex = 1;
    let totalUncompressedBytes = 0;
    let nextLogMilestone = 10000;

    function flushCurrentChunkBuffer() {
      if (currentChunkBuffer.length === 0) return;

      currentChunkBuffer.sort((a, b) => a.sourceId - b.sourceId);

      const chunkFilename = `game_index_${String(chunkIndex).padStart(4, '0')}.json`;
      const chunkFilePath = path.join(workingDir, chunkFilename);
      const chunkJsonStr = JSON.stringify(currentChunkBuffer, null, 2);
      const chunkBuffer = Buffer.from(chunkJsonStr, 'utf-8');

      fs.writeFileSync(chunkFilePath, chunkBuffer);

      const firstSourceId = currentChunkBuffer[0].sourceId;
      const lastSourceId = currentChunkBuffer[currentChunkBuffer.length - 1].sourceId;
      const sha256 = computeSha256(chunkBuffer);
      const byteSize = chunkBuffer.length;

      chunkManifestList.push({
        file: `data/${chunkFilename}`,
        recordCount: currentChunkBuffer.length,
        firstSourceId,
        lastSourceId,
        byteSize,
        sha256,
      });

      totalUncompressedBytes += byteSize;
      chunkIndex++;
      currentChunkBuffer = [];
    }

    console.log('🔄 Starting Cursor Pagination Loop...');

    while (true) {
      const pageQuery = `
        ${fieldsSelection}
        where id > ${lastImportedId} & id <= ${snapshotMaxId};
        sort id asc;
        limit 500;
      `;

      const pageGames: any[] = await queryIgdbWithRetry('https://api.igdb.com/v4/games', pageQuery, IGDB_CLIENT_ID, accessToken);
      successfulBatches++;
      finalBatchSize = Array.isArray(pageGames) ? pageGames.length : 0;

      if (!Array.isArray(pageGames) || pageGames.length === 0) {
        break; // Pagination completed
      }

      totalRawRecords += pageGames.length;
      let highestIdInBatch = lastImportedId;

      for (const raw of pageGames) {
        if (typeof raw.id !== 'number' || raw.id <= lastImportedId) {
          console.error(`❌ CURSOR FAILURE: ID ${raw.id} is <= previous cursor ${lastImportedId}`);
          process.exit(1);
        }
        if (raw.id > snapshotMaxId) {
          console.error(`❌ SNAPSHOT FAILURE: ID ${raw.id} exceeds snapshotMaxId ${snapshotMaxId}`);
          process.exit(1);
        }

        if (globalSeenIds.has(raw.id)) {
          duplicateCount++;
          continue;
        }

        const normalized = normalizeRawIgdbRecord(raw);
        if (!normalized) {
          invalidCount++;
          continue;
        }

        globalSeenIds.add(raw.id);
        highestIdInBatch = Math.max(highestIdInBatch, raw.id);
        totalNormalizedRecords++;

        // Track gameType & precision tallies
        gameTypeCounts[normalized.gameTypeLabel] = (gameTypeCounts[normalized.gameTypeLabel] || 0) + 1;
        gameTypeFrequency[normalized.gameType] = (gameTypeFrequency[normalized.gameType] || 0) + 1;

        if (normalized.firstReleaseDate) {
          recordsWithFirstReleaseDate++;
        } else {
          recordsWithoutFirstReleaseDate++;
        }

        if (normalized.platformReleaseDates.length > 0) {
          recordsWithPlatformReleaseDates++;
          totalReleaseDateEntries += normalized.platformReleaseDates.length;
          for (const prd of normalized.platformReleaseDates) {
            switch (prd.datePrecision) {
              case 'day': releaseEntryPrecisionCounts.exactDay++; break;
              case 'month': releaseEntryPrecisionCounts.monthOnly++; break;
              case 'quarter': releaseEntryPrecisionCounts.quarterOnly++; break;
              case 'year': releaseEntryPrecisionCounts.yearOnly++; break;
              case 'tbd': releaseEntryPrecisionCounts.tbd++; break;
              default: releaseEntryPrecisionCounts.unknown++; break;
            }
          }
        }

        switch (normalized.datePrecision) {
          case 'day': firstReleasePrecisionCounts.exactDay++; break;
          case 'month': firstReleasePrecisionCounts.monthOnly++; break;
          case 'quarter': firstReleasePrecisionCounts.quarterOnly++; break;
          case 'year': firstReleasePrecisionCounts.yearOnly++; break;
          case 'tbd': firstReleasePrecisionCounts.tbd++; break;
          default: firstReleasePrecisionCounts.unknown++; break;
        }

        if (normalized.coverUrl) recordsWithCoversCount++;
        else recordsWithoutCoversCount++;

        if (normalized.summary) recordsWithSummaryCount++;
        else recordsWithoutSummaryCount++;

        currentChunkBuffer.push(normalized);
        if (currentChunkBuffer.length >= CHUNK_RECORD_LIMIT) {
          flushCurrentChunkBuffer();
        }
      }

      if (highestIdInBatch <= lastImportedId) {
        console.error(`❌ CURSOR STALL FAILURE: Cursor failed to advance beyond ${lastImportedId}`);
        process.exit(1);
      }
      lastImportedId = highestIdInBatch;

      if (totalNormalizedRecords >= nextLogMilestone) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`📊 Progress: ${totalNormalizedRecords.toLocaleString()} / ${snapshotCountAtStart.toLocaleString()} records | Cursor: ${lastImportedId.toLocaleString()} | Chunks: ${chunkManifestList.length} | Batches: ${successfulBatches} | Retries: ${totalRetryCount} | Time: ${elapsedSec}s`);
        nextLogMilestone += 10000;
      }

      if (pageGames.length < 500) {
        break; // Last page reached
      }
    }

    // Flush remaining buffer
    flushCurrentChunkBuffer();

    // Query snapshotCountAtEnd with retry (Requirement 1)
    console.log('📌 Querying Ending Snapshot Count from IGDB /games/count...');
    let snapshotCountAtEnd = 0;
    for (let endAttempt = 1; endAttempt <= 3; endAttempt++) {
      try {
        snapshotCountAtEnd = await getSnapshotRecordCount(snapshotMaxId, IGDB_CLIENT_ID, accessToken);
        if (snapshotCountAtEnd === totalNormalizedRecords) break;
        if (endAttempt < 3) await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        if (endAttempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Perform Reconciliation Check (Requirement 2 & 3)
    const recon = reconcileCatalogCounts(snapshotCountAtStart, snapshotCountAtEnd, totalNormalizedRecords);

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const avgRecordsPerSec = (totalNormalizedRecords / Math.max(1, elapsedSeconds)).toFixed(1);

    const defaultVisibleCount = Object.entries(gameTypeFrequency).reduce((acc, [k, count]) => {
      const isVisible = ['main_game', 'standalone_expansion', 'remake', 'remaster', 'expanded_game', 'port'].includes(k);
      return acc + (isVisible ? count : 0);
    }, 0);
    const hiddenCount = totalNormalizedRecords - defaultVisibleCount;
    const unknownTypeCount = gameTypeFrequency['unknown'] || 0;
    const unknownTypePct = ((unknownTypeCount / Math.max(1, totalNormalizedRecords)) * 100).toFixed(2);

    // Write Full Catalog Manifest
    const fullManifest = {
      source: 'igdb',
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      importMode: 'full',

      snapshotMaxId,
      expectedSnapshotRecordCount: snapshotCountAtStart,
      snapshotCountAtStart,
      snapshotCountAtEnd,
      actualImportedRecordCount: totalNormalizedRecords,
      countDifferenceFromStart: recon.countDifferenceFromStart,
      countDifferenceFromEnd: recon.countDifferenceFromEnd,
      countTolerance: recon.allowedDifference,
      countReconciliationStatus: recon.status,

      recordCount: totalNormalizedRecords,
      defaultVisibleCount,
      hiddenCount,
      unknownGameTypeCount: unknownTypeCount,

      recordsWithFirstReleaseDate,
      recordsWithoutFirstReleaseDate,
      recordsWithPlatformReleaseDates,

      chunkRecordLimit: CHUNK_RECORD_LIMIT,
      chunkCount: chunkManifestList.length,
      totalUncompressedBytes,

      chunks: chunkManifestList,
    };

    const manifestJsonStr = JSON.stringify(fullManifest, null, 2);
    const manifestPath = path.join(workingDir, 'game_index_manifest.json');

    // Access token leak verification check
    if (manifestJsonStr.includes(accessToken) || (currentAccessToken && manifestJsonStr.includes(currentAccessToken))) {
      console.error('❌ SECURITY FAILURE: Access token detected in output files!');
      process.exit(1);
    }

    fs.writeFileSync(manifestPath, manifestJsonStr, 'utf-8');

    // Mandatory Full-Import Validations
    if (totalNormalizedRecords === 0) {
      console.error('❌ VALIDATION FAILURE: 0 records imported.');
      process.exit(1);
    }

    if (duplicateCount > 0) {
      console.error(`❌ VALIDATION FAILURE: ${duplicateCount} duplicate IDs detected.`);
      process.exit(1);
    }

    if (lastImportedId < snapshotMaxId && finalBatchSize === 500) {
      console.error(`❌ BOUNDARY FAILURE: Importer stopped at ${lastImportedId} before snapshotMaxId ${snapshotMaxId}.`);
      process.exit(1);
    }

    if (recon.status === 'failed') {
      console.error(`❌ RECONCILIATION FAILURE: Start diff (${recon.countDifferenceFromStart}) & End diff (${recon.countDifferenceFromEnd}) exceed tolerance (±${recon.allowedDifference}).`);
      process.exit(1);
    }

    // Atomic Directory Switch: Rename workingDir -> finalDir
    if (fs.existsSync(finalDir)) fs.rmSync(finalDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(finalDir), { recursive: true });
    fs.renameSync(workingDir, finalDir);

    const chunkSizes = chunkManifestList.map(c => c.byteSize);
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);
    const avgChunkSize = Math.round(totalUncompressedBytes / Math.max(1, chunkManifestList.length));

    console.log('====================================================');
    console.log('📊 IGDB FULL CATALOG IMPORT DIAGNOSTICS REPORT');
    console.log('====================================================');
    console.log(`📌 Snapshot Count at Start:       ${snapshotCountAtStart}`);
    console.log(`📌 Snapshot Count at End:         ${snapshotCountAtEnd}`);
    console.log(`🎮 Actual Unique Records Imported: ${totalNormalizedRecords}`);
    console.log(`📊 Difference from Start:         ${recon.countDifferenceFromStart > 0 ? '+' : ''}${recon.countDifferenceFromStart}`);
    console.log(`📊 Difference from End:           ${recon.countDifferenceFromEnd > 0 ? '+' : ''}${recon.countDifferenceFromEnd}`);
    console.log(`📏 Allowed Discrepancy:           ±${recon.allowedDifference}`);
    console.log(`⚖️ Count Reconciliation Status:    ${recon.status.toUpperCase()}`);
    console.log(`📌 Last Imported ID:              ${lastImportedId}`);
    console.log(`📌 Snapshot Maximum ID:           ${snapshotMaxId}`);
    console.log(`📦 Final Batch Size:              ${finalBatchSize}`);
    console.log(`🔁 Duplicate ID Count:            ${duplicateCount}`);
    console.log(`⏱️ Total Runtime:                 ${elapsedSeconds.toFixed(1)}s (${avgRecordsPerSec} rec/sec)`);
    console.log(`🔄 Total API Requests:            ${totalApiRequestCount} (${successfulBatches} batches)`);
    console.log(`🔁 Total Retries:                 ${totalRetryCount} (429s: ${http429Count}, 5xxs: ${http5xxCount})`);
    if (recon.warningMessage) {
      console.log('----------------------------------------------------');
      console.log(recon.warningMessage);
    }
    console.log('----------------------------------------------------');
    console.log('Game Type Counts:', JSON.stringify(gameTypeCounts, null, 2));
    console.log(`👁️ Default-Visible Records:        ${defaultVisibleCount}`);
    console.log(`📦 Hidden Records:                 ${hiddenCount}`);
    console.log(`❓ Unknown Game Types:             ${unknownTypeCount} (${unknownTypePct}%)`);
    console.log('----------------------------------------------------');
    console.log('Release-Entry Precision Counts:', JSON.stringify(releaseEntryPrecisionCounts, null, 2));
    console.log('Game First-Release Precision Counts:', JSON.stringify(firstReleasePrecisionCounts, null, 2));
    console.log('----------------------------------------------------');
    console.log(`📦 Chunk Count:                   ${chunkManifestList.length}`);
    console.log(`📊 Records per Chunk:             ${CHUNK_RECORD_LIMIT}`);
    console.log(`📏 Chunk Sizes (Min / Max / Avg): ${(minChunkSize/1024).toFixed(1)} KB / ${(maxChunkSize/1024).toFixed(1)} KB / ${(avgChunkSize/1024).toFixed(1)} KB`);
    console.log(`💾 Total Uncompressed Size:       ${(totalUncompressedBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📁 Manifest Size:                 ${fs.statSync(path.join(finalDir, 'game_index_manifest.json')).size} bytes`);
    console.log('====================================================');
    console.log('✅ IGDB Full Catalog Import Completed Successfully!');

  } else {
    // 500-RECORD TEST MODE PIPELINE (PROVEN)
    const currentTimestamp = Math.floor(now.getTime() / 1000);
    const twoYearsAgoTimestamp = Math.floor((now.getTime() - 2 * 365.25 * 86400 * 1000) / 1000);

    console.log(`📥 Query 1: Fetching up to ${BATCH_LIMIT} recently released IGDB games...`);
    const query1Body = `
      ${fieldsSelection}
      where first_release_date != null
        & first_release_date <= ${currentTimestamp}
        & first_release_date >= ${twoYearsAgoTimestamp};
      sort first_release_date desc;
      limit ${BATCH_LIMIT};
    `;
    const recentGames = await queryIgdbWithRetry('https://api.igdb.com/v4/games', query1Body, IGDB_CLIENT_ID, accessToken);

    console.log(`📥 Query 2: Fetching up to ${BATCH_LIMIT} upcoming IGDB games...`);
    const query2Body = `
      ${fieldsSelection}
      where first_release_date != null
        & first_release_date > ${currentTimestamp};
      sort first_release_date asc;
      limit ${BATCH_LIMIT};
    `;
    const upcomingGames = await queryIgdbWithRetry('https://api.igdb.com/v4/games', query2Body, IGDB_CLIENT_ID, accessToken);

    const mergedRawGames = [...recentGames, ...upcomingGames];
    console.log(`🔄 Total raw games before deduplication: ${mergedRawGames.length}`);

    const failedRecordRequests: FailedRecordRequest[] = [];
    const normalizedRecords: GameIndexRecord[] = [];
    const seenIds = new Set<number>();
    let duplicateCount = 0;
    let invalidCount = 0;

    const releaseEntryPrecisionCounts = { exactDay: 0, monthOnly: 0, quarterOnly: 0, yearOnly: 0, tbd: 0, unknown: 0 };
    let totalReleaseDateEntries = 0;
    const firstReleasePrecisionCounts = { exactDay: 0, monthOnly: 0, quarterOnly: 0, yearOnly: 0, tbd: 0, unknown: 0 };

    let recordsWithCoversCount = 0;
    let recordsWithoutCoversCount = 0;
    const gameTypeCounts: Record<string, number> = {};
    const gameTypeFrequency: Record<string, number> = {};

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

      const normalized = normalizeRawIgdbRecord(raw);
      if (!normalized) {
        invalidCount++;
        continue;
      }

      gameTypeCounts[normalized.gameTypeLabel] = (gameTypeCounts[normalized.gameTypeLabel] || 0) + 1;
      gameTypeFrequency[normalized.gameType] = (gameTypeFrequency[normalized.gameType] || 0) + 1;

      if (normalized.coverUrl) recordsWithCoversCount++;
      else recordsWithoutCoversCount++;

      if (normalized.platformReleaseDates.length > 0) {
        totalReleaseDateEntries += normalized.platformReleaseDates.length;
        for (const prd of normalized.platformReleaseDates) {
          switch (prd.datePrecision) {
            case 'day': releaseEntryPrecisionCounts.exactDay++; break;
            case 'month': releaseEntryPrecisionCounts.monthOnly++; break;
            case 'quarter': releaseEntryPrecisionCounts.quarterOnly++; break;
            case 'year': releaseEntryPrecisionCounts.yearOnly++; break;
            case 'tbd': releaseEntryPrecisionCounts.tbd++; break;
            default: releaseEntryPrecisionCounts.unknown++; break;
          }
        }
      }

      switch (normalized.datePrecision) {
        case 'day': firstReleasePrecisionCounts.exactDay++; break;
        case 'month': firstReleasePrecisionCounts.monthOnly++; break;
        case 'quarter': firstReleasePrecisionCounts.quarterOnly++; break;
        case 'year': firstReleasePrecisionCounts.yearOnly++; break;
        case 'tbd': firstReleasePrecisionCounts.tbd++; break;
        default: firstReleasePrecisionCounts.unknown++; break;
      }

      normalizedRecords.push(normalized);
    }

    const unknownTypeCount = normalizedRecords.filter(r => r.gameType === 'unknown').length;
    const defaultVisibleRecords = normalizedRecords.filter(r => r.defaultVisible).length;
    const hiddenRecords = normalizedRecords.filter(r => !r.defaultVisible).length;
    const recordsWithPlatformSpecificDates = normalizedRecords.filter(r => r.platformReleaseDates.length > 0).length;

    if (normalizedRecords.length === 0 || unknownTypeCount !== 0) {
      console.error(`❌ VALIDATION FAILURE: 0 records or unknownTypeCount is ${unknownTypeCount}`);
      process.exit(1);
    }

    const manifest = {
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

    const compiledIndex = {
      manifest,
      diagnostics: {
        recentIgdbRecordsReceived: recentGames.length,
        upcomingIgdbRecordsReceived: upcomingGames.length,
        recordsBeforeDeduplication: mergedRawGames.length,
        duplicateRecordsRemoved: duplicateCount,
        finalNormalizedRecords: normalizedRecords.length,
        missingGameTypeCount: 0,
        unknownGameTypeCount: unknownTypeCount,
        gameTypeFrequency,
        gameTypeCounts,
        releaseEntryPrecisionCounts,
        totalReleaseDateEntries,
        firstReleasePrecisionCounts,
        dateFormatFrequency: {},
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
      },
      records: normalizedRecords,
    };

    const outDir = path.join(process.cwd(), OUTPUT_DIR_ENV);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const manifestPath = path.join(outDir, 'igdb_index_manifest.json');
    const indexPath = path.join(outDir, 'igdb_index.json');

    const manifestStr = JSON.stringify(manifest, null, 2);
    const indexStr = JSON.stringify(compiledIndex, null, 2);

    if (indexStr.includes(accessToken) || (currentAccessToken && indexStr.includes(currentAccessToken))) {
      console.error('❌ SECURITY FAILURE: Access token detected in output files!');
      process.exit(1);
    }

    fs.writeFileSync(manifestPath, manifestStr, 'utf-8');
    fs.writeFileSync(indexPath, indexStr, 'utf-8');

    console.log('====================================================');
    console.log('📊 IGDB TEST IMPORTER DIAGNOSTICS REPORT');
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
    console.log('Release-Entry Precision Counts:', JSON.stringify(releaseEntryPrecisionCounts, null, 2));
    console.log('Game First-Release Precision Counts:', JSON.stringify(firstReleasePrecisionCounts, null, 2));
    console.log('----------------------------------------------------');
    console.log(`Generated manifest size:            ${Buffer.byteLength(manifestStr, 'utf-8')} bytes`);
    console.log(`Generated database size:            ${(Buffer.byteLength(indexStr, 'utf-8') / 1024).toFixed(1)} KB`);
    console.log('====================================================');
    console.log('✅ IGDB Test Importer & Validation Completed Successfully!');
  }
}

runIgdbImporter().catch(err => {
  console.error('❌ IGDB Importer Failed:', err);
  process.exit(1);
});
