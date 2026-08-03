import {
  normalizeSearchQuery,
  getSearchBucketKey,
  getReleaseYearKey,
  buildCoverThumbnailUrl,
} from '../src/utils/browserCatalogUtils';

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

  // 2. Search Bucket Selection Tests
  assertEqual(getSearchBucketKey('castlevania'), 'c', 'castlevania -> bucket "c"');
  assertEqual(getSearchBucketKey('7 days to die'), '0-9', '7 days to die -> bucket "0-9"');
  assertEqual(getSearchBucketKey('okami'), 'o', 'okami -> bucket "o"');
  assertEqual(getSearchBucketKey(''), 'other', 'empty string -> bucket "other"');
  assertEqual(getSearchBucketKey('!special'), 'other', 'punctuation prefix -> bucket "other"');

  // 3. Release-Year Partition Assignment Tests
  assertEqual(getReleaseYearKey('2026-07-31'), '2026', '2026-07-31 -> year "2026"');
  assertEqual(getReleaseYearKey('1997-10-02'), '1997', '1997-10-02 -> year "1997"');
  assertEqual(getReleaseYearKey(null), 'undated', 'null release date -> "undated"');
  assertEqual(getReleaseYearKey(''), 'undated', 'empty release date -> "undated"');
  assertEqual(getReleaseYearKey('TBD'), 'undated', 'TBD release date -> "undated"');

  // 4. Cover Thumbnail URL Builder Tests
  assertEqual(
    buildCoverThumbnailUrl('co1vcf'),
    'https://images.igdb.com/igdb/image/upload/t_cover_small/co1vcf.jpg',
    'co1vcf -> IGDB small cover URL'
  );
  assertEqual(buildCoverThumbnailUrl(null), null, 'null imageId -> null cover thumbnail');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Unit Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserCatalogUnitTests();
