import { addGameToUserList, createUserList, MAX_TIER_ROWS, normalizeUserList, removeGameFromUserList } from '../src/services/userListService';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, message: string) => {
  if (condition) { passed++; console.log(`  ✅ PASS: ${message}`); }
  else { failed++; console.error(`  ❌ FAIL: ${message}`); }
};

console.log('🧪 Running User List Service Tests...');
const regular = createUserList('Favorites', 'regular');
const withGame = addGameToUserList(regular, { id: 1, name: 'Example Game' });
assert(withGame.entries.length === 1, 'Regular lists accept catalog games');
assert(withGame.entries[0].tier === undefined, 'Regular list entries do not receive tiers');
assert(addGameToUserList(withGame, { id: 1, name: 'Example Game' }) === withGame, 'Duplicate games are rejected');
assert(removeGameFromUserList(withGame, 1).entries.length === 0, 'Games can be removed');

const tier = createUserList('Ranking', 'tier');
const tierWithGame = addGameToUserList(tier, { id: 2, name: 'Tier Game' }, 'A');
assert(tierWithGame.entries[0].tier === 'A', 'Tier lists retain selected tier assignment');
assert(createUserList('', 'tier').name === 'Untitled Tier List', 'Tier lists receive a safe default name');
assert(createUserList('', 'tier').tiers?.length === 6, 'New tier lists receive six editable default rows');
const movedTierGame = addGameToUserList(tierWithGame, { id: 2, name: 'Tier Game' }, 'B');
assert(movedTierGame.entries.length === 1 && movedTierGame.entries[0].tier === 'B', 'Selecting an existing game moves it to the active tier without duplication');
const oversizedTierList = normalizeUserList({
  ...tier,
  tiers: Array.from({ length: 20 }, (_, index) => ({ id: `tier_${index}`, label: `Tier ${index}` })),
});
assert(oversizedTierList.tiers?.length === MAX_TIER_ROWS, 'Tier normalization enforces the twelve-row maximum');

console.log(`\n📊 User List Service Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
