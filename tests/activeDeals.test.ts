import assert from 'node:assert/strict';
import { activeDeals, isActiveDeal, MAX_DEAL_AGE_MS } from '../src/utils/activeDeals';
import { getAllDeals, getTopDeals, setDealsDatasetCache, clearDealsCache } from '../src/services/dealsService';
import { topPopularDeals } from '../src/utils/dealRanking';
import type { GameDeal } from '../src/types/deals';

const now = Date.now();
const deal: GameDeal = {
  gameId: 1, gameTitle: 'Current sale', itadId: 'uuid', storeId: '61', storeName: 'Steam',
  regularPrice: { amount: 20, amountFormatted: '$20', currency: 'USD' },
  currentPrice: { amount: 10, amountFormatted: '$10', currency: 'USD' },
  cut: 50, url: 'https://example.com', isHistoricalLow: false, updatedAt: new Date(now).toISOString(),
};
assert.equal(isActiveDeal(deal, now), true);
assert.equal(isActiveDeal({ ...deal, expiresAt: new Date(now).toISOString() }, now), false);
assert.equal(isActiveDeal({ ...deal, expiresAt: 'invalid' }, now), false);
assert.equal(isActiveDeal({ ...deal, expiresAt: new Date(now + 1).toISOString() }, now), true);
assert.equal(isActiveDeal({ ...deal, expiresAt: null }, now + MAX_DEAL_AGE_MS), false);
assert.equal(isActiveDeal({ ...deal, updatedAt: 'invalid' }, now), false);
assert.equal(isActiveDeal({ ...deal, cut: 0 }, now), false);
assert.equal(isActiveDeal({ ...deal, currentPrice: deal.regularPrice }, now), false);
assert.equal(isActiveDeal({ ...deal, currentPrice: { ...deal.currentPrice, amount: 0 }, cut: 100 }, now), true);
const expired = { ...deal, expiresAt: new Date(now - 1).toISOString() };
assert.equal(activeDeals([deal, expired], now).length, 1);
assert.equal(topPopularDeals([expired]).length, 0);

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
try {
  let clock = now;
  Date.now = () => clock;
  let fetches = 0;
  globalThis.fetch = async (_url, options) => {
    fetches++;
    assert.equal(options?.cache, 'no-cache');
    const offer = { ...deal, expiresAt: new Date(now + 60_000).toISOString() };
    return new Response(JSON.stringify({ schemaVersion: 1, generatedAt: deal.updatedAt, totalDeals: 1, deals: [offer] }));
  };
  clearDealsCache();
  assert.equal((await getTopDeals()).length, 1);
  clock += 60_000;
  assert.equal((await getTopDeals()).length, 0, 'cached Home offer expires without a reload');
  assert.equal(fetches, 1);
  clock = now + 5 * 60_000;
  await getTopDeals();
  assert.equal(fetches, 2, 'Home revalidates after five minutes');
  clock = now;
  setDealsDatasetCache({ schemaVersion: 1, generatedAt: deal.updatedAt, totalDeals: 2, deals: [deal, expired] });
  assert.equal((await getAllDeals()).length, 1);
  clock += MAX_DEAL_AGE_MS;
  assert.equal((await getAllDeals()).length, 0, 'stale prices cannot survive indefinitely');
} finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  clearDealsCache();
}
console.log('Active deals expiry and cache regression checks passed.');
