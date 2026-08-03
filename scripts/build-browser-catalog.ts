import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import {
  normalizeSearchQuery,
  getSearchBucketKey,
  getReleaseYearKey,
  buildCoverThumbnailUrl,
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

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface SearchIndexRecord {
  id: string;
  sourceId: number;
  name: string;
  normalizedName: string;
  slug: string | null;
  gameType: string;
  gameTypeLabel: string;
  defaultVisible: boolean;
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
  platforms: Array<{
    id: number;
    name: string;
    abbreviation: string | null;
  }>;
  coverThumbnailUrl: string | null;
  dataChunk: string;
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
  console.log('🚀 Starting Play Atlas Browser Catalog Builder...');

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

  // Setup Output Directory Structure
  const searchDir = path.join(outputDir, 'search');
  const releasesDir = path.join(outputDir, 'releases');
  const chunksDir = path.join(outputDir, 'chunks');

  if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(searchDir, { recursive: true });
  fs.mkdirSync(releasesDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });

  const searchBucketsMap = new Map<string, SearchIndexRecord[]>();
  const releaseYearsMap = new Map<string, ReleaseListingRecord[]>();

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

  for (const chunkInfo of inputChunks) {
    const chunkFilename = path.basename(chunkInfo.file);
    const chunkInputPath = path.join(inputDir, chunkFilename);

    if (!fs.existsSync(chunkInputPath)) {
      console.error(`❌ ERROR: Chunk file missing: ${chunkInputPath}`);
      process.exit(1);
    }

    const rawChunkContent = fs.readFileSync(chunkInputPath);
    const records: any[] = JSON.parse(rawChunkContent.toString('utf-8'));

    const chunkOutputPath = path.join(chunksDir, chunkFilename);
    fs.writeFileSync(chunkOutputPath, rawChunkContent);

    const chunkSha256 = computeSha256(rawChunkContent);
    const relativeChunkPath = `chunks/${chunkFilename}`;

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
      const normalizedName = normalizeSearchQuery(record.name);
      const bucketKey = getSearchBucketKey(normalizedName);
      const yearKey = getReleaseYearKey(record.firstReleaseDate);

      const firstYear = record.firstReleaseDate ? parseInt(record.firstReleaseDate.slice(0, 4), 10) : null;

      // 1. Lightweight Search Record
      const searchRecord: SearchIndexRecord = {
        id: record.id,
        sourceId: record.sourceId,
        name: record.name,
        normalizedName,
        slug: record.slug || null,
        gameType: record.gameType,
        gameTypeLabel: record.gameTypeLabel,
        defaultVisible: record.defaultVisible,
        firstReleaseDate: record.firstReleaseDate || null,
        firstReleaseYear: isNaN(firstYear!) ? null : firstYear,
        platforms: record.platforms || [],
        coverThumbnailUrl: buildCoverThumbnailUrl(record.coverImageId),
        dataChunk: relativeChunkPath,
      };

      if (!searchBucketsMap.has(bucketKey)) searchBucketsMap.set(bucketKey, []);
      searchBucketsMap.get(bucketKey)!.push(searchRecord);

      // 2. Release Listing Record
      const summaryPreview = record.summary ? (record.summary.length > 200 ? `${record.summary.slice(0, 197)}...` : record.summary) : null;

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
        platforms: record.platforms || [],
        coverUrl: record.coverUrl || null,
        summaryPreview,
        dataChunk: relativeChunkPath,
      };

      if (!releaseYearsMap.has(yearKey)) releaseYearsMap.set(yearKey, []);
      releaseYearsMap.get(yearKey)!.push(releaseRecord);
    }
  }

  // Write Search Buckets & Search Manifest
  console.log('🔍 Writing Lightweight Search Buckets & Search Manifest...');
  const searchManifestBuckets: Array<{
    key: string;
    file: string;
    recordCount: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalSearchBytes = 0;
  const sortedBucketKeys = Array.from(searchBucketsMap.keys()).sort();

  for (const bucketKey of sortedBucketKeys) {
    const bucketRecords = searchBucketsMap.get(bucketKey)!;
    bucketRecords.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));

    const filename = `search_${bucketKey}.json`;
    const filePath = path.join(searchDir, filename);
    const jsonStr = JSON.stringify(bucketRecords, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    fs.writeFileSync(filePath, buffer);
    const hash = computeSha256(buffer);
    totalSearchBytes += buffer.length;

    searchManifestBuckets.push({
      key: bucketKey,
      file: `search/${filename}`,
      recordCount: bucketRecords.length,
      byteSize: buffer.length,
      sha256: hash,
    });
  }

  const searchManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    recordCount: totalCatalogRecords,
    totalBytes: totalSearchBytes,
    buckets: searchManifestBuckets,
  };

  const searchManifestPath = path.join(searchDir, 'search_manifest.json');
  fs.writeFileSync(searchManifestPath, JSON.stringify(searchManifest, null, 2), 'utf-8');

  // Write Release Year Partitions & Release Manifest
  console.log('📅 Writing Release-Year Partitions & Release Manifest...');
  const releaseManifestBuckets: Array<{
    year: string;
    file: string;
    recordCount: number;
    byteSize: number;
    sha256: string;
  }> = [];

  let totalReleaseBytes = 0;
  const sortedYearKeys = Array.from(releaseYearsMap.keys()).sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return b.localeCompare(a); // Year descending
  });

  for (const yearKey of sortedYearKeys) {
    const yearRecords = releaseYearsMap.get(yearKey)!;
    yearRecords.sort((a, b) => (b.firstReleaseDate || '').localeCompare(a.firstReleaseDate || ''));

    const filename = `${yearKey}.json`;
    const filePath = path.join(releasesDir, filename);
    const jsonStr = JSON.stringify(yearRecords, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    fs.writeFileSync(filePath, buffer);
    const hash = computeSha256(buffer);
    totalReleaseBytes += buffer.length;

    releaseManifestBuckets.push({
      year: yearKey,
      file: `releases/${filename}`,
      recordCount: yearRecords.length,
      byteSize: buffer.length,
      sha256: hash,
    });
  }

  const releaseManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    recordCount: totalCatalogRecords,
    totalBytes: totalReleaseBytes,
    partitions: releaseManifestBuckets,
  };

  const releaseManifestPath = path.join(releasesDir, 'release_manifest.json');
  fs.writeFileSync(releaseManifestPath, JSON.stringify(releaseManifest, null, 2), 'utf-8');

  // Generate Master ZIP Archive
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

  // Write Master Browser Catalog Manifest
  const browserCatalogManifest = {
    source: 'igdb',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),

    catalogRecordCount: totalCatalogRecords,
    fullCatalogUncompressedBytes: totalCatalogUncompressedBytes,

    searchManifest: 'search/search_manifest.json',
    releaseManifest: 'releases/release_manifest.json',

    fullCatalog: {
      chunkCount: outputChunksList.length,
      chunks: outputChunksList,
    },

    optionalArchive: {
      file: 'play-atlas-full-catalog.zip',
      byteSize: zipBuffer.length,
      sha256: zipSha256,
      format: 'zip',
    },
  };

  const browserManifestPath = path.join(outputDir, 'browser_catalog_manifest.json');
  fs.writeFileSync(browserManifestPath, JSON.stringify(browserCatalogManifest, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('📊 BROWSER CATALOG BUILD DIAGNOSTICS REPORT');
  console.log('====================================================');
  console.log(`🎮 Total Catalog Records:          ${totalCatalogRecords.toLocaleString()}`);
  console.log(`🔍 Search Index Total Size:         ${(totalSearchBytes / (1024 * 1024)).toFixed(2)} MB (${searchManifestBuckets.length} buckets)`);
  console.log(`📅 Release Partitions Total Size:   ${(totalReleaseBytes / (1024 * 1024)).toFixed(2)} MB (${releaseManifestBuckets.length} years)`);
  console.log(`📦 Full Detail Chunks:              ${outputChunksList.length} chunks (${(totalCatalogUncompressedBytes / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`🗜️ Master ZIP Archive Size:        ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log('====================================================');
  console.log('✅ Play Atlas Browser Catalog Built Successfully!');
}

runBrowserCatalogBuilder().catch(err => {
  console.error('❌ Browser Catalog Builder Failed:', err);
  process.exit(1);
});
