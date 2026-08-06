import { compactGamesForBucket, importGamesIntoList, pickRandomGame, recordsForBucket } from '../src/services/gameSourceService';
import { createUserList } from '../src/services/userListService';
import { PersonalGameRecord } from '../src/types/personal';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, message: string) => condition ? (passed++, console.log(`  PASS: ${message}`)) : (failed++, console.error(`  FAIL: ${message}`));
const base = (id: number): PersonalGameRecord => ({ schemaVersion: 1, createdAt: '', updatedAt: '', gameId: String(id), numericId: id, ownerships: [], customTags: [], playSessions: [], completionHistory: [], inBacklogQueue: false, catalogSnapshot: { name: `Game ${id}` } });

console.log('Running Game Source Service Tests...');
const playing = { ...base(1), currentPlayStatus: 'playing' as const };
const backlog = { ...base(2), inBacklogQueue: true };
const yuck = { ...base(3), currentPlayStatus: 'dropped' as const, inBacklogQueue: true };
const liked = { ...base(4), interestStatus: 'wanted' as const };
const records = [playing, backlog, yuck, liked];
assert(recordsForBucket(records, 'playing').length === 1, 'Playing bucket selects playing records');
assert(recordsForBucket(records, 'backlog').length === 1, 'Yuck records stay excluded from other buckets');
assert(recordsForBucket(records, 'yuck')[0].numericId === 3, 'Yuck bucket selects dropped records');
assert(compactGamesForBucket(records, 'liked')[0].name === 'Game 4', 'Bucket records convert without inventing catalog metadata');

const imported = importGamesIntoList(createUserList('Imported', 'regular'), [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }, { id: 1, name: 'One' }]);
assert(imported.entries.length === 2, 'Bucket imports ignore duplicate games');
const tierImported = importGamesIntoList(createUserList('Tiered', 'tier'), [{ id: 1, name: 'One' }], 'B');
assert(tierImported.entries[0].tier === 'B', 'Bucket-to-tier imports use the selected destination tier');
assert(pickRandomGame([{ id: 1, name: 'One' }, { id: 2, name: 'Two' }], new Set([1]), () => 0)?.id === 2, 'Randomizer excludes already-seen games');
assert(pickRandomGame([], new Set()) === null, 'Randomizer handles empty sources safely');

console.log(`\nGame Source Service Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
