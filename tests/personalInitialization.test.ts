import { personalGameStore } from '../src/services/personalGameStore';
import { personalDataRepository } from '../src/services/personalDataRepository';
import { PersonalGameRecord } from '../src/types/personal';

console.log('🧪 Running Personal Library Refresh & Initialization Unit Tests...\n');

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedCount++;
  }
}

async function runInitializationTests() {
  const originalGetAll = personalDataRepository.getAll.bind(personalDataRepository);
  const originalPut = personalDataRepository.put.bind(personalDataRepository);
  const originalDelete = personalDataRepository.delete.bind(personalDataRepository);

  const simulatedDbRecords: PersonalGameRecord[] = [
    {
      schemaVersion: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      gameId: 'igdb_92550',
      numericId: 92550,
      ownerships: [{ platformId: 169, ownershipType: 'physical' }],
      customTags: ['classic-rpg'],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      userNotes: 'Fable Notes',
      interestStatus: 'wanted',
      catalogSnapshot: { name: 'Fable', releaseYear: 2004, coverUrl: 'https://images.igdb.com/co1x77.jpg' },
    },
  ];

  // Mock repository for Node CLI environment without browser IndexedDB
  personalDataRepository.getAll = async () => [...simulatedDbRecords];
  personalDataRepository.put = async () => {};
  personalDataRepository.delete = async () => {};

  // Step 1: Reset store to simulate cold start / page refresh
  personalGameStore.resetForTesting();

  // Step 2 & 3: Call getAllRecords() BEFORE async init() completes
  const snapshotBeforeInit = personalGameStore.getAllRecords();
  assert(Array.isArray(snapshotBeforeInit), 'getAllRecords() returns array before init finishes');
  assert(snapshotBeforeInit.length === 0, 'Initial snapshot before init is empty []');

  // Step 8 setup: Global subscriber
  let globalNotificationCount = 0;
  const unsubscribeGlobal = personalGameStore.subscribe(() => {
    globalNotificationCount++;
  });

  // Step 4: Complete async init()
  await personalGameStore.init();

  // Step 5, 6 & 7: Confirm snapshot after init contains loaded records and has a NEW reference
  const snapshotAfterInit = personalGameStore.getAllRecords();
  assert(snapshotAfterInit.length === 1, 'Snapshot after init contains loaded records');
  assert(snapshotBeforeInit !== snapshotAfterInit, 'Snapshot after init has a DIFFERENT reference from initial empty snapshot');

  // Step 8: Global subscriber was notified
  assert(globalNotificationCount > 0, 'Global subscriber was notified on init completion');

  // Step 9: Later unchanged getAllRecords() calls return the SAME populated reference
  const snapshotUnchanged = personalGameStore.getAllRecords();
  assert(snapshotAfterInit === snapshotUnchanged, 'Subsequent unchanged getAllRecords() calls return exact same reference');

  // Step 10: Subsequent record change invalidates array and produces a new snapshot
  await personalGameStore.setUserRating('igdb_92550', 9.5);
  const snapshotAfterMutation = personalGameStore.getAllRecords();
  assert(snapshotUnchanged !== snapshotAfterMutation, 'Personal record change invalidates snapshot and produces new array reference');
  assert(snapshotAfterMutation.find(r => r.gameId === 'igdb_92550')?.userRating === 9.5, 'Mutated rating updated in new snapshot');

  // Test: Bookmarks, notes, and repaired catalog snapshot survive reinitialization
  const fableRecordAfterRefresh = personalGameStore.getRecord('igdb_92550')!;
  assert(fableRecordAfterRefresh.interestStatus === 'wanted', 'Bookmark (wanted) state survives reinitialization');
  assert(fableRecordAfterRefresh.userNotes === 'Fable Notes', 'Notes survive reinitialization');
  assert(fableRecordAfterRefresh.catalogSnapshot?.name === 'Fable', 'Repaired catalog snapshot title survives reinitialization');
  assert(fableRecordAfterRefresh.catalogSnapshot?.releaseYear === 2004, 'Repaired catalog release year survives reinitialization');

  // Test: Scoped getRecord() and global getAllRecords() agree after initialization
  const scopedRecord = personalGameStore.getRecord(92550)!;
  const globalRecord = personalGameStore.getAllRecords().find(r => r.numericId === 92550)!;
  assert(scopedRecord.gameId === globalRecord.gameId, 'Scoped getRecord() and global getAllRecords() agree on gameId');
  assert(scopedRecord.userNotes === globalRecord.userNotes, 'Scoped getRecord() and global getAllRecords() agree on userNotes');

  // Test: Error handling readiness helpers
  assert(personalGameStore.isReady() === true, 'isReady() returns true after init');
  assert(personalGameStore.getInitError() === null, 'getInitError() returns null after successful init');

  // Restore original repository function
  personalDataRepository.getAll = originalGetAll;
  personalDataRepository.put = originalPut;
  personalDataRepository.delete = originalDelete;
  unsubscribeGlobal();

  console.log(`\n----------------------------------------------------`);
  console.log(`📊 Initialization Test Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log(`----------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runInitializationTests().catch(err => {
  console.error('Initialization test error:', err);
  process.exit(1);
});
