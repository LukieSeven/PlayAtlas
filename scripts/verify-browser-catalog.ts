import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function verifyBrowserCatalog() {
  const targetArg = process.argv[2] || 'generated/browser-catalog-test';
  const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(process.cwd(), targetArg);

  console.log(`🔍 Verifying Compact Token Browser Catalog in: ${targetDir}`);

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
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for ${chunkRelPath}!`);
      process.exit(1);
    }

    const records: any[] = JSON.parse(rawBuffer.toString('utf-8'));
    totalChunkRecords += records.length;
  }

  if (totalChunkRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total chunk records (${totalChunkRecords}) !== manifest catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 3. Verify Token Search Manifest & Games Lookup Files
  const searchManifestPath = path.join(targetDir, browserManifest.searchManifest);
  if (!fs.existsSync(searchManifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: Token search manifest missing: ${searchManifestPath}`);
    process.exit(1);
  }

  const tokenManifest = JSON.parse(fs.readFileSync(searchManifestPath, 'utf-8'));
  const lookupGameIds = new Map<number, number>(); // ID -> chunk ID
  let totalLookupRecords = 0;

  for (const lookupInfo of tokenManifest.lookupFiles) {
    const lookupAbsPath = path.join(targetDir, lookupInfo.file);
    if (!fs.existsSync(lookupAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Compact lookup file missing: ${lookupAbsPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(lookupAbsPath);
    const calculatedHash = computeSha256(rawBuffer);
    if (calculatedHash !== lookupInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for lookup file ${lookupInfo.file}!`);
      process.exit(1);
    }

    const records: any[] = JSON.parse(rawBuffer.toString('utf-8'));
    totalLookupRecords += records.length;

    let prevId = -1;
    for (const r of records) {
      if (typeof r.id !== 'number' || !r.name || typeof r.name !== 'string') {
        console.error(`❌ VERIFICATION FAILURE: Invalid lookup record in ${lookupInfo.file}:`, r);
        process.exit(1);
      }

      if (lookupGameIds.has(r.id)) {
        console.error(`❌ VERIFICATION FAILURE: Duplicate IGDB ID ${r.id} in lookup file ${lookupInfo.file}`);
        process.exit(1);
      }
      lookupGameIds.set(r.id, r.chunk);

      if (r.id <= prevId) {
        console.error(`❌ VERIFICATION FAILURE: Non-ascending ID order in lookup file ${lookupInfo.file}: ID ${r.id} <= ${prevId}`);
        process.exit(1);
      }
      prevId = r.id;

      const mappedChunkPath = tokenManifest.chunkFiles[r.chunk];
      if (!mappedChunkPath || !validChunkPaths.has(mappedChunkPath)) {
        console.error(`❌ VERIFICATION FAILURE: Lookup record ${r.id} maps to invalid chunk ID ${r.chunk}`);
        process.exit(1);
      }
    }
  }

  if (totalLookupRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total lookup records (${totalLookupRecords}) !== catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 4. Verify 256 Token Posting Buckets
  if (!Array.isArray(tokenManifest.tokenBuckets) || tokenManifest.tokenBuckets.length !== 256) {
    console.error(`❌ VERIFICATION FAILURE: tokenBuckets length is ${tokenManifest.tokenBuckets?.length} (expected 256).`);
    process.exit(1);
  }

  const globalTokens = new Set<string>();

  for (const bucketInfo of tokenManifest.tokenBuckets) {
    const bucketAbsPath = path.join(targetDir, bucketInfo.file);
    if (!fs.existsSync(bucketAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Token bucket file missing: ${bucketAbsPath}`);
      process.exit(1);
    }

    const rawBuffer = fs.readFileSync(bucketAbsPath);
    const calculatedHash = computeSha256(rawBuffer);
    if (calculatedHash !== bucketInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for token bucket ${bucketInfo.file}!`);
      process.exit(1);
    }

    const bucketObj: Record<string, number[]> = JSON.parse(rawBuffer.toString('utf-8'));
    for (const [token, ids] of Object.entries(bucketObj)) {
      globalTokens.add(token);
      for (const id of ids) {
        if (!lookupGameIds.has(id)) {
          console.error(`❌ VERIFICATION FAILURE: Token '${token}' points to non-existent game ID ${id} in ${bucketInfo.file}`);
          process.exit(1);
        }
      }
    }
  }

  if (globalTokens.size !== tokenManifest.uniqueTokenCount) {
    console.error(`❌ VERIFICATION FAILURE: Verified unique tokens (${globalTokens.size}) !== tokenManifest.uniqueTokenCount (${tokenManifest.uniqueTokenCount})`);
    process.exit(1);
  }

  // 5. Verify Subdivided Release Partitions
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
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for release partition ${partInfo.file}!`);
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

  // 6. Verify Master ZIP Archive
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

  // 7. Security Leak Check
  const tokenRegex = /access_token|bearer/i;
  const rawBrowserManifestStr = fs.readFileSync(browserManifestPath, 'utf-8');
  if (tokenRegex.test(rawBrowserManifestStr)) {
    console.error('❌ SECURITY FAILURE: Access token detected in browser catalog manifest!');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('📊 REVISED BROWSER CATALOG VERIFICATION REPORT');
  console.log('====================================================');
  console.log(`📁 Target Directory:          ${targetDir}`);
  console.log(`🎮 Total Verified Games:      ${totalLookupRecords.toLocaleString()}`);
  console.log(`🔤 Unique Search Tokens:      ${globalTokens.size.toLocaleString()}`);
  console.log(`🎮 Compact Lookup Files:      ${tokenManifest.lookupFiles.length} files`);
  console.log(`🔤 Token Buckets Verified:    ${tokenManifest.tokenBuckets.length} buckets`);
  console.log(`📅 Release Partitions:        ${releaseManifest.partitions.length} partitions`);
  console.log(`📦 Full Chunks Verified:      ${browserManifest.fullCatalog.chunks.length} chunks`);
  console.log(`🗜️ Master ZIP Verified:      ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🔒 Hashes & Links:            All SHA-256 hashes and numeric chunk IDs verified!`);
  console.log('====================================================');
  console.log('✅ Independent Browser Catalog Verification Passed Cleanly!');
}

verifyBrowserCatalog().catch(err => {
  console.error('❌ Browser Catalog Verification Failed:', err);
  process.exit(1);
});
