import { buildCompactRankSignals, calculateCatalogImportance, normalizeIgdbRating } from '../src/utils/catalogRanking';
import { compareRecordsDeterministic } from '../src/services/tokenSearchService';
import { BATCH_LIMIT, normalizeRawIgdbRecord } from '../scripts/build-igdb-index';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
};

console.log('🧪 Running Catalog Ranking & Enrichment Tests...');

assert(BATCH_LIMIT === 200, 'Test importer defines 200-record query batches by default');
assert(normalizeIgdbRating(63) === 6.3, 'IGDB score 63 normalizes to 6.3 stars');
assert(normalizeIgdbRating(100) === 10, 'IGDB score 100 normalizes to 10 stars');
assert(normalizeIgdbRating(undefined) === undefined, 'Missing score remains unrated');

const establishedRank = buildCompactRankSignals({
  totalRating: 91,
  totalRatingCount: 25000,
  rating: 92,
  ratingCount: 24000,
  aggregatedRating: 88,
  aggregatedRatingCount: 120,
  hypeCount: 600,
  firstReleaseDate: '2023-05-12',
  coverImageId: 'co123',
  summary: 'Authoritative game.',
  platforms: [{ id: 130 }],
  companies: [{ id: 1 }],
  websites: [{ id: 1 }],
  externalProducts: [{ id: 1 }],
  franchises: [{ id: 1 }],
});

assert(establishedRank.totalRating === 9.1, 'Compact total rating uses the 0–10 scale');
assert(establishedRank.totalRatingCount === 25000, 'Compact signals retain rating evidence');
assert(establishedRank.metadataConfidence === 100, 'Complete records receive full metadata confidence');

const publishedGame = {
  id: 7346,
  name: 'The Great Adventure',
  year: 2017,
  gameType: 'main_game',
  defaultVisible: true,
  rank: establishedRank,
};
const derivativeMod = {
  id: 900001,
  name: 'Great Adventure: Community Mod',
  year: 2025,
  gameType: 'mod',
  defaultVisible: false,
  rank: buildCompactRankSignals({ totalRatingCount: 1 }),
};

assert(
  compareRecordsDeterministic(publishedGame, derivativeMod, 'great adventure', ['great', 'adventure']) < 0,
  'Established published games rank above derivative community content',
);
assert(
  calculateCatalogImportance(publishedGame) > calculateCatalogImportance(derivativeMod),
  'Durable evidence produces a higher catalog importance score',
);

const normalized = normalizeRawIgdbRecord({
  id: 42,
  name: 'Linked Game',
  game_type: { id: 0, type: 'Main Game' },
  rating: 63,
  rating_count: 30,
  websites: [
    { id: 1, type: { id: 1, type: 'Official' }, url: 'https://example.com', trusted: true },
    { id: 2, url: 'javascript:alert(1)', trusted: false },
  ],
  external_games: [{
    id: 3,
    external_game_source: { id: 1, name: 'Steam' },
    uid: '123',
    url: 'https://store.steampowered.com/app/123',
  }],
});

assert(normalized?.rating === 63, 'Full records preserve the original IGDB rating');
assert(normalized?.websites.length === 1, 'Only safe HTTP(S) website links are retained');
assert(normalized?.websites[0].type === 'Official', 'Website type is normalized');
assert(normalized?.externalProducts[0].source === 'Steam', 'External product source and URL are retained');

console.log(`\n📊 Catalog Ranking Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
