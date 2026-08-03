import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function verifyIgdbCatalog() {
  const targetArg = process.argv[2] || 'generated/igdb-full-test';
  const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(process.cwd(), targetArg);

  console.log(`🔍 Verifying IGDB Full Catalog Output in: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ VERIFICATION FAILURE: Directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  const manifestPath = path.join(targetDir, 'game_index_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ VERIFICATION FAILURE: Manifest missing at ${manifestPath}`);
    process.exit(1);
  }

  const rawManifestContent = fs.readFileSync(manifestPath, 'utf-8');
  let manifest: any;
  try {
    manifest = JSON.parse(rawManifestContent);
  } catch (err) {
    console.error(`❌ VERIFICATION FAILURE: Manifest JSON is invalid: ${err}`);
    process.exit(1);
  }

  // 1. Structure Validations
  if (manifest.source !== 'igdb') {
    console.error(`❌ VERIFICATION FAILURE: Manifest source is '${manifest.source}' (expected 'igdb').`);
    process.exit(1);
  }

  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    console.error(`❌ VERIFICATION FAILURE: Manifest chunks array is empty or missing.`);
    process.exit(1);
  }

  let totalCalculatedRecords = 0;
  let totalCalculatedBytes = 0;
  const globalSeenIds = new Set<number>();
  let lastChunkLastId = -1;

  let defaultVisibleTotal = 0;
  let hiddenTotal = 0;

  for (let i = 0; i < manifest.chunks.length; i++) {
    const chunkInfo = manifest.chunks[i];
    const chunkFilename = path.basename(chunkInfo.file);
    const chunkPath = path.join(targetDir, chunkFilename);

    if (!fs.existsSync(chunkPath)) {
      console.error(`❌ VERIFICATION FAILURE: Chunk file missing: ${chunkPath}`);
      process.exit(1);
    }

    const rawChunkContent = fs.readFileSync(chunkPath);
    const calculatedHash = computeSha256(rawChunkContent);

    if (calculatedHash !== chunkInfo.sha256) {
      console.error(`❌ VERIFICATION FAILURE: Hash mismatch for ${chunkFilename}! Manifest: ${chunkInfo.sha256}, Calculated: ${calculatedHash}`);
      process.exit(1);
    }

    if (rawChunkContent.length !== chunkInfo.byteSize) {
      console.error(`❌ VERIFICATION FAILURE: Byte size mismatch for ${chunkFilename}! Manifest: ${chunkInfo.byteSize}, Actual: ${rawChunkContent.length}`);
      process.exit(1);
    }

    let records: any[];
    try {
      records = JSON.parse(rawChunkContent.toString('utf-8'));
    } catch (err) {
      console.error(`❌ VERIFICATION FAILURE: Chunk ${chunkFilename} contains invalid JSON: ${err}`);
      process.exit(1);
    }

    if (records.length !== chunkInfo.recordCount) {
      console.error(`❌ VERIFICATION FAILURE: Record count mismatch for ${chunkFilename}! Manifest: ${chunkInfo.recordCount}, Parsed: ${records.length}`);
      process.exit(1);
    }

    totalCalculatedRecords += records.length;
    totalCalculatedBytes += rawChunkContent.length;

    const firstRecordId = records[0].sourceId;
    const lastRecordId = records[records.length - 1].sourceId;

    if (firstRecordId !== chunkInfo.firstSourceId || lastRecordId !== chunkInfo.lastSourceId) {
      console.error(`❌ VERIFICATION FAILURE: ID bounds mismatch for ${chunkFilename}! Manifest: [${chunkInfo.firstSourceId}, ${chunkInfo.lastSourceId}], Actual: [${firstRecordId}, ${lastRecordId}]`);
      process.exit(1);
    }

    if (i > 0 && firstRecordId <= lastChunkLastId) {
      console.error(`❌ VERIFICATION FAILURE: Overlapping chunk range detected at ${chunkFilename}! Current first ID ${firstRecordId} <= previous last ID ${lastChunkLastId}`);
      process.exit(1);
    }
    lastChunkLastId = lastRecordId;

    // Check individual records
    let prevRecordId = -1;
    for (const r of records) {
      if (!r.id || !r.name || typeof r.name !== 'string') {
        console.error(`❌ VERIFICATION FAILURE: Record missing required ID or name in ${chunkFilename}:`, r);
        process.exit(1);
      }

      if (globalSeenIds.has(r.sourceId)) {
        console.error(`❌ VERIFICATION FAILURE: Duplicate IGDB source ID ${r.sourceId} detected in ${chunkFilename}!`);
        process.exit(1);
      }
      globalSeenIds.add(r.sourceId);

      if (r.sourceId <= prevRecordId) {
        console.error(`❌ VERIFICATION FAILURE: Non-ascending ID order inside ${chunkFilename}: ID ${r.sourceId} <= ${prevRecordId}`);
        process.exit(1);
      }
      prevRecordId = r.sourceId;

      if (r.defaultVisible) defaultVisibleTotal++;
      else hiddenTotal++;
    }
  }

  // 2. Global Totals Verification
  if (totalCalculatedRecords !== manifest.recordCount) {
    console.error(`❌ VERIFICATION FAILURE: Manifest recordCount (${manifest.recordCount}) !== Sum of chunks (${totalCalculatedRecords})`);
    process.exit(1);
  }

  if (totalCalculatedBytes !== manifest.totalUncompressedBytes) {
    console.error(`❌ VERIFICATION FAILURE: Manifest totalUncompressedBytes (${manifest.totalUncompressedBytes}) !== Sum of chunks (${totalCalculatedBytes})`);
    process.exit(1);
  }

  if (manifest.chunks.length !== manifest.chunkCount) {
    console.error(`❌ VERIFICATION FAILURE: Manifest chunkCount (${manifest.chunkCount}) !== chunks array length (${manifest.chunks.length})`);
    process.exit(1);
  }

  if (defaultVisibleTotal + hiddenTotal !== manifest.recordCount) {
    console.error(`❌ VERIFICATION FAILURE: defaultVisibleTotal (${defaultVisibleTotal}) + hiddenTotal (${hiddenTotal}) !== recordCount (${manifest.recordCount})`);
    process.exit(1);
  }

  // 3. Security Leak Check
  const tokenRegex = /access_token|bearer/i;
  if (tokenRegex.test(rawManifestContent)) {
    console.error('❌ SECURITY FAILURE: Access token string detected in manifest JSON!');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('📊 IGDB FULL CATALOG VERIFICATION REPORT');
  console.log('====================================================');
  console.log(`📁 Target Directory:        ${targetDir}`);
  console.log(`📦 Manifest Chunks:         ${manifest.chunkCount}`);
  console.log(`🎮 Total Verified Records:  ${totalCalculatedRecords}`);
  console.log(`💾 Total Verified Size:     ${(totalCalculatedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`👁️ Default-Visible Records:  ${defaultVisibleTotal}`);
  console.log(`📦 Hidden Records:           ${hiddenTotal}`);
  console.log(`🔒 SHA-256 Hashes:          All ${manifest.chunkCount} chunk hashes verified!`);
  console.log('====================================================');
  console.log('✅ Independent Catalog Verification Passed Cleanly!');
}

verifyIgdbCatalog().catch(err => {
  console.error('❌ Catalog Verification Failed:', err);
  process.exit(1);
});
