import {
  normalizeEntityName,
  normalizeEntityNames,
  convertIgdbRecordToGameItem,
  mapRawCatalogRecordToGameDetail,
  getGameDetailForCompactRecord,
} from '../src/services/catalogDetailService';

async function runCatalogDetailTests() {
  console.log('🧪 Running Catalog Detail Conversion & Entity Normalization Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`);
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

  // 1. Entity Normalization Unit Tests
  assertEqual(normalizeEntityName('  CD Projekt RED  '), 'CD Projekt RED', 'Normalizes string with leading/trailing spaces');
  assertEqual(normalizeEntityName({ id: 123, name: 'CD Projekt RED' }), 'CD Projekt RED', 'Normalizes entity object with name property');
  assertEqual(normalizeEntityName({ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }), 'PC', 'Prefers abbreviation when present');
  assertEqual(normalizeEntityName(null, 'Fallback'), 'Fallback', 'Returns fallback for null input');
  assertEqual(normalizeEntityName(undefined, 'Fallback'), 'Fallback', 'Returns fallback for undefined input');

  // 2. Entity Names Array Normalization Unit Tests
  const rawGenres = [{ id: 12, name: 'Role-playing (RPG)' }, { id: 12, name: 'Role-playing (RPG)' }, 'Adventure', null];
  assertEqual(normalizeEntityNames(rawGenres), ['Role-playing (RPG)', 'Adventure'], 'Deduplicates and filters non-string objects');

  const rawPlatforms = [{ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }, { id: 48, name: 'PlayStation 4', abbreviation: 'PS4' }];
  assertEqual(normalizeEntityNames(rawPlatforms), ['PC', 'PS4'], 'Normalizes platforms array to primitive abbreviations');

  // 3. Full IGDB Record Conversion Test
  const mockIgdbRecord = {
    sourceId: 1942,
    name: 'The Witcher 3: Wild Hunt',
    summary: 'The Witcher: Wild Hunt is a story-driven, next-generation open world role-playing game.',
    firstReleaseDate: '2015-05-19',
    rating: 96.5,
    gameType: 'main_game',
    genres: [{ id: 12, name: 'Role-playing (RPG)' }],
    developer: { id: 123, name: 'CD Projekt RED' },
    platforms: [{ id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' }],
    cover_image_id: 'co1wyy',
  };

  const convertedItem = convertIgdbRecordToGameItem(mockIgdbRecord);

  assertEqual(typeof convertedItem.title, 'string', 'GameItem.title is a primitive string');
  assertEqual(convertedItem.title, 'The Witcher 3: Wild Hunt', 'Converted title matches IGDB record');
  assertEqual(typeof convertedItem.developer, 'string', 'GameItem.developer is a primitive string');
  assertEqual(convertedItem.developer, 'CD Projekt RED', 'Converted developer matches nested object name');
  assertEqual(convertedItem.genres, ['Role-playing (RPG)'], 'Converted genres is array of primitive strings');
  assertEqual(convertedItem.platforms, ['PC'], 'Converted platforms is array of primitive strings');

  // 4. Test Involved Companies Developer Fallback
  const mockInvolvedCompanyRecord = {
    sourceId: 9999,
    name: 'Test RPG',
    involvedCompanies: [
      { developer: false, company: { name: 'Publisher Inc' } },
      { developer: true, company: { name: 'Awesome Dev Studio' } },
    ],
    genres: ['RPG'],
    platforms: ['PC'],
  };

  const convertedInvolvedItem = convertIgdbRecordToGameItem(mockInvolvedCompanyRecord);
  assertEqual(convertedInvolvedItem.developer, 'Awesome Dev Studio', 'Resolves developer from involvedCompanies array');

  // 5. GameDetailRecord Mapper & Exact Record.Chunk Detail Lookup Unit Tests
  const compactRecord = {
    id: 1942,
    name: 'The Witcher 3: Wild Hunt',
    year: 2015,
    chunk: 35, // Chunk index > 20 to test no gameId-modulo chunk calculation
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
  };

  const mappedDetail = mapRawCatalogRecordToGameDetail(mockIgdbRecord, compactRecord as any);
  assertEqual(mappedDetail.id, 1942, 'GameDetailRecord maps id correctly');
  assertEqual(mappedDetail.name, 'The Witcher 3: Wild Hunt', 'GameDetailRecord maps name (not title)');
  assertEqual(mappedDetail.releaseYear, 2015, 'GameDetailRecord maps releaseYear');
  assertEqual(mappedDetail.summary, mockIgdbRecord.summary, 'GameDetailRecord maps summary');
  assertEqual(mappedDetail.developer, 'CD Projekt RED', 'GameDetailRecord maps developer');

  let loadedChunkFile = '';
  const mockChunkLoader = async (chunkFile: string) => {
    loadedChunkFile = chunkFile;
    return [mockIgdbRecord];
  };

  const detailResult = await getGameDetailForCompactRecord(compactRecord as any, mockChunkLoader);
  assertEqual(loadedChunkFile, 'chunks/game_index_0035.json.gz', 'getGameDetailForCompactRecord loads exact record.chunk file (0035)');
  assert(Boolean(detailResult && detailResult.name === 'The Witcher 3: Wild Hunt'), 'getGameDetailForCompactRecord returns valid GameDetailRecord');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Catalog Detail Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCatalogDetailTests().catch(err => {
  console.error('❌ Catalog Detail Test Failed:', err);
  process.exit(1);
});
