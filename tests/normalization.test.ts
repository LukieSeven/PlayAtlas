import {
  parseGameTypeInfo,
  normalizeDatePrecision,
} from '../src/utils/igdbNormalization';

function runNormalizationTests() {
  console.log('🧪 Running Normalization Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} (Expected: ${expected}, Actual: ${actual})`);
    }
  }

  // --- Game Type Normalization Tests ---
  assertEqual(parseGameTypeInfo({ id: 0, type: 'Main Game' }).key, 'main_game', '{id: 0, type: "Main Game"} -> main_game');
  assertEqual(parseGameTypeInfo({ id: 1, type: 'DLC' }).key, 'dlc_addon', '{id: 1, type: "DLC"} -> dlc_addon');
  assertEqual(parseGameTypeInfo({ id: 13, type: 'Pack / Addon' }).key, 'pack', '{id: 13, type: "Pack / Addon"} -> pack');
  assertEqual(parseGameTypeInfo('Main Game').key, 'main_game', '"Main Game" -> main_game');
  assertEqual(parseGameTypeInfo('DLC').key, 'dlc_addon', '"DLC" -> dlc_addon');
  assertEqual(parseGameTypeInfo('Pack / Addon').key, 'pack', '"Pack / Addon" -> pack');
  assertEqual(parseGameTypeInfo({ id: 999, type: 'NonExistent' }).key, 'unknown', 'unknown ID and label -> unknown');

  // --- Default Visibility Rule Tests ---
  assertEqual(parseGameTypeInfo({ id: 0, type: 'Main Game' }).defaultVisible, true, 'Main Game defaultVisible -> true');
  assertEqual(parseGameTypeInfo({ id: 1, type: 'DLC' }).defaultVisible, false, 'DLC defaultVisible -> false');
  assertEqual(parseGameTypeInfo({ id: 13, type: 'Pack / Addon' }).defaultVisible, false, 'Pack defaultVisible -> false');

  // --- Date Format Precision Tests ---
  assertEqual(normalizeDatePrecision('YYYYMMDD'), 'day', 'YYYYMMDD -> day');
  assertEqual(normalizeDatePrecision('YYYYMMMMDD'), 'day', 'YYYYMMMMDD -> day');
  assertEqual(normalizeDatePrecision('YYYYMM'), 'month', 'YYYYMM -> month');
  assertEqual(normalizeDatePrecision('YYYYMMMM'), 'month', 'YYYYMMMM -> month');
  assertEqual(normalizeDatePrecision('YYYY'), 'year', 'YYYY -> year');
  assertEqual(normalizeDatePrecision('YYYYQ1'), 'quarter', 'YYYYQ1 -> quarter');
  assertEqual(normalizeDatePrecision('YYYYQ4'), 'quarter', 'YYYYQ4 -> quarter');
  assertEqual(normalizeDatePrecision('TBD'), 'tbd', 'TBD -> tbd');
  assertEqual(normalizeDatePrecision('unexpected_format_xyz'), 'unknown', 'unexpected -> unknown');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Unit Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runNormalizationTests();
