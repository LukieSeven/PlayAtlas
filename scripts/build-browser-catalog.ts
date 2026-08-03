import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import {
  tokenizeTitle,
  getTokenBucketKey,
  getReleaseYearKey,
  getReleaseMonthKey,
} from '../src/utils/browserCatalogUtils';

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

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface CompactGameLookupRecord {
  id: number;
  name: string;
  year: number | null;
  gameType: string;
  defaultVisible: boolean;
  chunk: number;
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
  platformReleaseDates: Array<{
    platformId: number | null;
    platformName: string;
    date: string | null;
  }>;
  platforms: Array<{
    id: number;
    name: string;
    abbreviation: string | null;
  }>;
  coverUrl: string | null;
  summaryPreview: string | null;
  dataChunk: string;
}

async function runBrowserCatalogBuilder() {
  console.log('🚀 Starting Compact Token-Based Browser Catalog Builder...');

  const inputDir = path.isAbsolute(INPUT_DIR_ENV) ? INPUT_DIR_ENV : path.join(process.cwd(), INPUT_DIR_ENV);
  const outputDir = path.isAbsolute(OUTPUT_DIR_ENV) ? OUTPUT_DIR_ENV : path.join(process.cwd(), OUTPUT_DIR_ENV);

  console.log(`📥 Input Directory:  ${inputDir}`);
  console.log(`📤 Output Directory: ${outputDir}`);

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ ERROR: Input catalog directory does not exist: ${inputDir}`);
    process.exit(1);
  }

  const manifestPath = path.join(inputDir, 'game_index_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ ERROR: Input manifest missing: ${manifestPath}`);
    process.exit(1);
  }

  const inputManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const inputChunks: any[] = inputManifest.chunks || [];

  if (inputChunks.length === 0) {
    console.error(`❌ ERROR: No chunks listed in input manifest.`);
    process.exit(1);
  }

  // Setup Output Subdirectories
  const searchDir = path.join(outputDir, 'search');
  const searchGamesDir = path.join(searchDir, 'games');
  const searchTokensDir = path.join(searchDir, 'tokens');

  const releasesDir = path.join(outputDir, 'releases');
  const releasesUndatedDir = path.join(releasesDir, 'undated');
  const chunksDir = path.join(outputDir, 'chunks');

  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(searchGamesDir, { recursive: true });
  fs.mkdirSync(searchTokensDir, { recursive: true });
  fs.mkdirSync(releasesUndatedDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });

  const allCompactRecords: CompactGameLookupRecord[] = [];
  const tokenPostingsMap = new Map<string, Set<number>>();
  const yearPartitionsMap = new Map<string, ReleaseListingRecord[]>();
  const chunkFilesMapping: Record<number, string> = {};

  const outputChunksList: Array<{
    file: string;
    recordCount: number;
    firstSourceId: number;
    lastSourceId: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalCatalogRecords = 0;
  let totalCatalogUncompressedBytes = 0;

  console.log(`📦 Processing ${inputChunks.length} full detail chunks...`);

  for (let cIdx = 0; cIdx < inputChunks.length; cIdx++) {
    const chunkInfo = inputChunks[cIdx];
    const chunkNumericId = cIdx + 1; // 1-indexed chunk number
    const chunkFilename = path.basename(chunkInfo.file);
    const chunkInputPath = path.join(inputDir, chunkFilename);

    if (!fs.existsSync(chunkInputPath)) {
      console.error(`❌ ERROR: Chunk file missing: ${chunkInputPath}`);
      process.exit(1);
    }

    const rawChunkContent = fs.readFileSync(chunkInputPath);
    const records: any[] = JSON.parse(rawChunkContent.toString('utf-8'));

    const relativeChunkPath = `chunks/${chunkFilename}`;
    const chunkOutputPath = path.join(chunksDir, chunkFilename);
    fs.writeFileSync(chunkOutputPath, rawChunkContent);

    const chunkSha256 = computeSha256(rawChunkContent);
    chunkFilesMapping[chunkNumericId] = relativeChunkPath;

    outputChunksList.push({
      file: relativeChunkPath,
      recordCount: records.length,
      firstSourceId: records[0].sourceId,
      lastSourceId: records[records.length - 1].sourceId,
      byteSize: rawChunkContent.length,
      sha256: chunkSha256,
    });

    totalCatalogRecords += records.length;
    totalCatalogUncompressedBytes += rawChunkContent.length;

    for (const record of records) {
      const yearStr = getReleaseYearKey(record.firstReleaseDate);
      const firstYear = record.firstReleaseDate ? parseInt(record.firstReleaseDate.slice(0, 4), 10) : null;

      // 1. Compact Game Lookup Record
      const compactRecord: CompactGameLookupRecord = {
        id: record.sourceId,
        name: record.name,
        year: isNaN(firstYear!) ? null : firstYear,
        gameType: record.gameType,
        defaultVisible: record.defaultVisible,
        chunk: chunkNumericId,
      };
      allCompactRecords.push(compactRecord);

      // 2. Token Posting Index Extraction
      const tokens = tokenizeTitle(record.name);
      for (const token of tokens) {
        if (!tokenPostingsMap.has(token)) tokenPostingsMap.set(token, new Set<number>());
        tokenPostingsMap.get(token)!.add(record.sourceId);
      }

      // 3. Release Listing Record (with lightweight platformReleaseDates)
      const summaryPreview = record.summary ? (record.summary.length > 200 ? `${record.summary.slice(0, 197)}...` : record.summary) : null;
      const platformReleaseDates = Array.isArray(record.platformReleaseDates)
        ? record.platformReleaseDates.map((prd: any) => ({
            platformId: prd.platformId || null,
            platformName: prd.platformName || 'Unknown Platform',
            date: prd.date || prd.dateStr || null,
          }))
        : [];

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
        platformReleaseDates,
        platforms: record.platforms || [],
        coverUrl: record.coverUrl || null,
        summaryPreview,
        dataChunk: relativeChunkPath,
      };

      if (!yearPartitionsMap.has(yearStr)) yearPartitionsMap.set(yearStr, []);
      yearPartitionsMap.get(yearStr)!.push(releaseRecord);
    }
  }

  // --- BUILD 1: COMPACT GAME LOOKUP FILES ---
  console.log('🎮 Partitioning Compact Game Lookup Table...');
  allCompactRecords.sort((a, b) => a.id - b.id);

  const lookupFilesList: Array<{
    file: string;
    firstId: number;
    lastId: number;
    recordCount: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalLookupBytes = 0;
  let fileIndex = 1;

  for (let i = 0; i < allCompactRecords.length; i += LOOKUP_FILE_RECORD_LIMIT) {
    const chunkRecords = allCompactRecords.slice(i, i + LOOKUP_FILE_RECORD_LIMIT);
    const filename = `games_${String(fileIndex).padStart(4, '0')}.json`;
    const filePath = path.join(searchGamesDir, filename);

    const jsonStr = JSON.stringify(chunkRecords, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    fs.writeFileSync(filePath, buffer);
    const sha256 = computeSha256(buffer);
    totalLookupBytes += buffer.length;

    lookupFilesList.push({
      file: `search/games/${filename}`,
      firstId: chunkRecords[0].id,
      lastId: chunkRecords[chunkRecords.length - 1].id,
      recordCount: chunkRecords.length,
      byteSize: buffer.length,
      sha256,
    });
    fileIndex++;
  }

  // --- BUILD 2: 256 TOKEN POSTING BUCKETS ---
  console.log('🔤 Partitioning 256 Token Posting Buckets...');
  const tokenBucketsMap = new Map<string, Record<string, number[]>>();

  for (let b = 0; b < 256; b++) {
    const hexKey = b.toString(16).padStart(2, '0');
    tokenBucketsMap.set(hexKey, {});
  }

  for (const [token, idSet] of tokenPostingsMap.entries()) {
    const bucketKey = getTokenBucketKey(token);
    const sortedIds = Array.from(idSet).sort((a, b) => a - b);
    const bucketObj = tokenBucketsMap.get(bucketKey)!;
    bucketObj[token] = sortedIds;
  }

  const tokenBucketsList: Array<{
    key: string;
    file: string;
    tokenCount: number;
    postingCount: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalTokenBytes = 0;

  for (let b = 0; b < 256; b++) {
    const hexKey = b.toString(16).padStart(2, '0');
    const bucketObj = tokenBucketsMap.get(hexKey)!;
    const tokenCount = Object.keys(bucketObj).length;
    let postingCount = 0;
    for (const ids of Object.values(bucketObj)) {
      postingCount += ids.length;
    }

    const filename = `tokens_${hexKey}.json`;
    const filePath = path.join(searchTokensDir, filename);

    const sortedTokens = Object.keys(bucketObj).sort();
    const sortedBucketObj: Record<string, number[]> = {};
    for (const t of sortedTokens) {
      sortedBucketObj[t] = bucketObj[t];
    }

    const jsonStr = JSON.stringify(sortedBucketObj, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    fs.writeFileSync(filePath, buffer);
    const sha256 = computeSha256(buffer);
    totalTokenBytes += buffer.length;

    tokenBucketsList.push({
      key: hexKey,
      file: `search/tokens/${filename}`,
      tokenCount,
      postingCount,
      byteSize: buffer.length,
      sha256,
    });
  }

  // Write Search Token Manifest
  const searchTokenManifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    gameCount: totalCatalogRecords,
    uniqueTokenCount: tokenPostingsMap.size,
    lookupFiles: lookupFilesList,
    tokenBuckets: tokenBucketsList,
    chunkFiles: chunkFilesMapping,
  };

  const searchManifestPath = path.join(searchDir, 'token_manifest.json');
  fs.writeFileSync(searchManifestPath, JSON.stringify(searchTokenManifest, null, 2), 'utf-8');

  // --- BUILD 3: SUBDIVIDED RELEASE PARTITIONS ---
  console.log('📅 Subdividing Release Partitions & Writing Release Manifest...');
  const releaseManifestPartitions: Array<{
    key: string;
    file: string;
    recordCount: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalReleaseBytes = 0;

  for (const [yearStr, records] of yearPartitionsMap.entries()) {
    if (yearStr === 'undated') {
      records.sort((a, b) => a.sourceId - b.sourceId);
      let uIdx = 1;
      for (let i = 0; i < records.length; i += RELEASE_FILE_RECORD_LIMIT) {
        const uChunk = records.slice(i, i + RELEASE_FILE_RECORD_LIMIT);
        const filename = `undated_${String(uIdx).padStart(4, '0')}.json`;
        const filePath = path.join(releasesUndatedDir, filename);

        const jsonStr = JSON.stringify(uChunk, null, 2);
        const buffer = Buffer.from(jsonStr, 'utf-8');

        fs.writeFileSync(filePath, buffer);
        const sha256 = computeSha256(buffer);
        totalReleaseBytes += buffer.length;

        releaseManifestPartitions.push({
          key: `undated_${uIdx}`,
          file: `releases/undated/${filename}`,
          recordCount: uChunk.length,
          byteSize: buffer.length,
          sha256,
        });
        uIdx++;
      }
    } else {
      const jsonTestStr = JSON.stringify(records, null, 2);
      const testBuffer = Buffer.from(jsonTestStr, 'utf-8');

      if (testBuffer.length > 5 * 1024 * 1024 || records.length > RELEASE_FILE_RECORD_LIMIT) {
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

          const filename = `${mKey}.json`;
          const filePath = path.join(yearSubDir, filename);

          const jsonStr = JSON.stringify(mRecords, null, 2);
          const buffer = Buffer.from(jsonStr, 'utf-8');

          fs.writeFileSync(filePath, buffer);
          const sha256 = computeSha256(buffer);
          totalReleaseBytes += buffer.length;

          releaseManifestPartitions.push({
            key: `${yearStr}/${mKey}`,
            file: `releases/${yearStr}/${filename}`,
            recordCount: mRecords.length,
            byteSize: buffer.length,
            sha256,
          });
        }
      } else {
        records.sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));
        const filename = `${yearStr}.json`;
        const filePath = path.join(releasesDir, filename);

        fs.writeFileSync(filePath, testBuffer);
        const sha256 = computeSha256(testBuffer);
        totalReleaseBytes += testBuffer.length;

        releaseManifestPartitions.push({
          key: yearStr,
          file: `releases/${filename}`,
          recordCount: records.length,
          byteSize: testBuffer.length,
          sha256,
        });
      }
    }
  }

  const releaseManifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    recordCount: totalCatalogRecords,
    totalBytes: totalReleaseBytes,
    partitions: releaseManifestPartitions,
  };

  const releaseManifestPath = path.join(releasesDir, 'release_manifest.json');
  fs.writeFileSync(releaseManifestPath, JSON.stringify(releaseManifest, null, 2), 'utf-8');

  // --- BUILD 4: MASTER ZIP ARCHIVE ---
  console.log('📦 Generating Master ZIP Archive (play-atlas-full-catalog.zip)...');
  const zipPath = path.join(outputDir, 'play-atlas-full-catalog.zip');

  await new Promise<void>((resolve, reject) => {
    const outputStream = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    outputStream.on('close', () => resolve());
    archive.on('error', err => reject(err));

    archive.pipe(outputStream);
    archive.directory(searchDir, 'search');
    archive.directory(releasesDir, 'releases');
    archive.directory(chunksDir, 'chunks');
    archive.finalize();
  });

  const zipBuffer = fs.readFileSync(zipPath);
  const zipSha256 = computeSha256(zipBuffer);
  fs.writeFileSync(`${zipPath}.sha256`, zipSha256, 'utf-8');

  console.log(`✅ Master ZIP Archive created: ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // --- BUILD 5: MASTER BROWSER CATALOG MANIFEST ---
  const browserCatalogManifest = {
    source: 'igdb',
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),

    catalogRecordCount: totalCatalogRecords,
    fullCatalogUncompressedBytes: totalCatalogUncompressedBytes,

    searchManifest: 'search/token_manifest.json',
    releaseManifest: 'releases/release_manifest.json',

    fullCatalog: {
      chunkCount: outputChunksList.length,
      chunks: outputChunksList,
    },

    optionalArchive: {
      file: 'https://github.com/LukieSeven/PlayAtlas/releases/download/v1.0.0-catalog/play-atlas-full-catalog.zip',
      byteSize: zipBuffer.length,
      sha256: zipSha256,
      format: 'zip',
    },
  };

  const browserManifestPath = path.join(outputDir, 'browser_catalog_manifest.json');
  fs.writeFileSync(browserManifestPath, JSON.stringify(browserCatalogManifest, null, 2), 'utf-8');

  const publishedCatalogBytes = totalLookupBytes + totalTokenBytes + totalReleaseBytes + totalCatalogUncompressedBytes;
  const publishedCatalogMb = (publishedCatalogBytes / (1024 * 1024)).toFixed(2);

  if (publishedCatalogBytes > MAX_DEPLOYMENT_CEILING_BYTES) {
    console.error(`❌ CUTOVER BLOCKED: published catalog (${publishedCatalogMb} MB) exceeds safe 900 MB GitHub Pages limit!`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('📊 PRODUCTION CATALOG BUILD & CEILING VERIFICATION');
  console.log('====================================================');
  console.log(`🎮 Total Catalog Records:          ${totalCatalogRecords.toLocaleString()}`);
  console.log(`🎮 Compact Lookup Table Size:       ${(totalLookupBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🔤 Token Posting Index Size:       ${(totalTokenBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📅 Release Partitions Total Size:   ${(totalReleaseBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`📦 Full Detail Chunks Total Size:   ${(totalCatalogUncompressedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`----------------------------------------------------`);
  console.log(`🚀 Total Published Deployment Size: ${publishedCatalogMb} MB (Ceiling: 900 MB)`);
  console.log(`⚖️ 900 MB Size Ceiling Check:       PASSED CLEANLY!`);
  console.log('====================================================');
  console.log('✅ Production Browser Catalog Built Successfully!');
}

runBrowserCatalogBuilder().catch(err => {
  console.error('❌ Browser Catalog Builder Failed:', err);
  process.exit(1);
});
