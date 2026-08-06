import {
  getDynamicLocalDate,
  calculateDynamicDateRange,
  convertReleaseRecordToGameItem,
  fetchReleaseManifest,
  getReleaseMonthKeys,
  getExactCalendarReleaseDates,
  isUnreleasedFirstReleaseWithinRange,
  sortUpcomingReleaseRecordsByPopularity,
  UPCOMING_DISCOVERY_DAYS,
} from '../src/services/releaseCatalogService';

async function runReleaseCatalogRegressionTests() {
  console.log('🧪 Running Release Catalog Regression Tests...');
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

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Dynamic local date calculation test
  const localDateInfo = getDynamicLocalDate();
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(localDateInfo.dateStr),
    'getDynamicLocalDate returns valid YYYY-MM-DD string dynamically'
  );
  assert(
    localDateInfo.dateStr !== '2026-07-24' && localDateInfo.dateStr !== '2026-07-01',
    'Date calculation is dynamic (not hardcoded to 2026-07-24 or 2026-07-01)'
  );

  // 2. Dynamic Date Range Calculations
  const dayRange = calculateDynamicDateRange('day', '2026-08-03');
  assertEqual(dayRange.startDate, '2026-08-03', 'Day view start date === 2026-08-03');
  assertEqual(dayRange.endDate, '2026-08-03', 'Day view end date === 2026-08-03');

  const weekRange = calculateDynamicDateRange('week', '2026-08-03');
  assertEqual(weekRange.startDate, '2026-07-28', 'Week view start date === 2026-07-28 (7 rolling days)');
  assertEqual(weekRange.endDate, '2026-08-03', 'Week view end date === 2026-08-03');

  const monthRange = calculateDynamicDateRange('month', '2026-08-03');
  assertEqual(monthRange.startDate, '2026-08-01', 'Month view start date === 2026-08-01 (August 1st)');
  assertEqual(monthRange.endDate, '2026-08-03', 'Month view end date === 2026-08-03');

  // 3. August vs July boundary test
  const augustRange = calculateDynamicDateRange('month', '2026-08-15');
  assertEqual(augustRange.startDate, '2026-08-01', 'August month view uses August 1st (not July)');

  const augustKeys = getReleaseMonthKeys(2026, 8);
  assertEqual(augustKeys.partitionKey, '2026/08', 'Calendar uses the published slash-delimited monthly partition key');
  assertEqual(augustKeys.datePrefix, '2026-08', 'Calendar retains ISO date prefixes when filtering release records');

  const calendarDateRecord = {
    firstReleaseDate: '2026-08-01',
    firstReleaseDatePrecision: 'month',
    platformReleaseDates: [
      { p: 6, d: '2026-08-01', f: 'month' },
      { p: 48, d: '2026-08-20', f: 'day' },
      { p: 49, d: '2026-09-02', f: 'day' },
    ],
  };
  assertEqual(
    getExactCalendarReleaseDates(calendarDateRecord, 'first_release', '2026-08').length,
    0,
    'Calendar omits month-only first releases instead of placing them on the first',
  );
  assertEqual(
    getExactCalendarReleaseDates({ ...calendarDateRecord, firstReleaseDatePrecision: 'day' }, 'first_release', '2026-08')[0],
    '2026-08-01',
    'Calendar retains explicitly day-precision first releases',
  );
  assertEqual(
    getExactCalendarReleaseDates(calendarDateRecord, 'platform_release', '2026-08').join(','),
    '2026-08-20',
    'Calendar includes only exact platform releases inside the selected month',
  );
  assertEqual(
    getExactCalendarReleaseDates({ ...calendarDateRecord, platformReleaseDates: [{ p: 6, d: '2026-08-15' }] }, 'platform_release', '2026-08').length,
    0,
    'Calendar treats legacy platform dates without precision as unconfirmed',
  );

  assert(
    isUnreleasedFirstReleaseWithinRange({ firstReleaseDate: '2026-08-20' }, '2026-08-06', '2026-11-04'),
    'Upcoming includes games whose first release is still in the future',
  );
  assert(
    !isUnreleasedFirstReleaseWithinRange({ firstReleaseDate: '2018-10-26' }, '2026-08-06', '2026-11-04'),
    'Upcoming excludes older games even when they have later platform releases',
  );

  const upcomingRange = calculateDynamicDateRange('upcoming', '2026-08-06');
  assertEqual(UPCOMING_DISCOVERY_DAYS, 365, 'Upcoming uses a one-year default discovery horizon');
  assertEqual(upcomingRange.startDate, '2026-08-06', 'Upcoming starts on the current local date');
  assertEqual(upcomingRange.endDate, '2027-08-06', 'Upcoming includes anticipated releases throughout the next year');
  assertEqual(calculateDynamicDateRange('upcoming', '2026-08-06', 90).endDate, '2026-11-04', 'Upcoming supports a 90-day discovery horizon');
  assertEqual(calculateDynamicDateRange('upcoming', '2026-08-06', 180).endDate, '2027-02-02', 'Upcoming supports a 180-day discovery horizon');

  // 4. Converter test & Default Visibility
  const sampleRecord = {
    id: 'igdb:406526',
    sourceId: 406526,
    name: 'A Maze in Labyrinth',
    slug: 'a-maze-in-labyrinth',
    gameType: 'main_game',
    gameTypeLabel: 'Main Game',
    defaultVisible: true,
    firstReleaseDate: '2026-08-03',
    firstReleaseDatePrecision: 'day',
    platformReleaseDates: [{ platformId: 6, platformName: 'PC', date: '2026-08-03' }],
    platforms: [{ id: 6, name: 'PC', abbreviation: 'pc' }],
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1vcf.jpg',
    summaryPreview: 'A maze adventure game.',
    dataChunk: 'chunks/game_index_0005.json',
  };

  const gameItem = convertReleaseRecordToGameItem(sampleRecord);
  assertEqual(gameItem.title, 'A Maze in Labyrinth', 'Converter maps title correctly');
  assertEqual(gameItem.releaseDate, '2026-08-03', 'Converter maps releaseDate correctly');

  const popularitySorted = sortUpcomingReleaseRecordsByPopularity([
    {
      ...sampleRecord,
      id: 'igdb:2', sourceId: 2, name: 'Obscure Tomorrow', firstReleaseDate: '2026-08-07',
      rank: { totalRating: 8, totalRatingCount: 1, hypeCount: 0, metadataConfidence: 40 },
    },
    {
      ...sampleRecord,
      id: 'igdb:1', sourceId: 1, name: 'Major Release', firstReleaseDate: '2026-10-01',
      rank: { totalRating: 8, totalRatingCount: 25000, hypeCount: 800, metadataConfidence: 100, externalProductCount: 2 },
    },
  ] as any, '2026-08-06');
  assertEqual(popularitySorted[0].sourceId, 1, 'Upcoming default relevance heavily favors major popular games over obscure nearer releases');

  // 5. Release Manifest Path & Fallback URL Verification
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = String(input);
      requestedUrls.push(urlStr);

      if (urlStr.includes('browser_catalog_manifest.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ releaseManifest: 'releases/release_manifest.json' }),
        } as Response;
      }

      if (urlStr.includes('releases/release_manifest.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 1,
            generatedAt: '2026-08-03T00:00:00Z',
            recordCount: 1500,
            partitionCount: 4,
            partitions: [],
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      } as Response;
    }) as typeof globalThis.fetch;

    const manifest = await fetchReleaseManifest();
    assert(manifest.recordCount === 1500, 'fetchReleaseManifest successfully loads release manifest');
    assert(requestedUrls.some(u => u.includes('data/browser_catalog_manifest.json')), 'fetchReleaseManifest checks browser_catalog_manifest.json');
    assert(requestedUrls.some(u => u.includes('data/releases/release_manifest.json')), 'fetchReleaseManifest loads releases/release_manifest.json');
    assert(!requestedUrls.some(u => u.includes('release_catalog_manifest.json')), 'fetchReleaseManifest NEVER requests obsolete release_catalog_manifest.json');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 6. Release Record Batch Hydration & Order Preservation Test
  const { hydrateCompactRecordsBatch } = await import('../src/services/catalogDetailService');

  const unhydratedBatch = [
    { id: 101, name: 'Game Alpha', year: 2026, defaultVisible: true, chunk: 1 },
    { id: 102, name: 'Game Beta', year: 2026, defaultVisible: true, chunk: 1 },
    { id: 103, name: 'Game Gamma', year: 2026, defaultVisible: true, chunk: 2 },
  ];

  const mockChunkLoader = async (chunkFile: string) => {
    if (chunkFile.includes('0001')) {
      return [
        { id: 101, sourceId: 101, name: 'Game Alpha', cover_image_id: 'co101' },
        { id: 102, sourceId: 102, name: 'Game Beta', cover_image_id: 'co102' },
      ];
    }
    return [
      { id: 103, sourceId: 103, name: 'Game Gamma' }, // Missing cover (uses fallback)
    ];
  };

  const hydratedResults = await hydrateCompactRecordsBatch(unhydratedBatch as any, mockChunkLoader);
  assertEqual(hydratedResults.length, 3, 'Hydration preserves original batch size');
  assertEqual(hydratedResults[0].name, 'Game Alpha', 'Hydration preserves exact original order (Game Alpha first)');
  assertEqual(hydratedResults[1].name, 'Game Beta', 'Hydration preserves exact original order (Game Beta second)');
  assertEqual(hydratedResults[2].name, 'Game Gamma', 'Hydration preserves exact original order (Game Gamma third)');

  assert(Boolean(hydratedResults[0].coverUrl && hydratedResults[0].coverUrl.includes('co101')), 'Game Alpha hydrated with real cover URL');
  assert(Boolean(hydratedResults[1].coverUrl && hydratedResults[1].coverUrl.includes('co102')), 'Game Beta hydrated with real cover URL');
  assert(hydratedResults[2].coverUrl === undefined, 'Missing cover retains fallback state');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Release Catalog Regression Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runReleaseCatalogRegressionTests().catch(err => {
  console.error('❌ Release Catalog Regression Test Failed:', err);
  process.exit(1);
});
