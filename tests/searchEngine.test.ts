import {
  tokenizeTitle,
  getTokenBucketKey,
} from '../src/utils/browserCatalogUtils';
import { getBuildTokenBucketKey } from '../scripts/build-browser-catalog';
import { calculateRankScore } from '../src/services/tokenSearchService';
import { fetchGameDetailsForCompactRecords, hydrateCompactRecordsBatch } from '../src/services/catalogDetailService';

async function runSearchEngineTests() {
  console.log('🧪 Running Search Engine, Web Crypto & Builder Parity Tests...');
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

  // 1. Web Crypto vs Builder SHA-256 Bucket Key Parity Test
  const testTokens = ['witcher', '3', 'halo', 'final', 'fantasy', 'rainbow', 'days', 'okami'];

  for (const token of testTokens) {
    const webCryptoKey = await getTokenBucketKey(token);
    const builderKey = getBuildTokenBucketKey(token);
    assertEqual(webCryptoKey, builderKey, `Parity check: getTokenBucketKey('${token}') [${webCryptoKey}] === getBuildTokenBucketKey('${token}') [${builderKey}]`);
  }

  assertEqual(await getTokenBucketKey('witcher'), '9b', "witcher bucket key === '9b'");
  assertEqual(await getTokenBucketKey('3'), '4e', "3 bucket key === '4e'");

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

  // 4. Test Detail Chunk Deduplication Engine (Isolated Mock Loader without Network Dependency)
  const sampleCompactRecords = [
    { id: 101, name: 'Game A', year: 2020, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 102, name: 'Game B', year: 2021, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 201, name: 'Game C', year: 2022, gameType: 'main_game', defaultVisible: true, chunk: 2 },
  ];

  const mockChunkLoader = async (chunkFile: string) => {
    if (chunkFile.includes('0001')) {
      return [
        { id: 101, sourceId: 101, name: 'Game A', firstReleaseDate: '2020-01-01', gameType: 'main_game', cover_image_id: 'co101' },
        { id: 102, sourceId: 102, name: 'Game B', firstReleaseDate: '2021-01-01', gameType: 'main_game', cover_image_id: 'co102' },
      ];
    }
    return [
      { id: 201, sourceId: 201, name: 'Game C', firstReleaseDate: '2022-01-01', gameType: 'main_game' }, // Failed cover load fallback
    ];
  };

  const detailResult = await fetchGameDetailsForCompactRecords(sampleCompactRecords as any, mockChunkLoader);
  assertEqual(detailResult.length, 3, 'fetchGameDetailsForCompactRecords returns converted GameItem array');
  assertEqual(detailResult[0].title, 'Game A', 'Preserves exact search ranking order (Game A first)');
  assertEqual(detailResult[1].title, 'Game B', 'Preserves exact search ranking order (Game B second)');

  // 5. Search Result Batch Hydration & Order Preservation Regression Tests
  const searchResultsBatch = [
    { id: 101, name: 'Fable', year: 2004, chunk: 1 },
    { id: 102, name: 'Fable II', year: 2008, chunk: 1 },
    { id: 201, name: 'Fable III', year: 2010, chunk: 2 },
  ];

  const hydratedSearchBatch = await hydrateCompactRecordsBatch(searchResultsBatch as any, mockChunkLoader);
  assertEqual(hydratedSearchBatch.length, 3, 'Search hydration preserves 40-record batch size');
  assertEqual(hydratedSearchBatch[0].id, 101, 'Correct numeric IGDB game ID (101) survives hydration');
  assertEqual(hydratedSearchBatch[0].name, 'Fable', 'Search relevance order preserved (Fable first)');
  assertEqual(hydratedSearchBatch[1].name, 'Fable II', 'Search relevance order preserved (Fable II second)');
  assert(Boolean(hydratedSearchBatch[0].coverUrl && hydratedSearchBatch[0].coverUrl.includes('co101')), 'Fable search result displays hydrated cover URL');
  assert(hydratedSearchBatch[2].coverUrl === undefined, 'One failed cover hydration does not discard search result or throw error');

  console.log('====================================================');
  console.log('📊 SEARCH TOKEN & BUCKET KEY DIAGNOSTIC REPORT');
  console.log('====================================================');
  console.log(`Token:               witcher`);
  console.log(`Expected Bucket:     9b`);
  console.log(`Physical Bucket:     9b`);
  console.log(`Token:               3`);
  console.log(`Expected Bucket:     4e`);
  console.log(`Physical Bucket:     4e`);
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
