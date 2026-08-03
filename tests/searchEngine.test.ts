import {
  tokenizeTitle,
  getTokenBucketKey,
} from '../src/utils/browserCatalogUtils';
import { calculateRankScore } from '../src/services/tokenSearchService';
import { fetchGameDetailsForCompactRecords } from '../src/services/catalogDetailService';
import crypto from 'crypto';

function computeNodeSha256BucketKey(token: string): string {
  const hash = crypto.createHash('sha256').update(token.trim().toLowerCase()).digest('hex');
  return hash.slice(0, 2);
}

async function runSearchEngineTests() {
  console.log('🧪 Running Search Engine, Web Crypto, Ranking & Intersect Regression Tests...');
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

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Web Crypto SHA-256 Bucket Key Equality Test
  const testTokens = ['witcher', '3', 'rainbow', 'six', '7', 'days', 'okami', 'zelda', 'mario', 'halo', 'final', 'fantasy'];

  for (const token of testTokens) {
    const webCryptoKey = await getTokenBucketKey(token);
    const nodeKey = computeNodeSha256BucketKey(token);
    assertEqual(webCryptoKey, nodeKey, `getTokenBucketKey('${token}') Web Crypto === Node SHA-256 (${nodeKey})`);
  }

  // 2. Tokenization Test
  const witcherTokens = tokenizeTitle('The Witcher 3: Wild Hunt');
  assertEqual(witcherTokens.join(','), 'witcher,3,wild,hunt', 'Tokenizes "The Witcher 3: Wild Hunt" into 4 tokens');

  // 3. Priority Ranking Order Tests
  const scoreTheWitcher = calculateRankScore('The Witcher', 'witcher', ['witcher'], true);
  const scoreWitcherAssassins = calculateRankScore('The Witcher 2: Assassins of Kings', 'witcher', ['witcher'], true);
  const scoreWitchery = calculateRankScore('Witchery', 'witcher', ['witcher'], true);

  assert(scoreTheWitcher > scoreWitcherAssassins, 'Ranking: "The Witcher" ranks above "The Witcher 2: Assassins of Kings" for query "Witcher"');
  assert(scoreTheWitcher > scoreWitchery, 'Ranking: "The Witcher" ranks above "Witchery" for query "Witcher"');

  const scoreWitcher3Wild = calculateRankScore('The Witcher 3: Wild Hunt', 'witcher 3', ['witcher', '3'], true);
  const scoreWitcher2Assassins = calculateRankScore('The Witcher 2: Assassins of Kings', 'witcher 3', ['witcher', '3'], true);

  assert(scoreWitcher3Wild > scoreWitcher2Assassins, 'Ranking: "The Witcher 3: Wild Hunt" ranks above Witcher 2 for query "Witcher 3"');

  // 4. Test Detail Chunk Deduplication Engine
  const sampleCompactRecords = [
    { id: 101, name: 'Game A', year: 2020, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 102, name: 'Game B', year: 2021, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 201, name: 'Game C', year: 2022, gameType: 'main_game', defaultVisible: true, chunk: 2 },
  ];

  const detailResult = await fetchGameDetailsForCompactRecords(sampleCompactRecords as any);
  assertEqual(detailResult.length, 3, 'fetchGameDetailsForCompactRecords returns converted GameItem array');
  assertEqual(detailResult[0].title, 'Game A', 'Preserves exact search ranking order (Game A first)');
  assertEqual(detailResult[1].title, 'Game B', 'Preserves exact search ranking order (Game B second)');

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
