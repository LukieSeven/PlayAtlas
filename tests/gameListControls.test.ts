import { matchesCatalogFormat, matchesCatalogPlatformFamily, sortCatalogGames } from '../src/utils/gameListControls';
import { CompactGameLookupRecord } from '../src/types/catalog';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
};

console.log('🧪 Running Catalog Grid Control Tests...');

const games: CompactGameLookupRecord[] = [
  { id: 90001, name: 'PC Game', year: 2024, gameType: 'main_game', platforms: ['PC (Microsoft Windows)'] },
  { id: 6, name: 'Console Game', year: 2022, gameType: 'remake', platforms: ['PlayStation 5'] },
  { id: 130, name: 'Expansion', year: 2023, gameType: 'standalone_expansion', platforms: ['Nintendo Switch'] },
  { id: 42, name: 'Community Project', year: 2025, gameType: 'mod', platforms: ['Linux'] },
];

assert(matchesCatalogPlatformFamily(games[0], 'pc'), 'Platform filtering uses platform metadata, not the game ID');
assert(!matchesCatalogPlatformFamily(games[1], 'pc'), 'Unrelated platform families are excluded');
assert(matchesCatalogFormat(games[1], 'main_game'), 'Main-game grouping includes remakes');
assert(matchesCatalogFormat(games[2], 'pack'), 'Pack and expansion grouping includes standalone expansions');
assert(matchesCatalogFormat(games[3], 'mod'), 'Mod grouping includes community content');

for (const mode of ['relevance', 'name', 'yearAsc', 'yearDesc'] as const) {
  const sorted = sortCatalogGames(games, mode);
  assert(sorted.length === games.length, `${mode} sorting preserves every result`);
}
assert(sortCatalogGames(games, 'name')[0].name === 'Community Project', 'Alphabetical sorting orders results correctly');
assert(sortCatalogGames(games, 'yearDesc')[0].year === 2025, 'Newest-first sorting orders results correctly');

console.log(`\n📊 Catalog Grid Control Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
