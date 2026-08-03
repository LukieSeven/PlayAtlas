export interface ReferenceItem {
  id: number | null;
  name: string;
}

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string;
  date: string | null;
  dateStr?: string | null;
  region: string | null;
  status: string | null;
  datePrecision: string | null;
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
  | 'Update'
  | 'Fork'
  | 'Unknown';

export interface GameIndexRecord {
  id: string; // e.g. "igdb:12345"
  source?: 'igdb' | 'lizardbyte';
  sourceId?: number;

  name: string;
  title?: string;
  slug?: string | null;

  gameType: string; // Stable key e.g. "main_game"
  gameTypeLabel: string; // Display label e.g. "Main Game"
  rawGameType?: string | number | null;
  defaultVisible: boolean;

  firstReleaseDate: string | null;
  firstReleaseTimestamp?: number | null;
  datePrecision: string | null; // "exact day" | "month" | "quarter" | "year" | "TBD" | "unknown"

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

  missingGameTypeCount?: number;
  unknownGameTypeCount?: number;
  gameTypeFrequency?: Record<string, number>;
  gameTypeCounts?: Record<string, number>;

  exactDateCount?: number;
  monthOnlyCount?: number;
  yearOnlyCount?: number;
  quarterOnlyCount?: number;
  tbdCount?: number;
  unknownPrecisionCount?: number;
  dateFormatFrequency?: Record<string, number>;

  bucketFilesProcessed?: number;
  bucketEntriesProcessed?: number;
  uniqueGameIdsFound?: number;
  duplicateEntriesRemoved?: number;

  gameRecordsLoaded: number;
  validReleaseDatesCount: number;
  recordsWithoutReleaseDates: number;
  recordsWithPlatformReleaseDates: number;

  firstReleaseTodayCount: number;
  platformReleaseTodayCount: number;

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
  source: 'igdb' | 'lizardbyte';
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
