import {
  normalizeSearchQuery,
  tokenizeTitle,
  getTokenBucketKey,
} from '../src/utils/browserCatalogUtils';

export interface TestGameItem {
  id: number;
  name: string;
  year: number | null;
  gameType: string;
  defaultVisible: boolean;
  chunk: number;
}

/**
 * In-memory Search Ranking Engine implementation for unit testing
 */
export function rankSearchQuery(
  queryStr: string,
  postingIndex: Record<string, number[]>,
  lookupTable: Record<number, TestGameItem>
): TestGameItem[] {
  const tokens = tokenizeTitle(queryStr);
  if (tokens.length === 0) return [];

  const normQuery = normalizeSearchQuery(queryStr);

  // 1. Gather matching game IDs per token
  const matchingGamesMap = new Map<number, { matchCount: number; tokenPositions: number[] }>();

  for (const token of tokens) {
    const ids = postingIndex[token] || [];
    for (const id of ids) {
      if (!matchingGamesMap.has(id)) {
        matchingGamesMap.set(id, { matchCount: 0, tokenPositions: [] });
      }
      const item = matchingGamesMap.get(id)!;
      item.matchCount++;

      const game = lookupTable[id];
      if (game) {
        const normTitle = normalizeSearchQuery(game.name);
        const pos = normTitle.indexOf(token);
        item.tokenPositions.push(pos >= 0 ? pos : 999);
      }
    }
  }

  // 2. Score & Rank matching games
  const results: Array<{ game: TestGameItem; score: number }> = [];

  for (const [id, meta] of matchingGamesMap.entries()) {
    const game = lookupTable[id];
    if (!game) continue;

    const normTitle = normalizeSearchQuery(game.name);
    let score = 0;

    // Rule 1: Exact normalized title match (Highest priority)
    if (normTitle === normQuery) {
      score += 10000;
    }
    // Rule 2: Title starts with the query
    else if (normTitle.startsWith(normQuery)) {
      score += 5000;
    }

    // Rule 3: All query tokens present
    if (meta.matchCount === tokens.length) {
      score += 2000;
    }

    // Rule 4: Match count bonus
    score += meta.matchCount * 100;

    // Rule 5: Earlier token position in title
    const minPos = Math.min(...meta.tokenPositions);
    if (minPos < 999) {
      score += Math.max(0, 100 - minPos);
    }

    // Rule 6: Main games over hidden DLC when relevance is otherwise equal
    if (game.defaultVisible) {
      score += 50;
    }

    results.push({ game, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.game);
}

function runSearchEngineTests() {
  console.log('🧪 Running Search Engine Unit Tests...');
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

  // Mock catalog dataset for search engine testing
  const mockGames: TestGameItem[] = [
    { id: 101, name: 'The Witcher 3: Wild Hunt', year: 2015, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 102, name: 'The Witcher 2: Assassins of Kings', year: 2011, gameType: 'main_game', defaultVisible: true, chunk: 1 },
    { id: 103, name: 'The Legend of Zelda: Breath of the Wild', year: 2017, gameType: 'main_game', defaultVisible: true, chunk: 2 },
    { id: 104, name: "Tom Clancy's Rainbow Six Siege", year: 2015, gameType: 'main_game', defaultVisible: true, chunk: 3 },
    { id: 105, name: 'Ōkami HD', year: 2012, gameType: 'remaster', defaultVisible: true, chunk: 4 },
    { id: 106, name: '7 Days to Die', year: 2013, gameType: 'main_game', defaultVisible: true, chunk: 5 },
    { id: 107, name: 'Final Fantasy VII Remake', year: 2020, gameType: 'remake', defaultVisible: true, chunk: 6 },
    { id: 108, name: 'The Witcher 3: Wild Hunt - Blood and Wine', year: 2016, gameType: 'dlc_addon', defaultVisible: false, chunk: 1 },
  ];

  const lookupTable: Record<number, TestGameItem> = {};
  const postingIndex: Record<string, number[]> = {};

  for (const g of mockGames) {
    lookupTable[g.id] = g;
    const tokens = tokenizeTitle(g.name);
    for (const t of tokens) {
      if (!postingIndex[t]) postingIndex[t] = [];
      postingIndex[t].push(g.id);
    }
  }

  // Test 1: "The Witcher 3" -> "witcher"
  const res1 = rankSearchQuery('witcher', postingIndex, lookupTable);
  assert(res1.some(g => g.id === 101), '"The Witcher 3" -> "witcher" finds game');

  // Test 2: "The Witcher 3" -> "witcher 3"
  const res2 = rankSearchQuery('witcher 3', postingIndex, lookupTable);
  assert(res2.length > 0 && res2[0].id === 101, '"The Witcher 3" -> "witcher 3" ranks exact game first');

  // Test 3: "The Legend of Zelda" -> "zelda"
  const res3 = rankSearchQuery('zelda', postingIndex, lookupTable);
  assert(res3.some(g => g.id === 103), '"The Legend of Zelda" -> "zelda"');

  // Test 4: "The Legend of Zelda" -> "legend zelda"
  const res4 = rankSearchQuery('legend zelda', postingIndex, lookupTable);
  assert(res4.some(g => g.id === 103), '"The Legend of Zelda" -> "legend zelda" (multi-token out of order)');

  // Test 5: "Tom Clancy's Rainbow Six" -> "rainbow six"
  const res5 = rankSearchQuery('rainbow six', postingIndex, lookupTable);
  assert(res5.some(g => g.id === 104), '"Tom Clancy\'s Rainbow Six" -> "rainbow six" (punctuation stripped)');

  // Test 6: "Ōkami HD" -> "okami"
  const res6 = rankSearchQuery('okami', postingIndex, lookupTable);
  assert(res6.some(g => g.id === 105), '"Ōkami HD" -> "okami" (unicode diacritic stripped)');

  // Test 7: "7 Days to Die" -> "7 days"
  const res7 = rankSearchQuery('7 days', postingIndex, lookupTable);
  assert(res7.some(g => g.id === 106), '"7 Days to Die" -> "7 days" (numeric token retained)');

  // Test 8: "Final Fantasy VII" -> "fantasy vii"
  const res8 = rankSearchQuery('fantasy vii', postingIndex, lookupTable);
  assert(res8.some(g => g.id === 107), '"Final Fantasy VII" -> "fantasy vii"');

  // Test 9: DLC searchability & ranking
  const res9 = rankSearchQuery('witcher 3', postingIndex, lookupTable);
  assert(res9.some(g => g.id === 108), 'DLC remains searchable ("Blood and Wine")');
  assert(res9.findIndex(g => g.id === 101) < res9.findIndex(g => g.id === 108), 'Main game ranks above DLC when query matches both');

  // Test 10: 256 SHA-256 Token Bucket Hashing
  assert(getTokenBucketKey('witcher').length === 2, 'getTokenBucketKey returns 2 hex chars');
  assert(getTokenBucketKey('zelda') !== getTokenBucketKey('okami'), 'Different tokens produce deterministic hex bucket keys');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Search Engine Unit Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSearchEngineTests();
