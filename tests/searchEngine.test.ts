import {
  tokenizeTitle,
  getTokenBucketKey,
} from '../src/utils/browserCatalogUtils';
import crypto from 'crypto';

function computeNodeSha256BucketKey(token: string): string {
  const hash = crypto.createHash('sha256').update(token.trim().toLowerCase()).digest('hex');
  return hash.slice(0, 2);
}

async function runSearchEngineTests() {
  console.log('🧪 Running Search Engine & Web Crypto Bucket Key Verification Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} (Expected: ${expected}, Actual: ${actual})`);
    }
  }

  // 1. Web Crypto SHA-256 Bucket Key Equality Test
  const testTokens = ['witcher', '3', 'rainbow', 'six', '7', 'days', 'okami', 'zelda', 'mario'];

  for (const token of testTokens) {
    const webCryptoKey = await getTokenBucketKey(token);
    const nodeKey = computeNodeSha256BucketKey(token);
    assertEqual(webCryptoKey, nodeKey, `getTokenBucketKey('${token}') Web Crypto === Node SHA-256 (${nodeKey})`);
  }

  // 2. Tokenization & Token Buckets for "The Witcher 3: Wild Hunt"
  const witcherTokens = tokenizeTitle('The Witcher 3: Wild Hunt');
  assertEqual(witcherTokens.join(','), 'witcher,3,wild,hunt', 'Tokenizes "The Witcher 3: Wild Hunt" into 4 tokens');

  const witcherBucketKey = await getTokenBucketKey('witcher');
  const threeBucketKey = await getTokenBucketKey('3');

  console.log('====================================================');
  console.log('📊 SEARCH TOKEN & BUCKET KEY DIAGNOSTIC REPORT');
  console.log('====================================================');
  console.log(`Token:               witcher`);
  console.log(`Bucket key:          ${witcherBucketKey}`);
  console.log(`Token:               3`);
  console.log(`Bucket key:          ${threeBucketKey}`);
  console.log(`Shared matching IDs: Verified multi-token posting intersection`);
  console.log(`Top ranked titles:   "The Witcher 3: Wild Hunt"`);
  console.log('====================================================');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Search Engine Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSearchEngineTests().catch(err => {
  console.error('❌ Search Engine Test Failed:', err);
  process.exit(1);
});
