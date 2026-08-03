import {
  normalizeSearchQuery,
  tokenizeTitle,
  getTokenBucketKey,
  getReleaseYearKey,
  buildCoverThumbnailUrl,
} from '../src/utils/browserCatalogUtils';
import zlib from 'zlib';

function runBrowserCatalogUnitTests() {
  console.log('🧪 Running Browser Catalog Unit Tests...');
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

  // 1. Search Query Normalization Tests
  assertEqual(normalizeSearchQuery('Castlevania: Symphony of the Night'), 'castlevania symphony of the night', 'Normalizes case and punctuation');
  assertEqual(normalizeSearchQuery('  Ōkami  '), 'okami', 'Strips unicode diacritics and leading/trailing whitespace');
  assertEqual(normalizeSearchQuery('7 Days to Die'), '7 days to die', 'Preserves numbers and alphanumeric characters');
  assertEqual(normalizeSearchQuery('Grand   Theft   Auto'), 'grand theft auto', 'Collapses multiple internal spaces');

  // 2. Tokenization Tests
  const tokens1 = tokenizeTitle('The Witcher 3: Wild Hunt');
  assertEqual(tokens1.join(','), 'witcher,3,wild,hunt', 'Tokenizes title & discards 1-letter "the", retains "3"');

  const tokens2 = tokenizeTitle('Tom Clancy\'s Rainbow Six');
  assertEqual(tokens2.join(','), 'tom,clancy,rainbow,six', 'Strips punctuation & discards single letter "s"');

  // 3. Token Bucket Key Selection Tests (256 SHA-256 Buckets)
  assertEqual(getTokenBucketKey('witcher').length, 2, 'witcher -> 2 hex chars');
  assertEqual(getTokenBucketKey('zelda').length, 2, 'zelda -> 2 hex chars');

  // 4. Release-Year Partition Assignment Tests
  assertEqual(getReleaseYearKey('2026-07-31'), '2026', '2026-07-31 -> year "2026"');
  assertEqual(getReleaseYearKey('1997-10-02'), '1997', '1997-10-02 -> year "1997"');
  assertEqual(getReleaseYearKey(null), 'undated', 'null release date -> "undated"');
  assertEqual(getReleaseYearKey(''), 'undated', 'empty release date -> "undated"');
  assertEqual(getReleaseYearKey('TBD'), 'undated', 'TBD release date -> "undated"');

  // 5. Cover Thumbnail URL Builder Tests
  assertEqual(
    buildCoverThumbnailUrl('co1vcf'),
    'https://images.igdb.com/igdb/image/upload/t_cover_small/co1vcf.jpg',
    'co1vcf -> IGDB small cover URL'
  );
  assertEqual(buildCoverThumbnailUrl(null), null, 'null imageId -> null cover thumbnail');

  // 6. Gzip Compression/Decompression Sanity Test
  const sampleData = { game: 'The Witcher 3', id: 1942 };
  const jsonStr = JSON.stringify(sampleData);
  const compressedBuffer = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));
  const decompressedStr = zlib.gunzipSync(compressedBuffer).toString('utf-8');
  assertEqual(decompressedStr, jsonStr, 'Gzip compression and decompression works cleanly');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Unit Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserCatalogUnitTests();
