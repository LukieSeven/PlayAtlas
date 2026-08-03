export type CountReconciliationStatus = 'exact' | 'within_tolerance' | 'failed';

export interface ReconciliationResult {
  snapshotCountAtStart: number;
  snapshotCountAtEnd: number;
  actualImportedRecordCount: number;
  countDifferenceFromStart: number;
  countDifferenceFromEnd: number;
  allowedDifference: number;
  status: CountReconciliationStatus;
  warningMessage: string | null;
}

export function reconcileCatalogCounts(
  snapshotCountAtStart: number,
  snapshotCountAtEnd: number,
  actualImportedRecordCount: number
): ReconciliationResult {
  const countDifferenceFromStart = actualImportedRecordCount - snapshotCountAtStart;
  const countDifferenceFromEnd = actualImportedRecordCount - snapshotCountAtEnd;

  const allowedDifference = Math.max(10, Math.ceil(actualImportedRecordCount * 0.0001));

  let status: CountReconciliationStatus = 'failed';
  let warningMessage: string | null = null;

  if (countDifferenceFromStart === 0 && countDifferenceFromEnd === 0) {
    status = 'exact';
  } else if (
    Math.abs(countDifferenceFromStart) <= allowedDifference ||
    Math.abs(countDifferenceFromEnd) <= allowedDifference
  ) {
    status = 'within_tolerance';
    warningMessage = `⚠️ IGDB count endpoints differed slightly from the complete cursor import.\nCatalog integrity checks passed, and the discrepancy is within tolerance. (Start Diff: ${countDifferenceFromStart}, End Diff: ${countDifferenceFromEnd}, Allowed: ±${allowedDifference})`;
  } else {
    status = 'failed';
  }

  return {
    snapshotCountAtStart,
    snapshotCountAtEnd,
    actualImportedRecordCount,
    countDifferenceFromStart,
    countDifferenceFromEnd,
    allowedDifference,
    status,
    warningMessage,
  };
}
