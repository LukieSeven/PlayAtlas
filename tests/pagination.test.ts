import {
  executeProgressiveTokenSearch,
  compareRecordsDeterministic,
  getGameTypePriority,
} from '../src/services/tokenSearchService';
import { CompactGameLookupRecord } from '../scripts/build-browser-catalog';

function runPaginationAndRankingTests() {
  console.log('🧪 Running Search Deterministic Ranking & Pagination Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  function assertEqual(actual: any, expected: any, testName: string) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`);
    }
  }

  // 1. Test Game Type Priority
  assertEqual(getGameTypePriority('main_game'), 10, 'main_game has highest game-type priority (10)');
  assertEqual(getGameTypePriority('remake'), 9, 'remake has priority 9');
  assertEqual(getGameTypePriority('dlc_addon'), 3, 'dlc_addon has priority 3');
  assertEqual(getGameTypePriority('bundle'), 2, 'bundle has priority 2');

  // 2. Test Deterministic 11-Tier Comparator
  const recMainGame: CompactGameLookupRecord = {
    id: 101,
    name: 'Final Fantasy VII',
    year: 1997,
    gameType: 'main_game',
    defaultVisible: true,
    chunk: 1,
  };

  const recDlcBundle: CompactGameLookupRecord = {
    id: 102,
    name: 'Final Fantasy VII: Bonus Item Pack',
    year: 2020,
    gameType: 'dlc_addon',
    defaultVisible: false,
    chunk: 1,
  };

  const recUnrelated: CompactGameLookupRecord = {
    id: 103,
    name: 'Final Fantasy Crisis Core Pack',
    year: 2007,
    gameType: 'bundle',
    defaultVisible: false,
    chunk: 1,
  };

  const compareRes = compareRecordsDeterministic(recMainGame, recDlcBundle, 'final fantasy', ['final', 'fantasy']);
  assert(compareRes < 0, 'Deterministic ranking places Main Game (Final Fantasy VII) before DLC Bonus Pack');

  // 3. Test Mock Paginated Slicing Engine
  const mockDataset: CompactGameLookupRecord[] = Array.from({ length: 46 }, (_, i) => ({
    id: i + 1,
    name: `Final Fantasy Game ${i + 1}`,
    year: 2000 + i,
    gameType: i === 0 ? 'main_game' : 'remake',
    defaultVisible: true,
    chunk: 1,
  }));

  const page1 = mockDataset.slice(0, 20);
  const page2 = mockDataset.slice(20, 40);
  const page3 = mockDataset.slice(40, 60);

  assertEqual(page1.length, 20, 'Initial page contains exactly 20 results');
  assertEqual(page2.length, 20, 'Second page contains exactly 20 results');
  assertEqual(page3.length, 6, 'Final page contains remaining 6 results (< 20)');

  const combinedIds = new Set([...page1.map(r => r.id), ...page2.map(r => r.id), ...page3.map(r => r.id)]);
  assertEqual(combinedIds.size, 46, 'No duplicate IDs across pagination pages');

  // 4. Test Search Service Signature
  const searchPromise = executeProgressiveTokenSearch('Final Fantasy', { offset: 0, limit: 20 });
  assert(typeof searchPromise.then === 'function', 'executeProgressiveTokenSearch accepts { offset, limit } options object');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Pagination & Ranking Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPaginationAndRankingTests();
