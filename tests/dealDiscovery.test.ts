import assert from 'node:assert/strict';
import { discoverDeals, RECENT_PRICE_DROP_MS, saleStartedTime } from '../src/utils/dealDiscovery';
import { clearDealsCache, getAllDeals, setDealsDatasetCache } from '../src/services/dealsService';
import type { GameDeal } from '../src/types/deals';

const now = Date.now();
const hour = 60 * 60 * 1000;
const iso = (offset: number) => new Date(now + offset).toISOString();
const price = (amount: number, currency = 'USD') => ({ amount, currency, amountFormatted: `$${amount.toFixed(2)}` });
const make = (gameId: number, extra: Partial<GameDeal> = {}): GameDeal => ({
  gameId, gameTitle: `Game ${gameId}`, itadId: `uuid-${gameId}`, storeId: '61', storeName: 'Steam',
  regularPrice: price(40), currentPrice: price(10), cut: 75, popularityScore: 0,
  url: 'https://example.com', isHistoricalLow: false, updatedAt: iso(-1), ...extra,
});
const oldPopular = make(1, { saleStartedAt: iso(-12 * hour), popularityScore: 100 });
const newest = make(2, { saleStartedAt: iso(-hour) });
const undated = make(3, { popularityScore: 100 });
const legacy = make(4, { sourceUpdatedAt: iso(-2 * hour) });
const invalid = make(5, { saleStartedAt: 'broken', sourceUpdatedAt: iso(-hour) });
const future = make(6, { saleStartedAt: iso(hour) });
const expired = make(7, { saleStartedAt: iso(-10), expiresAt: iso(-1) });
const input = [undated, oldPopular, legacy, newest];
assert.deepEqual(discoverDeals(input, 'new_sales', now).map(deal => deal.gameId), [2, 4, 1, 3]);
assert.deepEqual(input.map(deal => deal.gameId), [3, 1, 4, 2], 'discovery does not mutate the shared dataset');
assert.equal(saleStartedTime(undated, now), 0, 'poll time cannot make an offer newly started');
assert.equal(saleStartedTime(invalid, now), 0);
assert.equal(saleStartedTime(future, now), 0);
assert.equal(discoverDeals([expired], 'new_sales', now).length, 0);
const tiePopular = make(8, { saleStartedAt: newest.saleStartedAt, popularityScore: 90 });
assert.deepEqual(discoverDeals([newest, tiePopular], 'new_sales', now).map(deal => deal.gameId), [8, 2]);

const newestDrop = make(10, { previousPrice: price(12), priceDroppedAt: iso(-hour) });
const largerDrop = make(11, { previousPrice: price(30), priceDroppedAt: iso(-hour) });
const olderDrop = make(12, { previousPrice: price(35), priceDroppedAt: iso(-2 * hour) });
const noDrop = make(13, { previousPrice: price(10), priceDroppedAt: iso(-hour) });
const wrongCurrency = make(14, { previousPrice: price(30, 'EUR'), priceDroppedAt: iso(-hour) });
const staleDrop = make(15, { previousPrice: price(30), priceDroppedAt: iso(-RECENT_PRICE_DROP_MS - 1) });
const futureDrop = make(16, { previousPrice: price(30), priceDroppedAt: iso(hour) });
assert.deepEqual(discoverDeals([olderDrop, noDrop, wrongCurrency, staleDrop, futureDrop, newestDrop, largerDrop], 'price_drops', now).map(deal => deal.gameId), [11, 10, 12]);
assert.equal(discoverDeals([make(17, { previousPrice: price(20), priceDroppedAt: 'invalid' })], 'price_drops', now).length, 0);

const endingLater = make(20, { expiresAt: iso(2 * hour) });
const endingNext = make(21, { expiresAt: iso(hour) });
assert.deepEqual(discoverDeals([endingLater, undated, expired, endingNext, make(22, { expiresAt: 'invalid' })], 'ending_soon', now).map(deal => deal.gameId), [21, 20]);

try {
  const serviceDeals = [oldPopular, newestDrop, { ...largerDrop, storeId: '35', storeName: 'GOG' }, endingLater, endingNext];
  setDealsDatasetCache({ schemaVersion: 1, generatedAt: iso(-1), totalDeals: serviceDeals.length, deals: serviceDeals });
  assert.deepEqual((await getAllDeals({ sortBy: 'price_drops', storeId: '61' })).map(deal => deal.gameId), [10]);
  assert.deepEqual((await getAllDeals({ sortBy: 'ending_soon' })).map(deal => deal.gameId), [21, 20]);
  assert.equal((await getAllDeals({ sortBy: 'popular' }))[0].gameId, 1, 'popular sorting remains available');
} finally { clearDealsCache(); }

console.log('Deal discovery sorting regression checks passed.');
