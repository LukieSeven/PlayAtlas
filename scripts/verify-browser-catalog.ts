import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

function computeSha256(content: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getBuildTokenBucketKey(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token.trim().toLowerCase(), 'utf8')
    .digest('hex')
    .slice(0, 2);
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
  const lookupGameIds = new Map<number, { name: string; chunk: number }>();
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
      lookupGameIds.set(r.id, { name: r.name, chunk: r.chunk });

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

  // 4. Verify 256 Token Posting Buckets & Distribution Guardrails
  if (!Array.isArray(tokenManifest.tokenBuckets) || tokenManifest.tokenBuckets.length !== 256) {
    console.error(`❌ VERIFICATION FAILURE: tokenBuckets length is ${tokenManifest.tokenBuckets?.length} (expected 256).`);
    process.exit(1);
  }

  const globalTokens = new Set<string>();
  let sumManifestTokenCount = 0;
  let occupiedBucketsCount = 0;
  let bucket00TokenCount = 0;

  let witcherPostingList: number[] | null = null;
  let threePostingList: number[] | null = null;

  for (const bucketInfo of tokenManifest.tokenBuckets) {
    sumManifestTokenCount += bucketInfo.tokenCount;
    if (bucketInfo.tokenCount > 0) occupiedBucketsCount++;
    if (bucketInfo.key === '00') bucket00TokenCount = bucketInfo.tokenCount;

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

      // Verify token SHA-256 bucket key alignment
      const expectedKey = getBuildTokenBucketKey(token);
      if (expectedKey !== bucketInfo.key) {
        console.error(`❌ VERIFICATION FAILURE: Token '${token}' located in bucket '${bucketInfo.key}' but expected bucket is '${expectedKey}'!`);
        process.exit(1);
      }

      if (token === 'witcher') witcherPostingList = ids;
      if (token === '3') threePostingList = ids;

      for (const id of ids) {
        if (!lookupGameIds.has(id)) {
          console.error(`❌ VERIFICATION FAILURE: Token '${token}' points to non-existent game ID ${id} in ${bucketInfo.file}`);
          process.exit(1);
        }
      }
    }
  }

  // --- TOKEN DISTRIBUTION GUARDRAIL CHECKS ---
  if (sumManifestTokenCount !== tokenManifest.uniqueTokenCount) {
    console.error(`❌ VERIFICATION FAILURE: Sum of manifest tokenCount values (${sumManifestTokenCount}) !== uniqueTokenCount (${tokenManifest.uniqueTokenCount})`);
    process.exit(1);
  }

  if (occupiedBucketsCount < 200) {
    console.error(`❌ VERIFICATION FAILURE: Occupied token buckets count (${occupiedBucketsCount}/256) is below required 200 threshold! Buckets are improperly distributed.`);
    process.exit(1);
  }

  const bucket00Ratio = bucket00TokenCount / globalTokens.size;
  if (bucket00Ratio > 0.05) {
    console.error(`❌ VERIFICATION FAILURE: Bucket 00 contains ${(bucket00Ratio * 100).toFixed(1)}% of all tokens! Hashing fallback error detected.`);
    process.exit(1);
  }

  if (!witcherPostingList || witcherPostingList.length === 0) {
    console.error(`❌ VERIFICATION FAILURE: 'witcher' posting list is missing or empty in tokens_06.json.gz!`);
    process.exit(1);
  }

  if (!threePostingList || threePostingList.length === 0) {
    console.error(`❌ VERIFICATION FAILURE: '3' posting list is missing or empty in tokens_ca.json.gz!`);
    process.exit(1);
  }

  // Verify multi-token intersection for "Witcher 3"
  const threePostingSet = new Set(threePostingList);
  const witcher3IntersectedIds = witcherPostingList.filter(id => threePostingSet.has(id));

  if (witcher3IntersectedIds.length === 0) {
    console.error(`❌ VERIFICATION FAILURE: Intersected IDs for 'witcher 3' is empty!`);
    process.exit(1);
  }

  const matchedTitles = witcher3IntersectedIds.map(id => lookupGameIds.get(id)?.name || '');
  const hasWitcher3WildHunt = matchedTitles.some(t => t.includes('Witcher 3: Wild Hunt'));

  if (!hasWitcher3WildHunt) {
    console.error(`❌ VERIFICATION FAILURE: 'The Witcher 3: Wild Hunt' was not found in 'witcher 3' search intersection results!`);
    process.exit(1);
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

  console.log('====================================================');
  console.log('📊 GZIPPED BROWSER CATALOG INDEPENDENT VERIFICATION');
  console.log('====================================================');
  console.log(`📁 Target Directory:            ${targetDir}`);
  console.log(`🎮 Total Verified Games:        ${totalLookupRecords.toLocaleString()}`);
  console.log(`🔤 Unique Search Tokens:        ${globalTokens.size.toLocaleString()}`);
  console.log(`🔤 Occupied Token Buckets:      ${occupiedBucketsCount}/256`);
  console.log(`🧙 'witcher' Posting Count:      ${witcherPostingList.length} (in tokens_06.json.gz)`);
  console.log(`3️⃣ '3' Posting Count:            ${threePostingList.length} (in tokens_ca.json.gz)`);
  console.log(`⚔️ 'witcher 3' Intersect Count: ${witcher3IntersectedIds.length} titles`);
  console.log(`👑 'The Witcher 3: Wild Hunt':  CONFIRMED PRESENT in search intersection!`);
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
