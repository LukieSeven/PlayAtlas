import { excludeYuckedCatalogRecords, getYuckedNumericIds, isYucked } from '../src/utils/personalGameVisibility';
import { PersonalGameRecord } from '../src/types/personal';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed += 1;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed += 1;
    console.error(`  ❌ FAIL: ${message}`);
  }
};

const record = (numericId: number, currentPlayStatus?: PersonalGameRecord['currentPlayStatus']): PersonalGameRecord => ({
  id: `personal_igdb_${numericId}`,
  gameId: `igdb_${numericId}`,
  numericId,
  ownerships: [],
  currentPlayStatus,
  customTags: [],
  playSessions: [],
  completionHistory: [],
  inBacklogQueue: false,
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
});

console.log('🧪 Running Yuck Visibility Tests...');

const liked = record(101);
liked.interestStatus = 'wanted';
const yucked = record(202, 'dropped');

assert(isYucked(yucked), 'Dropped persistence state is interpreted as Yuck!');
assert(!isYucked(liked), 'Liked games are not interpreted as Yuck!');
assert(getYuckedNumericIds([liked, yucked]).has(202), 'Yuck IDs are derived from persistent personal records');

const visible = excludeYuckedCatalogRecords(
  [
    { id: 101, name: 'Liked Game' },
    { id: 202, name: 'Hidden Game' },
    { id: 303, name: 'Untracked Game' },
  ],
  [liked, yucked],
);

assert(visible.map(game => game.id).join(',') === '101,303', 'Yuck games are excluded while liked and untracked games remain');

console.log(`\n📊 Yuck Visibility Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
