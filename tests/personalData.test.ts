import { normalizeScore, normalizeExternalGameScore, normalizePersonalScore } from '../src/services/scoreNormalizationService';
import { normalizeGameType, shouldShowGameTypeBadge, getGameTypeLabel } from '../src/services/gameTypePresentationService';
import { getPlatformFamily, getPlatformAbbreviation, groupPlatformsByFamily } from '../src/services/platformTaxonomyService';
import { mapToGameCardViewModel } from '../src/mappers/gameCardViewModelMapper';
import { NEW_RELEASES_DATABASE } from '../src/services/mainstreamGames';
import { personalGameStore, normalizePersonalGameId } from '../src/services/personalGameStore';

async function runPersonalDataUnitTests() {
  console.log('🧪 Running Personal Game Core & Universal Actions Unit Tests...');
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
    if (actual === expected) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} (Expected: ${expected}, Actual: ${actual})`);
    }
  }

  // 1. Score Normalization Service Tests
  const unrated = normalizeScore(undefined, 100);
  assert(unrated.isUnrated === true && unrated.displayString === 'Not Rated', 'Missing score returns Not Rated (No fake 85 fallback)');

  const fake85Removed = normalizeExternalGameScore({});
  assert(fake85Removed.displayString === 'Not Rated', 'Empty catalog object returns Not Rated instead of 85');

  const score100 = normalizeScore(87, 100);
  assert(score100.ratingValue === 8.7 && score100.displayString === '8.7 / 10', '87/100 score converts to 8.7 / 10');

  const personalRating = normalizePersonalScore(9.5);
  assert(personalRating.ratingValue === 9.5 && personalRating.displayString === '9.5 ★', 'Personal rating formats to 9.5 ★');

  const clampedRating = normalizePersonalScore(15);
  assert(clampedRating.ratingValue === 10, 'Out of bounds rating clamps to 10');

  // 2. Fable Catalog Record Score Regression Test (No 85 fallback)
  const fableRecord = NEW_RELEASES_DATABASE.find(g => g.title === 'Fable');
  assert(Boolean(fableRecord), 'Fable catalog record exists in database');
  if (fableRecord) {
    const fableVm = mapToGameCardViewModel(fableRecord);
    assert(fableVm.externalScore.displayString !== '85', 'Fable record VM does NOT display hardcoded 85 score');
    assert(fableVm.externalScore.displayString === '9.1 / 10', 'Fable record VM displays real score 9.1 / 10');
  }

  // 3. Platform Taxonomy Tests
  assert(getPlatformFamily(6) === 'pc', 'ID 6 maps to pc family');
  assert(getPlatformFamily(167) === 'playstation', 'ID 167 (PS5) maps to playstation family');
  assert(getPlatformFamily(169) === 'xbox', 'ID 169 (Xbox Series X) maps to xbox family');
  assert(getPlatformFamily(130) === 'nintendo', 'ID 130 (Switch) maps to nintendo family');

  assert(getPlatformAbbreviation(167) === 'PS5', 'ID 167 abbreviation is PS5');
  assert(getPlatformAbbreviation(130) === 'Switch', 'ID 130 abbreviation is Switch');

  const grouped = groupPlatformsByFamily([6, 167, 169, 130]);
  assert(grouped.pc.includes(6) && grouped.playstation.includes(167) && grouped.nintendo.includes(130), 'groupPlatformsByFamily correctly groups multiple platforms');

  // 4. Game Type Presentation Tests
  const mainGameType = normalizeGameType('main_game');
  assert(mainGameType === 'main_game' && shouldShowGameTypeBadge('main_game') === false, 'Main Game hides type badge (No Base Game badge on compact cards)');

  const dlcType = normalizeGameType('dlc_addon');
  assert(dlcType === 'dlc_addon' && shouldShowGameTypeBadge('dlc_addon') === true, 'DLC shows type badge');

  const modType = normalizeGameType('romhack');
  assert(modType === 'community_modification' && getGameTypeLabel('community_modification') === 'Community Mod / ROM Hack', 'ROM hacks map to Community Mod badge');

  // 5. Game Card View Model Mapper Tests (Compact Card Content Bounds)
  const mockCatalogGame = {
    id: 1020,
    name: 'Super Mario World',
    year: 1990,
    platforms: [19], // SNES
    genres: ['Platformer'],
    gameType: 'main_game',
  };

  const vm = mapToGameCardViewModel(mockCatalogGame);
  assert(vm.numericId === 1020, 'View model has primitive numeric ID 1020');
  assert(vm.title === 'Super Mario World', 'View model title is Super Mario World');
  assert(vm.releaseYearDisplay === '1990', 'Release year display is 1990');
  assert(vm.externalScore.displayString === 'Not Rated', 'External score is Not Rated without rating data');
  assert(vm.shouldShowGameTypeBadge === false, 'Compact card hides badge for normal main games');

  // 6. Canonical ID Normalization Tests
  assertEqual(normalizePersonalGameId(12345), 'igdb_12345', 'Normalizes numeric ID 12345 to igdb_12345');
  assertEqual(normalizePersonalGameId('12345'), 'igdb_12345', 'Normalizes string "12345" to igdb_12345');
  assertEqual(normalizePersonalGameId('igdb:12345'), 'igdb_12345', 'Normalizes "igdb:12345" to igdb_12345');
  assertEqual(normalizePersonalGameId('igdb_12345'), 'igdb_12345', 'Normalizes "igdb_12345" to igdb_12345');

  // 7. Scoped Per-Game Store Subscription Tests
  await personalGameStore.init();

  let gameAEvents = 0;
  let gameBEvents = 0;
  let globalEvents = 0;

  const unsubscribeA = personalGameStore.subscribeToGame(99901, () => { gameAEvents++; });
  const unsubscribeB = personalGameStore.subscribeToGame(99902, () => { gameBEvents++; });
  const unsubscribeGlobal = personalGameStore.subscribe(() => { globalEvents++; });

  await personalGameStore.setInterestStatus(99901, 'wanted');
  assertEqual(gameAEvents, 1, 'Updating game 99901 triggers listener for game 99901');
  assertEqual(gameBEvents, 0, 'Updating game 99901 DOES NOT trigger listener for unrelated game 99902');
  assertEqual(globalEvents, 1, 'Updating game 99901 triggers global listener once');

  // 8. Immutable Update & Empty Record Deletion Tests
  const recordA = personalGameStore.getRecord(99901);
  assert(Boolean(recordA && recordA.interestStatus === 'wanted'), 'Record 99901 has interestStatus wanted');

  // Removing interest status when no other data exists should clean up empty record
  await personalGameStore.setInterestStatus(99901, undefined);
  const cleanedRecord = personalGameStore.getRecord(99901);
  assert(cleanedRecord === undefined, 'Removing interest status when no other data exists deletes empty record');

  // Record with rating preserved when interest status removed
  await personalGameStore.setUserRating(99902, 9.0);
  await personalGameStore.setInterestStatus(99902, 'wanted');
  await personalGameStore.setInterestStatus(99902, undefined);
  const preservedRecord = personalGameStore.getRecord(99902);
  assert(Boolean(preservedRecord && preservedRecord.userRating === 9.0), 'Removing interest status preserves record if user rating exists');

  // Clean up test subscriptions
  unsubscribeA();
  unsubscribeB();
  unsubscribeGlobal();
  await personalGameStore.removePersonalRecord(99902);

  console.log(`----------------------------------------------------`);
  console.log(`📊 Personal Game Core Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPersonalDataUnitTests().catch(err => {
  console.error('❌ Personal Data Test Failed:', err);
  process.exit(1);
});
