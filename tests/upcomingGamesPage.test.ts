import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  convertReleaseRecordToCompactRecord,
  getReleaseRecordChunkNumber,
  ReleaseListingRecord,
  sortReleaseRecordsChronologically,
} from '../src/services/releaseCatalogService';

console.log('Running Upcoming Games IGDB regression tests...');

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${description}`);
  } else {
    failed++;
    console.error(`  FAIL: ${description}`);
  }
}

function makeRecord(overrides: Partial<ReleaseListingRecord> = {}): ReleaseListingRecord {
  return {
    id: 'igdb:410001',
    sourceId: 410001,
    name: 'Future Atlas',
    slug: 'future-atlas',
    gameType: 'remake',
    gameTypeLabel: 'Remake',
    defaultVisible: false,
    firstReleaseDate: '2027-04-12',
    firstReleaseDatePrecision: 'day',
    platformReleaseDates: [],
    platforms: [{ id: 6, name: 'PC', abbreviation: 'PC' }],
    coverUrl: null,
    summaryPreview: null,
    dataChunk: 'chunks/game_index_0035.json.gz',
    ...overrides,
  };
}

const compact = convertReleaseRecordToCompactRecord(makeRecord());
assert(compact.id === 410001, 'mapping uses the authoritative numeric IGDB sourceId');
assert(compact.year === 2027, 'mapping derives release year only from the authoritative date');
assert(compact.gameType === 'remake', 'mapping preserves game type');
assert(compact.defaultVisible === false, 'mapping preserves default visibility');
assert(compact.chunk === 35, 'mapping retains the exact full-detail chunk reference');
assert(compact.platforms?.[0] === 'PC', 'mapping preserves release-record platform names');

const undated = convertReleaseRecordToCompactRecord(makeRecord({ firstReleaseDate: null }));
assert(undated.year === undefined, 'missing dates do not receive a hard-coded fallback year');
assert(getReleaseRecordChunkNumber('chunks/game_index_0035.json.gz') === 35, 'production chunk paths parse exactly');
assert(getReleaseRecordChunkNumber('other/path_0035.json.gz') === undefined, 'unrecognized paths are not guessed from digits');

const sorted = sortReleaseRecordsChronologically([
  makeRecord({ sourceId: 3, firstReleaseDate: '2027-09-01' }),
  makeRecord({ sourceId: 2, firstReleaseDate: '2027-02-01' }),
  makeRecord({ sourceId: 1, firstReleaseDate: '2027-02-01' }),
], 'ascending');
assert(
  sorted.map(record => record.sourceId).join(',') === '1,2,3',
  'upcoming releases sort soonest-first with stable IGDB ID tie-breaking'
);

const testDir = path.dirname(fileURLToPath(import.meta.url));
const pageSource = fs.readFileSync(path.join(testDir, '../src/pages/UpcomingGamesPage.tsx'), 'utf8');
assert(pageSource.includes('getUpcomingGames(30)'), 'routed page uses the IGDB release catalog');
assert(!pageSource.includes('gameDbService'), 'routed page has no LizardByte service dependency');
assert(!pageSource.includes('Math.random'), 'routed page never generates random fallback IDs');
assert(pageSource.includes('isMounted'), 'routed page guards against updates after unmount');
assert(pageSource.includes('isLoading={isLoading}'), 'routed page exposes loading state to the existing grid');
assert(pageSource.includes('role="alert"'), 'routed page renders a controlled error state');

console.log(`Upcoming Games results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
