import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDealsDatasetCache,
  clearDealsCache,
  getDealsForGame,
  getBestDealForGame,
  getAllDeals,
  getGiveawaysAndFreebies,
} from '../../src/services/dealsService';
import { DealsDataset, GameDeal } from '../../src/types/deals';

describe('ITAD Deals Service Layer (dealsService.ts)', () => {
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

  beforeEach(() => {
    clearDealsCache();
    setDealsDatasetCache(sampleDataset);
  });

  it('retrieves all deals for a specific game ID', async () => {
    const game101Deals = await getDealsForGame(101);
    expect(game101Deals).toHaveLength(2);
    expect(game101Deals.map(d => d.storeId)).toEqual(['steam', 'gog']);

    const unknownDeals = await getDealsForGame(999);
    expect(unknownDeals).toEqual([]);
  });

  it('selects the single best deal for a game ID', async () => {
    const best101 = await getBestDealForGame(101);
    expect(best101).not.toBeNull();
    expect(best101?.storeId).toBe('gog'); // 66% off > 50% off
    expect(best101?.cut).toBe(66);

    const bestUnknown = await getBestDealForGame(999);
    expect(bestUnknown).toBeNull();
  });

  it('filters deals by minimum discount percentage', async () => {
    const deals50Plus = await getAllDeals({ minDiscount: 50 });
    expect(deals50Plus).toHaveLength(3); // 50%, 66%, 100%

    const deals70Plus = await getAllDeals({ minDiscount: 70 });
    expect(deals70Plus).toHaveLength(1); // 100%
    expect(deals70Plus[0].gameId).toBe(102);
  });

  it('filters deals by maximum price ceiling', async () => {
    const under25 = await getAllDeals({ maxPrice: 25 });
    expect(under25).toHaveLength(2); // GOG $19.99, Epic $0.00
  });

  it('filters deals by storefront ID', async () => {
    const steamDeals = await getAllDeals({ storeId: 'steam' });
    expect(steamDeals).toHaveLength(1);
    expect(steamDeals[0].storeName).toBe('Steam');
  });

  it('filters historical low deals only', async () => {
    const historicalLows = await getAllDeals({ historicalLowOnly: true });
    expect(historicalLows).toHaveLength(2);
    expect(historicalLows.every(d => d.isHistoricalLow)).toBe(true);
  });

  it('filters giveaways and 100% freebies', async () => {
    const freebies = await getGiveawaysAndFreebies();
    expect(freebies).toHaveLength(1);
    expect(freebies[0].gameId).toBe(102);
    expect(freebies[0].currentPrice.amount).toBe(0);
  });

  it('sorts deals by discount, price_low, and price_high', async () => {
    const sortedByDiscount = await getAllDeals({ sortBy: 'discount' });
    expect(sortedByDiscount[0].cut).toBe(100);

    const sortedByPriceLow = await getAllDeals({ sortBy: 'price_low' });
    expect(sortedByPriceLow[0].currentPrice.amount).toBe(0);

    const sortedByPriceHigh = await getAllDeals({ sortBy: 'price_high' });
    expect(sortedByPriceHigh[0].currentPrice.amount).toBe(31.99);
  });

  it('handles empty dataset gracefully without crashing', async () => {
    setDealsDatasetCache({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      totalDeals: 0,
      deals: [],
    });

    const emptyDeals = await getAllDeals();
    expect(emptyDeals).toEqual([]);

    const bestEmpty = await getBestDealForGame(101);
    expect(bestEmpty).toBeNull();
  });
});
