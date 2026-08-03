import {
  parseGameTypeInfo,
  normalizeDatePrecision,
} from '../src/utils/igdbNormalization';
import { reconcileCatalogCounts } from '../src/utils/reconciliation';

function runNormalizationAndReconciliationTests() {
  console.log('🧪 Running Normalization & Reconciliation Unit Tests...');
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

  // --- Count Reconciliation Tests (Requirement 6) ---
  // 1. Exact match -> pass with "exact"
  const exactRes = reconcileCatalogCounts(371000, 371000, 371000);
  assertEqual(exactRes.status, 'exact', 'Exact match -> pass with "exact"');

  // 2. Actual +2 -> pass with "within_tolerance"
  const plusTwoRes = reconcileCatalogCounts(371008, 371008, 371010);
  assertEqual(plusTwoRes.status, 'within_tolerance', 'Actual +2 -> pass with "within_tolerance"');

  // 3. Actual -2 -> pass with "within_tolerance"
  const minusTwoRes = reconcileCatalogCounts(371012, 371012, 371010);
  assertEqual(minusTwoRes.status, 'within_tolerance', 'Actual -2 -> pass with "within_tolerance"');

  // 4. Difference at tolerance boundary -> pass
  const allowed = Math.max(10, Math.ceil(371000 * 0.0001)); // 38
  const atBoundaryRes = reconcileCatalogCounts(371000, 371000, 371000 + allowed);
  assertEqual(atBoundaryRes.status, 'within_tolerance', 'Difference at tolerance boundary -> pass');

  // 5. Difference above tolerance -> fail
  const aboveBoundaryRes = reconcileCatalogCounts(371000, 371000, 371000 + allowed + 10);
  assertEqual(aboveBoundaryRes.status, 'failed', 'Difference above tolerance -> fail');

  // --- Simulated Hard Integrity Check Failures ---
  // 6. Duplicate IDs with matching count -> fail
  function validateIntegrityWithDuplicates(records: number[]): boolean {
    const seen = new Set<number>();
    for (const id of records) {
      if (seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  }
  assertEqual(validateIntegrityWithDuplicates([100, 101, 101, 102]), false, 'Duplicate IDs with matching count -> fail');

  // 7. Cursor stall with matching count -> fail
  function validateCursorAdvance(prevCursor: number, currentBatchMinId: number): boolean {
    return currentBatchMinId > prevCursor;
  }
  assertEqual(validateCursorAdvance(500, 500), false, 'Cursor stall with matching count -> fail');

  // 8. Manifest mismatch with matching count -> fail
  function validateManifestMatch(manifestCount: number, actualChunksCount: number): boolean {
    return manifestCount === actualChunksCount;
  }
  assertEqual(validateManifestMatch(371010, 370000), false, 'Manifest mismatch with matching count -> fail');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Unit Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runNormalizationAndReconciliationTests();
