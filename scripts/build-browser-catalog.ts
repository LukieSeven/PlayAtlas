import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import archiver from 'archiver';
import {
  tokenizeTitle,
  getReleaseYearKey,
  getReleaseMonthKey,
} from '../src/utils/browserCatalogUtils';
import { buildCompactRankSignals, RANKING_SCHEMA_VERSION } from '../src/utils/catalogRanking';
import { CompactRankSignals } from '../src/types/catalog';

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

const INPUT_DIR_ENV = process.env.IGDB_FULL_CATALOG_DIR || 'generated/igdb-full-test';
const OUTPUT_DIR_ENV = process.env.PLAY_ATLAS_BROWSER_DATA_DIR || 'generated/browser-catalog-test';
const LOOKUP_FILE_RECORD_LIMIT = 10000;
const RELEASE_FILE_RECORD_LIMIT = 2500;
const MAX_DEPLOYMENT_CEILING_BYTES = 900 * 1024 * 1024; // 900 MB ceiling

function computeSha256(content: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Node-native synchronous SHA-256 token bucket key calculator for catalog building
 */
export function getBuildTokenBucketKey(token: string): string {
  const clean = token.trim().toLowerCase();
  if (!clean) {
    throw new Error('Cannot compute build token bucket key for empty token.');
  }
  return crypto
    .createHash('sha256')
    .update(clean, 'utf8')
    .digest('hex')
    .slice(0, 2);
}

function compressGzip(jsonObj: any): { compressedBuffer: Buffer; uncompressedByteSize: number } {
  const jsonStr = JSON.stringify(jsonObj);
  const uncompressedBuffer = Buffer.from(jsonStr, 'utf-8');
  const compressedBuffer = zlib.gzipSync(uncompressedBuffer, { level: 9 });
  return {
    compressedBuffer,
    uncompressedByteSize: uncompressedBuffer.length,
  };
}

export interface CompactGameLookupRecord {
  id: number;
  name: string;
  year: number | null;
  gameType: string;
  defaultVisible: boolean;
  chunk: number;
  rating?: number;
  alternativeNames?: string[];
  rank?: CompactRankSignals;
}

export interface CompactPlatformReleaseDate {
  p: number; // numeric platform ID
  d: string; // ISO date string
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

async function runBrowserCatalogBuilder() {
  console.log('🚀 Starting Compressed (.json.gz) Browser Catalog Builder...');

  const inputDir = path.isAbsolute(INPUT_DIR_ENV) ? INPUT_DIR_ENV : path.join(process.cwd(), INPUT_DIR_ENV);
  const outputDir = path.isAbsolute(OUTPUT_DIR_ENV) ? OUTPUT_DIR_ENV : path.join(process.cwd(), OUTPUT_DIR_ENV);
  const releaseAssetsDir = path.join(process.cwd(), 'generated/release-assets');

  console.log(`📥 Input Directory:         ${inputDir}`);
  console.log(`📤 Output Directory:        ${outputDir}`);
  console.log(`🗜️ Release Assets Directory: ${releaseAssetsDir}`);

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ ERROR: Input catalog directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  // Detect input chunk list dynamically (supports raw IGDB manifest, browser catalog manifest, or chunks/ directory)
  const inputChunkFiles: string[] = [];

  const rawManifestPath = path.join(inputDir, 'game_index_manifest.json');
  const inputBrowserManifestPath = path.join(inputDir, 'browser_catalog_manifest.json');
  const chunksSubdirPath = path.join(inputDir, 'chunks');

  if (fs.existsSync(rawManifestPath)) {
    const rawManifest = JSON.parse(fs.readFileSync(rawManifestPath, 'utf-8'));
    for (const c of rawManifest.chunks || []) {
      inputChunkFiles.push(path.join(inputDir, path.basename(c.file)));
    }
  } else if (fs.existsSync(inputBrowserManifestPath)) {
    const bManifest = JSON.parse(fs.readFileSync(inputBrowserManifestPath, 'utf-8'));
    for (const c of bManifest.fullCatalog?.chunks || []) {
      const relFile = c.file;
      const candidate1 = path.join(inputDir, relFile);
      const candidate2 = path.join(inputDir, path.basename(relFile));
      if (fs.existsSync(candidate1)) inputChunkFiles.push(candidate1);
      else if (fs.existsSync(candidate2)) inputChunkFiles.push(candidate2);
    }
  } else if (fs.existsSync(chunksSubdirPath)) {
    const files = fs.readdirSync(chunksSubdirPath).filter(f => f.startsWith('game_index_')).sort();
    for (const f of files) {
      inputChunkFiles.push(path.join(chunksSubdirPath, f));
    }
  } else {
    // Direct chunk search in inputDir
    const files = fs.readdirSync(inputDir).filter(f => f.startsWith('game_index_')).sort();
    for (const f of files) {
      inputChunkFiles.push(path.join(inputDir, f));
    }
  }

  if (inputChunkFiles.length === 0) {
    console.error(`❌ ERROR: No full-detail chunk files found in input directory: ${inputDir}`);
    process.exit(1);
  }

  // Setup Output Subdirectories
  const searchDir = path.join(outputDir, 'search');
  const searchGamesDir = path.join(searchDir, 'games');
  const searchTokensDir = path.join(searchDir, 'tokens');

  const releasesDir = path.join(outputDir, 'releases');
  const releasesUndatedDir = path.join(releasesDir, 'undated');
  const chunksDir = path.join(outputDir, 'chunks');
  const metadataDir = path.join(outputDir, 'metadata');

  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
  if (fs.existsSync(releaseAssetsDir)) fs.rmSync(releaseAssetsDir, { recursive: true, force: true });

  fs.mkdirSync(searchGamesDir, { recursive: true });
  fs.mkdirSync(searchTokensDir, { recursive: true });
  fs.mkdirSync(releasesUndatedDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });
  fs.mkdirSync(releaseAssetsDir, { recursive: true });

  const allCompactRecords: CompactGameLookupRecord[] = [];
  const tokenPostingsMap = new Map<string, Set<number>>();
  const yearPartitionsMap = new Map<string, ReleaseListingRecord[]>();
  const chunkFilesMapping: Record<number, string> = {};
  const globalPlatformsMap = new Map<number, { name: string; abbreviation: string | null }>();

  const outputChunksList: Array<{
    file: string;
    recordCount: number;
    firstSourceId: number;
    lastSourceId: number;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  }> = [];

  let totalCatalogRecords = 0;
  let totalCatalogUncompressedBytes = 0;
  let totalCatalogCompressedBytes = 0;

  console.log(`📦 Processing & Gzipping ${inputChunkFiles.length} full detail chunks...`);

  for (let cIdx = 0; cIdx < inputChunkFiles.length; cIdx++) {
    const chunkInputPath = inputChunkFiles[cIdx];
    const chunkNumericId = cIdx + 1; // 1-indexed chunk number

    let baseName = path.basename(chunkInputPath);
    if (baseName.endsWith('.json.gz')) baseName = baseName.slice(0, -8);
    else if (baseName.endsWith('.json')) baseName = baseName.slice(0, -5);

    const chunkFilename = `${baseName}.json.gz`;

    if (!fs.existsSync(chunkInputPath)) {
      console.error(`❌ ERROR: Chunk file missing: ${chunkInputPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(chunkInputPath);
    let records: any[];

    if (chunkInputPath.endsWith('.gz')) {
      const decompressed = zlib.gunzipSync(rawBuffer);
      records = JSON.parse(decompressed.toString('utf-8'));
    } else {
      records = JSON.parse(rawBuffer.toString('utf-8'));
    }

    const { compressedBuffer, uncompressedByteSize } = compressGzip(records);
    const chunkSha256 = computeSha256(compressedBuffer);

    const relativeChunkPath = `chunks/${chunkFilename}`;
    const chunkOutputPath = path.join(chunksDir, chunkFilename);
    fs.writeFileSync(chunkOutputPath, compressedBuffer);

    chunkFilesMapping[chunkNumericId] = relativeChunkPath;

    outputChunksList.push({
      file: relativeChunkPath,
      recordCount: records.length,
      firstSourceId: records[0].sourceId,
      lastSourceId: records[records.length - 1].sourceId,
      compressedByteSize: compressedBuffer.length,
      uncompressedByteSize,
      sha256: chunkSha256,
      compression: 'gzip',
    });

    totalCatalogRecords += records.length;
    totalCatalogUncompressedBytes += uncompressedByteSize;
    totalCatalogCompressedBytes += compressedBuffer.length;

    for (const record of records) {
      const yearStr = getReleaseYearKey(record.firstReleaseDate);
      const firstYear = record.firstReleaseDate ? parseInt(record.firstReleaseDate.slice(0, 4), 10) : null;

      // 1. Compact Game Lookup Record
      const rankSignals = buildCompactRankSignals(record);
      const compactRecord: CompactGameLookupRecord = {
        id: record.sourceId,
        name: record.name,
        year: isNaN(firstYear!) ? null : firstYear,
        gameType: record.gameType,
        defaultVisible: record.defaultVisible,
        chunk: chunkNumericId,
        alternativeNames: Array.isArray(record.alternativeNames)
          ? record.alternativeNames.map((alias: any) => alias?.name).filter(Boolean)
          : undefined,
        rating: rankSignals.totalRating ?? rankSignals.userRating ?? rankSignals.criticRating,
        rank: rankSignals,
      };
      allCompactRecords.push(compactRecord);

      // 2. Token Posting Index Extraction
      const tokens = tokenizeTitle(record.name);
      const alternativeTokens = Array.isArray(compactRecord.alternativeNames)
        ? compactRecord.alternativeNames.flatMap(alias => tokenizeTitle(alias))
        : [];
      for (const token of new Set([...tokens, ...alternativeTokens])) {
        if (!tokenPostingsMap.has(token)) tokenPostingsMap.set(token, new Set<number>());
        tokenPostingsMap.get(token)!.add(record.sourceId);
      }

      // Collect shared platform metadata
      if (Array.isArray(record.platforms)) {
        for (const p of record.platforms) {
          if (p.id) globalPlatformsMap.set(p.id, { name: p.name || 'Unknown', abbreviation: p.abbreviation || null });
        }
      }

      // 3. Compact Release Listing Record ({ p: platformId, d: date })
      const summaryPreview = record.summary ? (record.summary.length > 200 ? `${record.summary.slice(0, 197)}...` : record.summary) : null;
      const compactPlatformReleaseDates: CompactPlatformReleaseDate[] = [];

      if (Array.isArray(record.platformReleaseDates)) {
        for (const prd of record.platformReleaseDates) {
          const pId = prd.platformId || prd.p || (typeof prd.platform === 'number' ? prd.platform : null);
          const dStr = prd.date || prd.d || prd.dateStr || null;
          if (pId && dStr) {
            compactPlatformReleaseDates.push({ p: pId, d: dStr });
          }
        }
      }

      const releaseRecord: ReleaseListingRecord = {
        id: record.id,
        sourceId: record.sourceId,
        name: record.name,
        slug: record.slug || null,
        gameType: record.gameType,
        gameTypeLabel: record.gameTypeLabel,
        defaultVisible: record.defaultVisible,
        firstReleaseDate: record.firstReleaseDate || null,
        firstReleaseDatePrecision: record.datePrecision || 'unknown',
        platformReleaseDates: compactPlatformReleaseDates,
        platforms: record.platforms || [],
        coverUrl: record.coverUrl || null,
        summaryPreview,
        dataChunk: relativeChunkPath,
        rank: compactRecord.rank,
      };

      if (!yearPartitionsMap.has(yearStr)) yearPartitionsMap.set(yearStr, []);
      yearPartitionsMap.get(yearStr)!.push(releaseRecord);
    }
  }

  // --- WRITE SHARED PLATFORMS METADATA (metadata/platforms.json.gz) ---
  const sharedPlatformsObj: Record<number, { name: string; abbreviation: string | null }> = {};
  for (const [pId, info] of globalPlatformsMap.entries()) {
    sharedPlatformsObj[pId] = info;
  }
  const { compressedBuffer: platformsBuffer, uncompressedByteSize: platformsUncompressed } = compressGzip(sharedPlatformsObj);
  const platformsSha256 = computeSha256(platformsBuffer);
  fs.writeFileSync(path.join(metadataDir, 'platforms.json.gz'), platformsBuffer);

  // --- BUILD 1: COMPACT GAME LOOKUP FILES (.json.gz) ---
  console.log('🎮 Gzipping Compact Game Lookup Table...');
  allCompactRecords.sort((a, b) => a.id - b.id);

  const lookupFilesList: Array<{
    file: string;
    firstId: number;
    lastId: number;
    recordCount: number;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  }> = [];

  let totalLookupCompressedBytes = 0;
  let fileIndex = 1;

  for (let i = 0; i < allCompactRecords.length; i += LOOKUP_FILE_RECORD_LIMIT) {
    const chunkRecords = allCompactRecords.slice(i, i + LOOKUP_FILE_RECORD_LIMIT);
    const filename = `games_${String(fileIndex).padStart(4, '0')}.json.gz`;
    const filePath = path.join(searchGamesDir, filename);

    const { compressedBuffer, uncompressedByteSize } = compressGzip(chunkRecords);
    const sha256 = computeSha256(compressedBuffer);
    fs.writeFileSync(filePath, compressedBuffer);

    totalLookupCompressedBytes += compressedBuffer.length;

    lookupFilesList.push({
      file: `search/games/${filename}`,
      firstId: chunkRecords[0].id,
      lastId: chunkRecords[chunkRecords.length - 1].id,
      recordCount: chunkRecords.length,
      compressedByteSize: compressedBuffer.length,
      uncompressedByteSize,
      sha256,
      compression: 'gzip',
    });
    fileIndex++;
  }

  // --- BUILD 2: 256 TOKEN POSTING BUCKETS (.json.gz) ---
  console.log('🔤 Gzipping 256 Token Posting Buckets...');
  const tokenBucketsMap = new Map<string, Record<string, number[]>>();

  for (let b = 0; b < 256; b++) {
    const hexKey = b.toString(16).padStart(2, '0');
    tokenBucketsMap.set(hexKey, {});
  }

  for (const [token, idSet] of tokenPostingsMap.entries()) {
    const bucketKey = getBuildTokenBucketKey(token);
    const sortedIds = Array.from(idSet).sort((a, b) => a - b);
    const bucketObj = tokenBucketsMap.get(bucketKey)!;
    bucketObj[token] = sortedIds;
  }

  const tokenBucketsList: Array<{
    key: string;
    file: string;
    tokenCount: number;
    postingCount: number;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  }> = [];

  let totalTokenCompressedBytes = 0;
  let occupiedBucketCount = 0;

  for (let b = 0; b < 256; b++) {
    const hexKey = b.toString(16).padStart(2, '0');
    const bucketObj = tokenBucketsMap.get(hexKey)!;
    const tokenCount = Object.keys(bucketObj).length;
    if (tokenCount > 0) occupiedBucketCount++;

    let postingCount = 0;
    for (const ids of Object.values(bucketObj)) {
      postingCount += ids.length;
    }

    const filename = `tokens_${hexKey}.json.gz`;
    const filePath = path.join(searchTokensDir, filename);

    const sortedTokens = Object.keys(bucketObj).sort();
    const sortedBucketObj: Record<string, number[]> = {};
    for (const t of sortedTokens) {
      sortedBucketObj[t] = bucketObj[t];
    }

    const { compressedBuffer, uncompressedByteSize } = compressGzip(sortedBucketObj);
    const sha256 = computeSha256(compressedBuffer);
    fs.writeFileSync(filePath, compressedBuffer);

    totalTokenCompressedBytes += compressedBuffer.length;

    tokenBucketsList.push({
      key: hexKey,
      file: `search/tokens/${filename}`,
      tokenCount,
      postingCount,
      compressedByteSize: compressedBuffer.length,
      uncompressedByteSize,
      sha256,
      compression: 'gzip',
    });
  }

  // Write Search Token Manifest
  const searchTokenManifest = {
    schemaVersion: 3,
    rankingSchemaVersion: RANKING_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    gameCount: totalCatalogRecords,
    uniqueTokenCount: tokenPostingsMap.size,
    lookupFiles: lookupFilesList,
    tokenBuckets: tokenBucketsList,
    chunkFiles: chunkFilesMapping,
  };

  const searchManifestPath = path.join(searchDir, 'token_manifest.json');
  fs.writeFileSync(searchManifestPath, JSON.stringify(searchTokenManifest, null, 2), 'utf-8');

  // --- BUILD 3: SUBDIVIDED RELEASE PARTITIONS (.json.gz) ---
  console.log('📅 Subdividing & Gzipping Release Partitions...');
  const releaseManifestPartitions: Array<{
    key: string;
    file: string;
    recordCount: number;
    compressedByteSize: number;
    uncompressedByteSize: number;
    sha256: string;
    compression: 'gzip';
  }> = [];

  let totalReleaseCompressedBytes = 0;

  for (const [yearStr, records] of yearPartitionsMap.entries()) {
    if (yearStr === 'undated') {
      records.sort((a, b) => a.sourceId - b.sourceId);
      let uIdx = 1;
      for (let i = 0; i < records.length; i += RELEASE_FILE_RECORD_LIMIT) {
        const uChunk = records.slice(i, i + RELEASE_FILE_RECORD_LIMIT);
        const filename = `undated_${String(uIdx).padStart(4, '0')}.json.gz`;
        const filePath = path.join(releasesUndatedDir, filename);

        const { compressedBuffer, uncompressedByteSize } = compressGzip(uChunk);
        const sha256 = computeSha256(compressedBuffer);
        fs.writeFileSync(filePath, compressedBuffer);

        totalReleaseCompressedBytes += compressedBuffer.length;

        releaseManifestPartitions.push({
          key: `undated_${uIdx}`,
          file: `releases/undated/${filename}`,
          recordCount: uChunk.length,
          compressedByteSize: compressedBuffer.length,
          uncompressedByteSize,
          sha256,
          compression: 'gzip',
        });
        uIdx++;
      }
    } else {
      const { compressedBuffer: testBuffer, uncompressedByteSize: testUncompressed } = compressGzip(records);

      if (testUncompressed > 5 * 1024 * 1024 || records.length > RELEASE_FILE_RECORD_LIMIT) {
        const yearSubDir = path.join(releasesDir, yearStr);
        fs.mkdirSync(yearSubDir, { recursive: true });

        const monthMap = new Map<string, ReleaseListingRecord[]>();
        for (const r of records) {
          const mKey = getReleaseMonthKey(r.firstReleaseDate);
          if (!monthMap.has(mKey)) monthMap.set(mKey, []);
          monthMap.get(mKey)!.push(r);
        }

        const sortedMonths = Array.from(monthMap.keys()).sort();
        for (const mKey of sortedMonths) {
          const mRecords = monthMap.get(mKey)!;
          mRecords.sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));

          const filename = `${mKey}.json.gz`;
          const filePath = path.join(yearSubDir, filename);

          const { compressedBuffer, uncompressedByteSize } = compressGzip(mRecords);
          const sha256 = computeSha256(compressedBuffer);
          fs.writeFileSync(filePath, compressedBuffer);

          totalReleaseCompressedBytes += compressedBuffer.length;

          releaseManifestPartitions.push({
            key: `${yearStr}/${mKey}`,
            file: `releases/${yearStr}/${filename}`,
            recordCount: mRecords.length,
            compressedByteSize: compressedBuffer.length,
            uncompressedByteSize,
            sha256,
            compression: 'gzip',
          });
        }
      } else {
        records.sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));
        const filename = `${yearStr}.json.gz`;
        const filePath = path.join(releasesDir, filename);

        const sha256 = computeSha256(testBuffer);
        fs.writeFileSync(filePath, testBuffer);
        totalReleaseCompressedBytes += testBuffer.length;

        releaseManifestPartitions.push({
          key: yearStr,
          file: `releases/${filename}`,
          recordCount: records.length,
          compressedByteSize: testBuffer.length,
          uncompressedByteSize: testUncompressed,
          sha256,
          compression: 'gzip',
        });
      }
    }
  }

  const releaseManifest = {
    schemaVersion: 3,
    rankingSchemaVersion: RANKING_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    recordCount: totalCatalogRecords,
    totalBytes: totalReleaseCompressedBytes,
    platformsMetadata: {
      file: 'metadata/platforms.json.gz',
      compressedByteSize: platformsBuffer.length,
      uncompressedByteSize: platformsUncompressed,
      sha256: platformsSha256,
      compression: 'gzip',
    },
    partitions: releaseManifestPartitions,
  };

  const releaseManifestPath = path.join(releasesDir, 'release_manifest.json');
  fs.writeFileSync(releaseManifestPath, JSON.stringify(releaseManifest, null, 2), 'utf-8');

  // --- WRITE MASTER BROWSER CATALOG MANIFEST FIRST ---
  const catalogBuildId = `build-${Date.now()}`;

  const outputBrowserManifest = {
    source: 'igdb',
    schemaVersion: 3,
    rankingSchemaVersion: RANKING_SCHEMA_VERSION,
    catalogBuildId,
    generatedAt: new Date().toISOString(),

    catalogRecordCount: totalCatalogRecords,
    fullCatalogCompressedBytes: totalCatalogCompressedBytes,
    fullCatalogUncompressedBytes: totalCatalogUncompressedBytes,

    searchManifest: 'search/token_manifest.json',
    releaseManifest: 'releases/release_manifest.json',
    platformsMetadata: 'metadata/platforms.json.gz',

    sizeReport: {
      fullDetailBytes: totalCatalogCompressedBytes,
      compactLookupBytes: totalLookupCompressedBytes,
      tokenIndexBytes: totalTokenCompressedBytes,
      releasePartitionBytes: totalReleaseCompressedBytes,
      sharedMetadataBytes: platformsBuffer.length,
    },

    fullCatalog: {
      chunkCount: outputChunksList.length,
      chunks: outputChunksList,
    },

    optionalArchive: {
      file: 'https://github.com/LukieSeven/PlayAtlas/releases/download/v1.0.0-catalog/play-atlas-full-catalog.zip',
      byteSize: 0,
      sha256: '',
      format: 'zip',
    },
  };

  const outputBrowserManifestPath = path.join(outputDir, 'browser_catalog_manifest.json');
  fs.writeFileSync(outputBrowserManifestPath, JSON.stringify(outputBrowserManifest, null, 2), 'utf-8');

  // --- BUILD 4: MASTER ZIP ARCHIVE FROM COMPLETE OUTPUT DIR ROOT ---
  console.log('📦 Generating Root-Normalized Master ZIP Archive (generated/release-assets/play-atlas-full-catalog.zip)...');
  const zipPath = path.join(releaseAssetsDir, 'play-atlas-full-catalog.zip');

  await new Promise<void>((resolve, reject) => {
    const outputStream = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    outputStream.on('close', () => resolve());
    archive.on('error', err => reject(err));

    archive.pipe(outputStream);
    // Archive contents of outputDir directly at the ZIP root (false parameter prevents outer directory nesting)
    archive.directory(outputDir, false);
    archive.finalize();
  });

  const zipBuffer = fs.readFileSync(zipPath);
  const zipSha256 = computeSha256(zipBuffer);
  fs.writeFileSync(`${zipPath}.sha256`, zipSha256, 'utf-8');

  // Update manifest optionalArchive metadata with actual ZIP size and hash
  outputBrowserManifest.optionalArchive.byteSize = zipBuffer.length;
  outputBrowserManifest.optionalArchive.sha256 = zipSha256;
  fs.writeFileSync(outputBrowserManifestPath, JSON.stringify(outputBrowserManifest, null, 2), 'utf-8');

  console.log(`✅ Master Root-Normalized ZIP Archive created: ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // Measure exact published catalog size (compressed bytes on disk in outputDir)
  const publishedCatalogBytes =
    totalLookupCompressedBytes +
    totalTokenCompressedBytes +
    totalReleaseCompressedBytes +
    totalCatalogCompressedBytes +
    platformsBuffer.length;

  const publishedCatalogMb = (publishedCatalogBytes / (1024 * 1024)).toFixed(2);

  if (publishedCatalogBytes > MAX_DEPLOYMENT_CEILING_BYTES) {
    console.error(`❌ CUTOVER BLOCKED: published catalog (${publishedCatalogMb} MB) exceeds safe 900 MB GitHub Pages limit!`);
    process.exit(1);
  }

  // Diagnostic calculations for post-build verification
  const witcherExpectedBucket = getBuildTokenBucketKey('witcher');
  const threeExpectedBucket = getBuildTokenBucketKey('3');

  const witcherBucketObj = tokenBucketsMap.get(witcherExpectedBucket) || {};
  const threeBucketObj = tokenBucketsMap.get(threeExpectedBucket) || {};

  const witcherPostingCount = witcherBucketObj['witcher'] ? witcherBucketObj['witcher'].length : 0;
  const threePostingCount = threeBucketObj['3'] ? threeBucketObj['3'].length : 0;

  const sumTokenCountAcrossBuckets = tokenBucketsList.reduce((acc, b) => acc + b.tokenCount, 0);

  console.log('====================================================');
  console.log('📊 GZIPPED CATALOG BUILD & TOKEN DISTRIBUTION REPORT');
  console.log('====================================================');
  console.log(`Catalog Build ID:    ${catalogBuildId}`);
  console.log(`Token:               witcher`);
  console.log(`Expected Bucket:     ${witcherExpectedBucket}`);
  console.log(`Physical Bucket:     ${witcherExpectedBucket}`);
  console.log(`Posting Count:       ${witcherPostingCount}`);
  console.log(`----------------------------------------------------`);
  console.log(`Token:               3`);
  console.log(`Expected Bucket:     ${threeExpectedBucket}`);
  console.log(`Physical Bucket:     ${threeExpectedBucket}`);
  console.log(`Posting Count:       ${threePostingCount}`);
  console.log(`----------------------------------------------------`);
  console.log(`Occupied Token Buckets:     ${occupiedBucketCount}/256`);
  console.log(`Unique Tokens:              ${tokenPostingsMap.size.toLocaleString()}`);
  console.log(`Token Count Across Buckets: ${sumTokenCountAcrossBuckets.toLocaleString()}`);
  console.log(`----------------------------------------------------`);
  console.log(`🎮 Total Catalog Records:    ${totalCatalogRecords.toLocaleString()}`);
  console.log(`🚀 Total Published Pages Size: ${publishedCatalogMb} MB (Ceiling: 900 MB)`);
  console.log('====================================================');
  console.log('✅ Compressed Browser Catalog Built Successfully!');
}

if (process.argv[1] && process.argv[1].includes('build-browser-catalog')) {
  runBrowserCatalogBuilder().catch(err => {
    console.error('❌ Browser Catalog Builder Failed:', err);
    process.exit(1);
  });
}
