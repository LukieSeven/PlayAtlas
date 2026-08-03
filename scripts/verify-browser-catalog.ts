import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function verifyBrowserCatalog() {
  const targetArg = process.argv[2] || 'generated/browser-catalog-test';
  const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(process.cwd(), targetArg);

  console.log(`🔍 Verifying Browser Catalog Output in: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ VERIFICATION FAILURE: Output directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  // 1. Verify Browser Catalog Manifest
  const browserManifestPath = path.join(targetDir, 'browser_catalog_manifest.json');
  if (!fs.existsSync(browserManifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: browser_catalog_manifest.json missing at ${browserManifestPath}`);
    process.exit(1);
  }

  const browserManifest = JSON.parse(fs.readFileSync(browserManifestPath, 'utf-8'));
  if (browserManifest.source !== 'igdb') {
    console.error(`❌ VERIFICATION FAILURE: Invalid manifest source '${browserManifest.source}'.`);
    process.exit(1);
  }

  // 2. Verify Full Detail Chunks
  const validChunkPaths = new Set<string>();
  const chunkSourceIdMap = new Map<number, string>();
  let totalChunkRecords = 0;

  for (const chunkInfo of browserManifest.fullCatalog.chunks) {
    const chunkRelPath = chunkInfo.file; // e.g. "chunks/game_index_0001.json"
    validChunkPaths.add(chunkRelPath);

    const chunkAbsPath = path.join(targetDir, chunkRelPath);
    if (!fs.existsSync(chunkAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Full detail chunk missing: ${chunkAbsPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(chunkAbsPath);
    const calculatedHash = computeSha256(rawBuffer);
    if (calculatedHash !== chunkInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for ${chunkRelPath}! Manifest: ${chunkInfo.sha256}, Actual: ${calculatedHash}`);
      process.exit(1);
    }

    const records: any[] = JSON.parse(rawBuffer.toString('utf-8'));
    if (records.length !== chunkInfo.recordCount) {
      console.error(`❌ VERIFICATION FAILURE: Record count mismatch for ${chunkRelPath}! Manifest: ${chunkInfo.recordCount}, Parsed: ${records.length}`);
      process.exit(1);
    }

    totalChunkRecords += records.length;
    for (const r of records) {
      chunkSourceIdMap.set(r.sourceId, chunkRelPath);
    }
  }

  if (totalChunkRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total chunk records (${totalChunkRecords}) !== manifest catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 3. Verify Search Index & Manifest
  const searchManifestPath = path.join(targetDir, browserManifest.searchManifest);
  if (!fs.existsSync(searchManifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: Search manifest missing: ${searchManifestPath}`);
    process.exit(1);
  }

  const searchManifest = JSON.parse(fs.readFileSync(searchManifestPath, 'utf-8'));
  const globalSearchIds = new Set<number>();
  let totalSearchRecords = 0;

  for (const bucketInfo of searchManifest.buckets) {
    const bucketAbsPath = path.join(targetDir, bucketInfo.file);
    if (!fs.existsSync(bucketAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Search bucket missing: ${bucketAbsPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(bucketAbsPath);
    const calculatedHash = computeSha256(rawBuffer);
    if (calculatedHash !== bucketInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for search bucket ${bucketInfo.file}! Manifest: ${bucketInfo.sha256}, Actual: ${calculatedHash}`);
      process.exit(1);
    }

    const records: any[] = JSON.parse(rawBuffer.toString('utf-8'));
    totalSearchRecords += records.length;

    for (const r of records) {
      if (globalSearchIds.has(r.sourceId)) {
        console.error(`❌ VERIFICATION FAILURE: Duplicate sourceId ${r.sourceId} in search bucket ${bucketInfo.file}`);
        process.exit(1);
      }
      globalSearchIds.add(r.sourceId);

      if (!validChunkPaths.has(r.dataChunk)) {
        console.error(`❌ VERIFICATION FAILURE: Search record ${r.id} points to invalid dataChunk: ${r.dataChunk}`);
        process.exit(1);
      }
    }
  }

  if (totalSearchRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total search records (${totalSearchRecords}) !== catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 4. Verify Release Partitions & Manifest
  const releaseManifestPath = path.join(targetDir, browserManifest.releaseManifest);
  if (!fs.existsSync(releaseManifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: Release manifest missing: ${releaseManifestPath}`);
    process.exit(1);
  }

  const releaseManifest = JSON.parse(fs.readFileSync(releaseManifestPath, 'utf-8'));
  let totalReleaseRecords = 0;

  for (const partInfo of releaseManifest.partitions) {
    const partAbsPath = path.join(targetDir, partInfo.file);
    if (!fs.existsSync(partAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Release partition missing: ${partAbsPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(partAbsPath);
    const calculatedHash = computeSha256(rawBuffer);
    if (calculatedHash !== partInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for release partition ${partInfo.file}! Manifest: ${partInfo.sha256}, Actual: ${calculatedHash}`);
      process.exit(1);
    }

    const records: any[] = JSON.parse(rawBuffer.toString('utf-8'));
    totalReleaseRecords += records.length;

    for (const r of records) {
      if (!validChunkPaths.has(r.dataChunk)) {
        console.error(`❌ VERIFICATION FAILURE: Release record ${r.id} points to invalid dataChunk: ${r.dataChunk}`);
        process.exit(1);
      }
    }
  }

  if (totalReleaseRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total release records (${totalReleaseRecords}) !== catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 5. Verify Master ZIP Archive
  const zipPath = path.join(targetDir, browserManifest.optionalArchive.file);
  if (!fs.existsSync(zipPath)) {
    console.error(`❌ VERIFICATION FAILURE: Master ZIP archive missing: ${zipPath}`);
    process.exit(1);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const calculatedZipHash = computeSha256(zipBuffer);
  if (calculatedZipHash !== browserManifest.optionalArchive.sha256) {
    console.error(`❌ VERIFICATION FAILURE: Master ZIP archive hash mismatch! Manifest: ${browserManifest.optionalArchive.sha256}, Actual: ${calculatedZipHash}`);
    process.exit(1);
  }

  // 6. Credential Leak Verification
  const tokenRegex = /access_token|bearer/i;
  const rawBrowserManifestStr = fs.readFileSync(browserManifestPath, 'utf-8');
  if (tokenRegex.test(rawBrowserManifestStr)) {
    console.error('❌ SECURITY FAILURE: Access token detected in browser catalog manifest!');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('📊 BROWSER CATALOG INDEPENDENT VERIFICATION REPORT');
  console.log('====================================================');
  console.log(`📁 Target Directory:          ${targetDir}`);
  console.log(`🎮 Total Catalog Records:    ${totalChunkRecords.toLocaleString()}`);
  console.log(`🔍 Search Buckets Verified:   ${searchManifest.buckets.length} buckets`);
  console.log(`📅 Release Partitions:        ${releaseManifest.partitions.length} partitions`);
  console.log(`📦 Full Chunks Verified:      ${browserManifest.fullCatalog.chunks.length} chunks`);
  console.log(`🗜️ Master ZIP Verified:      ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🔒 Hashes & Links:            All SHA-256 hashes and dataChunk links verified!`);
  console.log('====================================================');
  console.log('✅ Independent Browser Catalog Verification Passed Cleanly!');
}

verifyBrowserCatalog().catch(err => {
  console.error('❌ Browser Catalog Verification Failed:', err);
  process.exit(1);
});
