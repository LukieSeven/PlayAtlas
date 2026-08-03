export interface ReferenceItem {
  id: number | null;
  name: string;
}

export interface PlatformReleaseDate {
  platformId: number | null;
  platformName: string | null;
  regionId?: number | null;
  regionName?: string | null;
  region?: string | null;
  status?: string | null;
  datePrecision?: string | null;
  dateStr?: string | null;
  date?: string | null;
  timestamp?: number | null;
  humanDate?: string | null;
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
  id: string; // e.g. "igdb:12345" or "398638"
  source?: 'igdb' | 'lizardbyte';
  sourceId?: number;

  title?: string;
  name: string;
  slug?: string | null;

  gameType?: string;
  rawGameType?: number | null;
  defaultVisible?: boolean;

  firstReleaseDate: string | null;
  firstReleaseTimestamp?: number | null;

  platformReleaseDates: PlatformReleaseDate[];

  platforms: Array<ReferenceItem & { abbreviation?: string | null }>;
  genres: ReferenceItem[];

  category?: GameCategory;
  rawCategory?: string | number | null;

  coverUrl: string | null;
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

  igdbUpdatedAt?: string | null;
}

export interface FailedRecordRequest {
  id: string;
  path: string;
  reason: string;
  statusCode?: number;
}

export interface IndexDiagnostics {
  bucketFilesProcessed?: number;
  bucketEntriesProcessed?: number;
  uniqueGameIdsFound?: number;
  duplicateEntriesRemoved?: number;

  igdbGamesDownloaded?: number;
  recordsNormalized?: number;
  defaultVisibleCount?: number;
  hiddenDlcCount?: number;
  unknownGameTypesCount?: number;
  invalidRecordsSkipped?: number;

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
  source?: 'igdb' | 'lizardbyte';
  version: number;
  schemaVersion: number;
  generatedAt: string;
  recordCount: number;
  defaultVisibleCount?: number;
  fileCount?: number;
  files?: string[];
  sourceCommit?: string;
  dataFile: string;
}

export interface CompiledGameIndex {
  manifest: IndexManifest;
  diagnostics: IndexDiagnostics;
  records: GameIndexRecord[];
}
