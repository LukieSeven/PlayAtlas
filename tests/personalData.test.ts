import { normalizeScore, normalizeExternalGameScore, normalizePersonalScore } from '../src/services/scoreNormalizationService';
import { normalizeGameType, shouldShowGameTypeBadge, getGameTypeLabel } from '../src/services/gameTypePresentationService';
import { getPlatformFamily, getPlatformAbbreviation, groupPlatformsByFamily } from '../src/services/platformTaxonomyService';
import { mapToGameCardViewModel } from '../src/mappers/gameCardViewModelMapper';

function runPersonalDataUnitTests() {
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

  // 2. Platform Taxonomy Tests
  assert(getPlatformFamily(6) === 'pc', 'ID 6 maps to pc family');
  assert(getPlatformFamily(167) === 'playstation', 'ID 167 (PS5) maps to playstation family');
  assert(getPlatformFamily(169) === 'xbox', 'ID 169 (Xbox Series X) maps to xbox family');
  assert(getPlatformFamily(130) === 'nintendo', 'ID 130 (Switch) maps to nintendo family');

  assert(getPlatformAbbreviation(167) === 'PS5', 'ID 167 abbreviation is PS5');
  assert(getPlatformAbbreviation(130) === 'Switch', 'ID 130 abbreviation is Switch');

  const grouped = groupPlatformsByFamily([6, 167, 169, 130]);
  assert(grouped.pc.includes(6) && grouped.playstation.includes(167) && grouped.nintendo.includes(130), 'groupPlatformsByFamily correctly groups multiple platforms');

  // 3. Game Type Presentation Tests
  const mainGameType = normalizeGameType('main_game');
  assert(mainGameType === 'main_game' && shouldShowGameTypeBadge('main_game') === false, 'Main Game hides type badge');

  const dlcType = normalizeGameType('dlc_addon');
  assert(dlcType === 'dlc_addon' && shouldShowGameTypeBadge('dlc_addon') === true, 'DLC shows type badge');

  const modType = normalizeGameType('romhack');
  assert(modType === 'community_modification' && getGameTypeLabel('community_modification') === 'Community Mod / ROM Hack', 'ROM hacks map to Community Mod badge');

  // 4. Game Card View Model Mapper Tests
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

  console.log(`----------------------------------------------------`);
  console.log(`📊 Personal Game Core Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPersonalDataUnitTests();
