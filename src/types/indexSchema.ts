export interface ReferenceItem {
  id: number | null;
  name: string;
}

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string | null;
  regionId: number | null;
  regionName: string | null;
  dateStr: string | null;
  timestamp: number | null;
  humanDate: string | null;
}

export type GameCategory =
  | 'Base Game'
  | 'DLC'
  | 'Expansion'
  | 'Standalone Expansion'
  | 'Bundle'
  | 'Remake'
  | 'Remaster'
  | 'Port'
  | 'Mod'
  | 'Episode'
  | 'Season'
  | 'Pack'
  | 'Unknown';

export interface GameIndexRecord {
  id: string;
  title: string;

  firstReleaseDate: string | null;
  firstReleaseTimestamp: number | null;

  platformReleaseDates: PlatformReleaseDate[];

  platforms: ReferenceItem[];
  genres: ReferenceItem[];

  category: GameCategory;
  rawCategory: string | number | null;

  coverUrl: string | null;
  sourceRecordPath: string;
}

export interface FailedRecordRequest {
  id: string;
  path: string;
  reason: string;
  statusCode?: number;
}

export interface IndexDiagnostics {
  bucketFilesProcessed: number;
  bucketEntriesProcessed: number;
  uniqueGameIdsFound: number;
  duplicateEntriesRemoved: number;

  gameRecordsLoaded: number;
  validReleaseDatesCount: number;
  recordsWithoutReleaseDates: number;
  recordsWithPlatformReleaseDates: number;

  firstReleaseTodayCount: number;
  platformReleaseTodayCount: number;

  diagnosticDate: string;
  diagnosticTimezone: string;

  failedRecordRequests: FailedRecordRequest[];
  indexGeneratedAt: string;
}

export interface IndexManifest {
  version: number;
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  sourceCommit?: string;
  dataFile: string;
}

export interface CompiledGameIndex {
  manifest: IndexManifest;
  diagnostics: IndexDiagnostics;
  records: GameIndexRecord[];
}
