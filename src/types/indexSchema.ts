export interface ReferenceItem {
  id: number | null;
  name: string;
}

export type DatePrecision = 'day' | 'month' | 'quarter' | 'year' | 'tbd' | 'unknown';

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string;
  date: string | null;
  dateStr?: string | null;
  region: string | null;
  status: string | null;
  datePrecision: DatePrecision;
}

export type GameCategory =
  | 'Base Game'
  | 'Main Game'
  | 'DLC'
  | 'DLC / Add-on'
  | 'Expansion'
  | 'Standalone Expansion'
  | 'Bundle'
  | 'Remake'
  | 'Remaster'
  | 'Expanded Game'
  | 'Port'
  | 'Mod'
  | 'Episode'
  | 'Season'
  | 'Pack'
  | 'Pack / Add-on'
  | 'Update'
  | 'Fork'
  | 'Unknown';

export interface GameIndexRecord {
  id: string; // e.g. "igdb:12345"
  source: 'igdb';
  sourceId: number;

  name: string;
  title: string;
  slug: string | null;

  gameType: string; // Stable machine key e.g. "main_game"
  gameTypeLabel: string; // Readable display label e.g. "Main Game"
  rawGameType?: string | number | null;
  defaultVisible: boolean;

  firstReleaseDate: string | null;
  firstReleaseTimestamp?: number | null;
  datePrecision: DatePrecision;

  platformReleaseDates: PlatformReleaseDate[];

  platforms: Array<{
    id: number;
    name: string;
    abbreviation?: string | null;
  }>;

  genres: ReferenceItem[];

  category?: GameCategory;
  rawCategory?: string | number | null;

  coverUrl: string | null;
  coverImageId?: string | null;
  summary?: string | null;
  sourceRecordPath?: string;

  externalIds?: {
    steam?: string;
    gog?: string;
    epic?: string;
    xbox?: string;
    playstation?: string;
    nintendo?: string;
    [key: string]: string | undefined;
  };

  gameStatus?: string | null;
  igdbUpdatedAt?: string | null;
}

export interface FailedRecordRequest {
  id: string;
  path: string;
  reason: string;
  statusCode?: number;
}

export interface IndexDiagnostics {
  recentIgdbRecordsReceived?: number;
  upcomingIgdbRecordsReceived?: number;
  recordsBeforeDeduplication?: number;
  duplicateRecordsRemoved?: number;
  finalNormalizedRecords?: number;

  missingGameTypeCount?: number;
  unknownGameTypeCount?: number;
  gameTypeFrequency?: Record<string, number>;
  gameTypeCounts?: Record<string, number>;

  // Release-Entry Precision Counts
  releaseEntryPrecisionCounts?: {
    exactDay: number;
    monthOnly: number;
    quarterOnly: number;
    yearOnly: number;
    tbd: number;
    unknown: number;
  };
  totalReleaseDateEntries?: number;

  // Game First-Release Precision Counts
  firstReleasePrecisionCounts?: {
    exactDay: number;
    monthOnly: number;
    quarterOnly: number;
    yearOnly: number;
    tbd: number;
    unknown: number;
  };

  dateFormatFrequency?: Record<string, number>;

  // Legacy & UI Diagnostic Panel Properties
  bucketFilesProcessed?: number;
  bucketEntriesProcessed?: number;
  uniqueGameIdsFound?: number;
  duplicateEntriesRemoved?: number;
  gameRecordsLoaded?: number;
  validReleaseDatesCount?: number;
  recordsWithoutReleaseDates?: number;
  firstReleaseTodayCount?: number;
  platformReleaseTodayCount?: number;
  recordsWithPlatformReleaseDates?: number;

  recordsWithPlatformSpecificDates?: number;
  recordsWithCovers?: number;
  recordsWithoutCovers?: number;

  defaultVisibleRecords?: number;
  hiddenRecords?: number;
  invalidRecordsSkipped?: number;

  generatedDatabaseSize?: number;
  generatedManifestSize?: number;

  diagnosticDate: string;
  diagnosticTimezone: string;
  failedRecordRequests: FailedRecordRequest[];
  indexGeneratedAt: string;
}

export interface IndexManifest {
  source: 'igdb';
  version: number;
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  defaultVisibleCount: number;
  fileCount: number;
  files: string[];
  sourceCommit?: string;
  dataFile: string;
}

export interface CompiledGameIndex {
  manifest: IndexManifest;
  diagnostics: IndexDiagnostics;
  records: GameIndexRecord[];
}
