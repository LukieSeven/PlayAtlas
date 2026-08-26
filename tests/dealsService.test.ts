import {
  setDealsDatasetCache,
  clearDealsCache,
  getDealsForGame,
  getBestDealForGame,
  getAllDeals,
  getGiveawaysAndFreebies,
} from '../src/services/dealsService';
import { DealsDataset, GameDeal } from '../src/types/deals';

console.log('🧪 Running ITAD Deals Service Layer Unit Tests...');

const sampleDeals: GameDeal[] = [
  {
    gameId: 101,
    itadId: 'uuid-101-steam',
    storeId: 'steam',
    storeName: 'Steam',
    regularPrice: { amount: 59.99, amountFormatted: '$59.99', currency: 'USD' },
    currentPrice: { amount: 29.99, amountFormatted: '$29.99', currency: 'USD' },
    cut: 50,
    url: 'https://store.steampowered.com/app/101',
    isHistoricalLow: true,
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
  {
    gameId: 101,
    itadId: 'uuid-101-gog',
    storeId: 'gog',
    storeName: 'GOG',
    regularPrice: { amount: 59.99, amountFormatted: '$59.99', currency: 'USD' },
    currentPrice: { amount: 19.99, amountFormatted: '$19.99', currency: 'USD' },
    cut: 66,
    url: 'https://www.gog.com/game/101',
    isHistoricalLow: true,
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
  {
    gameId: 102,
    itadId: 'uuid-102-epic',
    storeId: 'epic',
    storeName: 'Epic Games Store',
    regularPrice: { amount: 29.99, amountFormatted: '$29.99', currency: 'USD' },
    currentPrice: { amount: 0.0, amountFormatted: '$0.00', currency: 'USD' },
    cut: 100,
    url: 'https://store.epicgames.com/p/102',
    isHistoricalLow: false,
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
  {
    gameId: 103,
    itadId: 'uuid-103-humble',
    storeId: 'humble',
    storeName: 'Humble Store',
    regularPrice: { amount: 39.99, amountFormatted: '$39.99', currency: 'USD' },
    currentPrice: { amount: 31.99, amountFormatted: '$31.99', currency: 'USD' },
    cut: 20,
    url: 'https://www.humblebundle.com/store/103',
    isHistoricalLow: false,
    updatedAt: '2026-08-25T00:00:00.000Z',
  },
];

const sampleDataset: DealsDataset = {
  schemaVersion: 1,
  generatedAt: '2026-08-25T00:00:00.000Z',
  totalDeals: sampleDeals.length,
  deals: sampleDeals,
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  clearDealsCache();
  setDealsDatasetCache(sampleDataset);

  // Test 1: getDealsForGame
  const game101Deals = await getDealsForGame(101);
  assert(game101Deals.length === 2, 'getDealsForGame(101) returns 2 deals');
  assert(game101Deals[0].storeId === 'steam' && game101Deals[1].storeId === 'gog', 'Game 101 has Steam and GOG deals');

  const unknownDeals = await getDealsForGame(999);
  assert(unknownDeals.length === 0, 'getDealsForGame(999) returns empty array for unknown game');

  // Test 2: getBestDealForGame
  const best101 = await getBestDealForGame(101);
  assert(best101 !== null && best101.storeId === 'gog' && best101.cut === 66, 'getBestDealForGame(101) selects GOG 66% deal');

  const bestUnknown = await getBestDealForGame(999);
  assert(bestUnknown === null, 'getBestDealForGame(999) returns null');

  // Test 3: minDiscount filter
  const deals50Plus = await getAllDeals({ minDiscount: 50 });
  assert(deals50Plus.length === 3, 'getAllDeals({ minDiscount: 50 }) returns 3 deals');

  // Test 4: maxPrice filter
  const under25 = await getAllDeals({ maxPrice: 25 });
  assert(under25.length === 2, 'getAllDeals({ maxPrice: 25 }) returns 2 deals under $25');

  // Test 5: storeId filter
  const steamDeals = await getAllDeals({ storeId: 'steam' });
  assert(steamDeals.length === 1 && steamDeals[0].storeName === 'Steam', 'getAllDeals({ storeId: "steam" }) filters Steam deal');

  // Test 6: historicalLowOnly filter
  const historicalLows = await getAllDeals({ historicalLowOnly: true });
  assert(historicalLows.length === 2 && historicalLows.every(d => d.isHistoricalLow), 'getAllDeals({ historicalLowOnly: true }) filters historical lows');

  // Test 7: freebies filter
  const freebies = await getGiveawaysAndFreebies();
  assert(freebies.length === 1 && freebies[0].gameId === 102 && freebies[0].currentPrice.amount === 0, 'getGiveawaysAndFreebies() returns 100% freebie');

  // Test 8: Sorting
  const sortedByDiscount = await getAllDeals({ sortBy: 'discount' });
  assert(sortedByDiscount[0].cut === 100, 'sortBy: discount puts 100% first');

  const sortedByPriceLow = await getAllDeals({ sortBy: 'price_low' });
  assert(sortedByPriceLow[0].currentPrice.amount === 0, 'sortBy: price_low puts $0.00 first');

  // Test 9: Empty dataset safety
  setDealsDatasetCache({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalDeals: 0,
    deals: [],
  });

  const emptyDeals = await getAllDeals();
  assert(emptyDeals.length === 0, 'Empty dataset returns empty array');

  console.log('\n----------------------------------------------------');
  console.log(`📊 ITAD Deals Test Results: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running dealsService unit tests:', err);
  process.exit(1);
});
