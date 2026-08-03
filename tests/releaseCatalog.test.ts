import {
  getDynamicLocalDate,
  calculateDynamicDateRange,
  convertReleaseRecordToGameItem,
  fetchReleaseManifest,
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
