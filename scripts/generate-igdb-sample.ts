import fs from 'fs';
import path from 'path';

const now = new Date();
const diagnosticDate = now.toISOString().split('T')[0];
const diagnosticTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const sampleRecords = [
  {
    id: 'igdb:290888',
    source: 'igdb',
    sourceId: 290888,
    name: 'Grand Theft Auto VI',
    title: 'Grand Theft Auto VI',
    slug: 'grand-theft-auto-vi',
    gameType: 'Main Game',
    rawGameType: 0,
    defaultVisible: true,
    category: 'Main Game',
    firstReleaseDate: '2026-07-31',
    firstReleaseTimestamp: 1785456000,
    platformReleaseDates: [
      {
        platformId: 167,
        platformName: 'PlayStation 5',
        date: '2026-07-31',
        region: 'Worldwide',
        status: 'Released',
        datePrecision: 'Exact day',
      },
      {
        platformId: 169,
        platformName: 'Xbox Series X/S',
        date: '2026-07-31',
        region: 'Worldwide',
        status: 'Released',
        datePrecision: 'Exact day',
      },
    ],
    platforms: [
      { id: 167, name: 'PlayStation 5', abbreviation: 'PS5' },
      { id: 169, name: 'Xbox Series X/S', abbreviation: 'Series X/S' },
      { id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' },
    ],
    genres: [
      { id: 5, name: 'Shooter' },
      { id: 10, name: 'Racing' },
      { id: 31, name: 'Adventure' },
    ],
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    summary: 'Grand Theft Auto VI heads to Vice City and the state of Leonida.',
    externalIds: { steam: '123456' },
    igdbUpdatedAt: now.toISOString(),
    sourceRecordPath: 'https://api.igdb.com/v4/games/290888',
  },
  {
    id: 'igdb:398638',
    source: 'igdb',
    sourceId: 398638,
    name: 'Corsair Cove',
    title: 'Corsair Cove',
    slug: 'corsair-cove',
    gameType: 'Main Game',
    rawGameType: 0,
    defaultVisible: true,
    category: 'Main Game',
    firstReleaseDate: '2026-07-30',
    firstReleaseTimestamp: 1785438000,
    platformReleaseDates: [
      {
        platformId: 6,
        platformName: 'PC (Microsoft Windows)',
        date: '2026-07-30',
        region: 'Worldwide',
        status: 'Released',
        datePrecision: 'Exact day',
      },
    ],
    platforms: [{ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }],
    genres: [
      { id: 13, name: 'Simulator' },
      { id: 15, name: 'Strategy' },
    ],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coc8wf.jpg',
    summary: 'Build a sprawling pirate haven, raise a fleet to explore the high seas, and take on the Crown!',
    externalIds: { steam: '398638' },
    igdbUpdatedAt: now.toISOString(),
    sourceRecordPath: 'https://api.igdb.com/v4/games/398638',
  },
  {
    id: 'igdb:325205',
    source: 'igdb',
    sourceId: 325205,
    name: 'MineGeon: Renegades',
    title: 'MineGeon: Renegades',
    slug: 'minegeon-renegades',
    gameType: 'Main Game',
    rawGameType: 0,
    defaultVisible: true,
    category: 'Main Game',
    firstReleaseDate: '2026-07-28',
    firstReleaseTimestamp: 1785283200,
    platformReleaseDates: [
      {
        platformId: 6,
        platformName: 'PC (Microsoft Windows)',
        date: '2026-07-28',
        region: 'Worldwide',
        status: 'Released',
        datePrecision: 'Exact day',
      },
    ],
    platforms: [{ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }],
    genres: [
      { id: 12, name: 'Role-playing (RPG)' },
      { id: 32, name: 'Indie' },
    ],
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    summary: 'Descend into Planet Paimo in MineGeon: Renegades, a chaotic multiplayer roguelite.',
    externalIds: { steam: '325205' },
    igdbUpdatedAt: now.toISOString(),
    sourceRecordPath: 'https://api.igdb.com/v4/games/325205',
  },
  {
    id: 'igdb:999901',
    source: 'igdb',
    sourceId: 999901,
    name: 'Cities: Skylines - Race Day Expansion Pack',
    title: 'Cities: Skylines - Race Day Expansion Pack',
    slug: 'cities-skylines-race-day',
    gameType: 'DLC / Add-on',
    rawGameType: 1,
    defaultVisible: false,
    category: 'DLC / Add-on',
    firstReleaseDate: '2026-07-29',
    firstReleaseTimestamp: 1785369600,
    platformReleaseDates: [
      {
        platformId: 6,
        platformName: 'PC (Microsoft Windows)',
        date: '2026-07-29',
        region: 'Worldwide',
        status: 'Released',
        datePrecision: 'Exact day',
      },
    ],
    platforms: [{ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }],
    genres: [{ id: 15, name: 'Strategy' }],
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    summary: 'Add race tracks and motorsport events to your city skyline.',
    externalIds: { steam: '999901' },
    igdbUpdatedAt: now.toISOString(),
    sourceRecordPath: 'https://api.igdb.com/v4/games/999901',
  },
];

const diagnostics = {
  igdbGamesDownloaded: sampleRecords.length,
  recordsNormalized: sampleRecords.length,
  recordsWithReleaseDates: sampleRecords.length,
  recordsWithPlatformReleaseDates: sampleRecords.length,
  defaultVisibleCount: sampleRecords.filter(r => r.defaultVisible).length,
  hiddenDlcCount: sampleRecords.filter(r => !r.defaultVisible).length,
  unknownGameTypesCount: 0,
  duplicateRecordsRemoved: 0,
  invalidRecordsSkipped: 0,
  gameRecordsLoaded: sampleRecords.length,
  validReleaseDatesCount: sampleRecords.length,
  recordsWithoutReleaseDates: 0,
  firstReleaseTodayCount: sampleRecords.filter(r => r.firstReleaseDate === diagnosticDate).length,
  platformReleaseTodayCount: sampleRecords.filter(r => r.platformReleaseDates.some(p => p.date === diagnosticDate)).length,
  diagnosticDate,
  diagnosticTimezone,
  failedRecordRequests: [],
  indexGeneratedAt: now.toISOString(),
};

const manifest = {
  source: 'igdb',
  version: 1,
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  recordCount: sampleRecords.length,
  defaultVisibleCount: sampleRecords.filter(r => r.defaultVisible).length,
  fileCount: 1,
  files: ['data/igdb_index.json'],
  dataFile: 'data/igdb_index.json',
};

const compiledIndex = {
  manifest,
  diagnostics,
  records: sampleRecords,
};

const dataDir = path.join(process.cwd(), 'public/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, 'igdb_index_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
fs.writeFileSync(path.join(dataDir, 'igdb_index.json'), JSON.stringify(compiledIndex, null, 2), 'utf-8');

console.log('✅ Generated sample IGDB test dataset in public/data/igdb_index_manifest.json & public/data/igdb_index.json');
