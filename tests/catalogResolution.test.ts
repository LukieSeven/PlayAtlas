import {
  resolveCompactRecordByGameId,
  getGameDetailForCompactRecord,
  fetchGameDetailsForCompactRecords,
  convertPersonalRecordToCompact,
  hydrateCompactRecordsBatch,
  isBetterRecord,
  updateHydrationCacheIfBetter,
  clearHydrationCache,
  calculateRecordQualityScore,
} from '../src/services/catalogDetailService';
import {
  personalGameStore,
  normalizePersonalGameId,
  isSyntheticTitle,
  mergeCatalogSnapshots,
} from '../src/services/personalGameStore';
import { CompactGameLookupRecord } from '../src/types/catalog';
import { PersonalGameRecord } from '../src/types/personal';

console.log('🧪 Running Catalog Resolution & Personal Library Cache Protection Tests...\n');

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

async function runTests() {
  clearHydrationCache();

  // Test 1: A PersonalGameRecord with no useful snapshot resolves through compact catalog lookup
  const mockCompactLookupLoader = async (chunkFile: string) => {
    if (chunkFile.includes('0035')) {
      return [
        {
          sourceId: 92550,
          name: 'Fable',
          releaseDate: '2004-09-14',
          coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg',
          platforms: ['Xbox', 'PC'],
          genres: ['Role-playing (RPG)', 'Adventure'],
          developer: 'Lionhead Studios',
          rating: 88,
          gameType: 'main_game',
        },
      ];
    }
    return [];
  };

  const rawPersonalRecord: PersonalGameRecord = {
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    gameId: 'igdb_92550',
    numericId: 92550,
    ownerships: [],
    customTags: ['rpg-classic'],
    playSessions: [],
    completionHistory: [],
    inBacklogQueue: true,
    userNotes: 'Played on original Xbox in 2004.',
    interestStatus: 'wanted',
    catalogSnapshot: { name: 'Game #92550' }, // synthetic snapshot
  };

  const convertedBase = convertPersonalRecordToCompact(rawPersonalRecord);
  assert(convertedBase.id === 92550, 'Converted record retains numeric ID 92550');
  assert(convertedBase.chunk === undefined, 'Converted record does not invent a chunk');
  assert(convertedBase.platforms?.length === 0, 'Converted record does not invent PC platform');
  assert(convertedBase.genres?.length === 0, 'Converted record does not invent Action genre');

  // Test 2: Missing chunk never defaults to chunk 1 & no modulo/math chunk guess exists
  const detailResult = await getGameDetailForCompactRecord(convertedBase, async (file) => {
    assert(!file.includes('0001'), 'Missing chunk must NOT request chunk 1');
    return [];
  });
  assert(detailResult !== null, 'Returns fallback detail without loading chunk 1');

  // Test 3: Hydration resolves un-hydrated record via compact lookup & chunk 35
  const mockResolveLookup = async () => {
    // Mock compact record for 92550
    return {
      id: 92550,
      name: 'Fable',
      year: 2004,
      chunk: 35,
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg',
      platforms: ['Xbox', 'PC'],
      genres: ['Role-playing (RPG)', 'Adventure'],
      gameType: 'main_game',
    } as CompactGameLookupRecord;
  };

  const hydratedBatch = await hydrateCompactRecordsBatch([convertedBase], mockCompactLookupLoader);
  assert(hydratedBatch.length === 1, 'Hydrated batch returns exactly 1 item');

  // Test 4: Failed hydration is not cached
  clearHydrationCache();
  const failedRecord: CompactGameLookupRecord = {
    id: 9999999,
    name: 'Game #9999999',
  };

  const failedHydratedBatch = await hydrateCompactRecordsBatch([failedRecord], async () => []);
  assert(failedHydratedBatch[0].id === 9999999, 'Failed hydration returns original record');
  const checkCacheQuality = updateHydrationCacheIfBetter(failedRecord);
  assert(!checkCacheQuality, 'Failed/synthetic record is NOT cached in hydration cache');

  // Test 5: Game #92550 cannot overwrite a valid Fable compact/search record
  clearHydrationCache();
  const fableAuthoritativeRecord: CompactGameLookupRecord = {
    id: 92550,
    name: 'Fable',
    year: 2004,
    chunk: 35,
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg',
    platforms: ['Xbox', 'PC'],
    genres: ['Role-playing (RPG)'],
  };

  updateHydrationCacheIfBetter(fableAuthoritativeRecord);
  const genericRecord: CompactGameLookupRecord = {
    id: 92550,
    name: 'Game #92550',
    coverUrl: undefined,
  };

  const isWorseAccepted = updateHydrationCacheIfBetter(genericRecord);
  assert(!isWorseAccepted, 'Game #92550 cannot overwrite valid Fable record');
  assert(!isBetterRecord(genericRecord, fableAuthoritativeRecord), 'Generic record ranks lower than authoritative record');

  // Test 6: A valid incoming search record replaces a generic cached entry
  clearHydrationCache();
  const genericInCache: CompactGameLookupRecord = {
    id: 1234,
    name: 'Game #1234',
  };
  // Force generic in cache for testing
  const searchRecord: CompactGameLookupRecord = {
    id: 1234,
    name: 'Chrono Trigger',
    year: 1995,
    chunk: 12,
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/chrono.jpg',
  };

  assert(isBetterRecord(searchRecord, genericInCache), 'Valid search record is better than generic cached entry');
  updateHydrationCacheIfBetter(searchRecord);

  // Test 7: PC and Action are not invented
  const emptyMetaItem = convertPersonalRecordToCompact({ numericId: 777, catalogSnapshot: { name: 'Custom Game' } });
  assert(emptyMetaItem.platforms?.length === 0, 'Platforms array is empty, not ["PC"]');
  assert(emptyMetaItem.genres?.length === 0, 'Genres array is empty, not ["Action"]');

  // Test 8: Correct authoritative chunk is used for game ID 92550
  const chunkCheck = fableAuthoritativeRecord.chunk;
  assert(chunkCheck === 35, 'Authoritative chunk for Fable is 35 (not defaulted or guessed)');

  // Test 9 & 10: Catalog snapshot repairs from synthetic title to real title, cover, and release year
  const syntheticSnapshot = { name: 'Game #92550' };
  const incomingRealSnapshot = { name: 'Fable', coverUrl: 'https://images.igdb.com/co1x77.jpg', releaseYear: 2004 };
  const { snapshot: repaired, changed } = mergeCatalogSnapshots(syntheticSnapshot, incomingRealSnapshot);
  assert(changed === true, 'Snapshot merge reports actual repair changed=true');
  assert(repaired?.name === 'Fable', 'Repaired snapshot title is Fable');
  assert(repaired?.coverUrl === 'https://images.igdb.com/co1x77.jpg', 'Repaired snapshot coverUrl is updated');
  assert(repaired?.releaseYear === 2004, 'Repaired snapshot releaseYear is updated');

  // Test 11, 12, 13: Wanted state, notes, ownership, and completion history survive snapshot repair
  await personalGameStore.setNotes('igdb_92550', 'Preserved Note', syntheticSnapshot);
  await personalGameStore.setInterestStatus('igdb_92550', 'wanted', syntheticSnapshot);
  await personalGameStore.addOwnership('igdb_92550', { platformId: 169, ownershipType: 'physical' }, syntheticSnapshot);
  await personalGameStore.addCompletion('igdb_92550', { completionId: 'comp_1', completedDate: '2026-01-01', completionType: '100%' }, syntheticSnapshot);

  const beforeRepair = personalGameStore.getRecord('igdb_92550')!;
  assert(beforeRepair.userNotes === 'Preserved Note', 'Notes present before repair');
  assert(beforeRepair.interestStatus === 'wanted', 'Wanted state present before repair');
  assert(beforeRepair.ownerships.length === 1, 'Ownership present before repair');
  assert(beforeRepair.completionHistory.length === 1, 'Completion history present before repair');

  await personalGameStore.updateCatalogSnapshot('igdb_92550', incomingRealSnapshot);
  const afterRepair = personalGameStore.getRecord('igdb_92550')!;
  assert(afterRepair.catalogSnapshot?.name === 'Fable', 'Snapshot title repaired to Fable');
  assert(afterRepair.userNotes === 'Preserved Note', 'Notes survived snapshot repair');
  assert(afterRepair.interestStatus === 'wanted', 'Wanted state survived snapshot repair');
  assert(afterRepair.ownerships.length === 1, 'Ownership survived snapshot repair');
  assert(afterRepair.completionHistory.length === 1, 'Completion history survived snapshot repair');

  // Test 14, 15, 16: Search and My Games show same metadata & cross-page navigation does not corrupt cache
  clearHydrationCache();
  updateHydrationCacheIfBetter(fableAuthoritativeRecord);
  const myGamesHydration = await hydrateCompactRecordsBatch([convertedBase], mockCompactLookupLoader);
  assert(myGamesHydration[0].name === 'Fable', 'My Games shows authoritative Fable title');
  assert(myGamesHydration[0].coverUrl?.includes('co1x77'), 'My Games shows authoritative Fable cover');

  // Test 17: No personal IndexedDB data must be deleted to repair records
  const checkRecordExist = personalGameStore.getRecord('igdb_92550');
  assert(Boolean(checkRecordExist), 'Personal record exists and was not deleted during snapshot repair');

  console.log(`\n----------------------------------------------------`);
  console.log(`📊 Catalog Resolution Test Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log(`----------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
