import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

function computeSha256(content: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function decompressGzipToJson<T>(buffer: Buffer): T {
  const decompressed = zlib.gunzipSync(buffer);
  return JSON.parse(decompressed.toString('utf-8'));
}

async function verifyBrowserCatalog() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0) {
    console.error('❌ Usage: npm run verify:browser-catalog -- <catalog-directory>');
    process.exit(1);
  }

  if (rawArgs.length > 1) {
    console.error(`❌ ERROR: Multiple target directories supplied (${rawArgs.join(', ')}). Supply exactly one directory.`);
    process.exit(1);
  }

  const targetArg = rawArgs[0];
  const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(process.cwd(), targetArg);

  console.log(`🔍 Verifying Gzipped Browser Catalog Output in: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ VERIFICATION FAILURE: Output directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  // 1. Check Master Browser Catalog Manifest
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

  // 2. Verify Full Detail Chunks (.json.gz)
  const validChunkPaths = new Set<string>();
  let totalChunkRecords = 0;

  for (const chunkInfo of browserManifest.fullCatalog.chunks) {
    const chunkRelPath = chunkInfo.file; // e.g. "chunks/game_index_0001.json.gz"
    validChunkPaths.add(chunkRelPath);

    const chunkAbsPath = path.join(targetDir, chunkRelPath);
    if (!fs.existsSync(chunkAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Full detail compressed chunk missing: ${chunkAbsPath}`);
      process.exit(1);
    }

    const compressedBuffer = fs.readFileSync(chunkAbsPath);
    const calculatedHash = computeSha256(compressedBuffer);
    if (calculatedHash !== chunkInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for ${chunkRelPath}! Manifest: ${chunkInfo.sha256}, Actual: ${calculatedHash}`);
      process.exit(1);
    }

    const records = decompressGzipToJson<any[]>(compressedBuffer);
    totalChunkRecords += records.length;
  }

  if (totalChunkRecords !== browserManifest.catalogRecordCount) {
    console.error(`❌ VERIFICATION FAILURE: Total chunk records (${totalChunkRecords}) !== catalogRecordCount (${browserManifest.catalogRecordCount})`);
    process.exit(1);
  }

  // 3. Verify Token Search Manifest & Games Lookup Files (.json.gz)
  const searchManifestPath = path.join(targetDir, browserManifest.searchManifest);
  if (!fs.existsSync(searchManifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: Token search manifest missing: ${searchManifestPath}`);
    process.exit(1);
  }

  const tokenManifest = JSON.parse(fs.readFileSync(searchManifestPath, 'utf-8'));
  const lookupGameIds = new Map<number, number>();
  let totalLookupRecords = 0;

  for (const lookupInfo of tokenManifest.lookupFiles) {
    const lookupAbsPath = path.join(targetDir, lookupInfo.file);
    if (!fs.existsSync(lookupAbsPath)) {
      console.error(`❌ VERIFICATION FAILURE: Compact lookup file missing: ${lookupAbsPath}`);
      process.exit(1);
    }

    const compressedBuffer = fs.readFileSync(lookupAbsPath);
    const calculatedHash = computeSha256(compressedBuffer);
    if (calculatedHash !== lookupInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for lookup file ${lookupInfo.file}!`);
      process.exit(1);
    }

    const records = decompressGzipToJson<any[]>(compressedBuffer);
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

  // 4. Verify 256 Token Posting Buckets (.json.gz)
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

    const compressedBuffer = fs.readFileSync(bucketAbsPath);
    const calculatedHash = computeSha256(compressedBuffer);
    if (calculatedHash !== bucketInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for token bucket ${bucketInfo.file}!`);
      process.exit(1);
    }

    const bucketObj = decompressGzipToJson<Record<string, number[]>>(compressedBuffer);
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

  // 5. Verify Subdivided Release Partitions (.json.gz)
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

    const compressedBuffer = fs.readFileSync(partAbsPath);
    const calculatedHash = computeSha256(compressedBuffer);
    if (calculatedHash !== partInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for release partition ${partInfo.file}!`);
      process.exit(1);
    }

    const records = decompressGzipToJson<any[]>(compressedBuffer);
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

  // 6. Verify ZIP Archive Excluded from Published Pages Output
  const zipInPages = path.join(targetDir, 'play-atlas-full-catalog.zip');
  if (fs.existsSync(zipInPages)) {
    console.error(`❌ VERIFICATION FAILURE: Master ZIP archive play-atlas-full-catalog.zip MUST NOT be present in published Pages directory!`);
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
  console.log('📊 GZIPPED BROWSER CATALOG INDEPENDENT VERIFICATION');
  console.log('====================================================');
  console.log(`📁 Target Directory:            ${targetDir}`);
  console.log(`🎮 Total Verified Games:        ${totalLookupRecords.toLocaleString()}`);
  console.log(`🔤 Unique Search Tokens:        ${globalTokens.size.toLocaleString()}`);
  console.log(`🎮 Compact Lookup Files:        ${tokenManifest.lookupFiles.length} files (.json.gz)`);
  console.log(`🔤 Token Buckets Verified:      ${tokenManifest.tokenBuckets.length} buckets (.json.gz)`);
  console.log(`📅 Release Partitions:          ${releaseManifest.partitions.length} partitions (.json.gz)`);
  console.log(`📦 Full Chunks Verified:        ${browserManifest.fullCatalog.chunks.length} chunks (.json.gz)`);
  console.log(`🗜️ ZIP Archive Exclusion:       CONFIRMED ABSENT from Pages output!`);
  console.log(`🔒 Hashes & Decompression:     All SHA-256 hashes & gzip decompressions verified!`);
  console.log('====================================================');
  console.log('✅ Gzipped Browser Catalog Verification Passed Cleanly!');
}

verifyBrowserCatalog().catch(err => {
  console.error('❌ Browser Catalog Verification Failed:', err);
  process.exit(1);
});
