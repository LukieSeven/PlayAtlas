/**
 * Frontend Data Service Layer for IsThereAnyDeal (ITAD) Deals & Discounts.
 * Loads and caches normalized deals dataset from public/data/deals.json.
 */

import { GameDeal, DealsDataset, DealsFilterOptions } from '../types/deals';
import { getBasePathAwareUrl } from './catalogDataSource';

let cachedDataset: DealsDataset | null = null;
let fetchPromise: Promise<DealsDataset> | null = null;

/**
 * Loads and caches normalized deals dataset.
 * Safely handles missing files or network issues by returning an empty dataset.
 */
export async function loadDealsDataset(): Promise<DealsDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const dealsUrl = getBasePathAwareUrl('data/deals.json');
      const response = await fetch(dealsUrl);
      if (!response.ok) {
        throw new Error(`Deals HTTP error status: ${response.status}`);
      }
      const data: DealsDataset = await response.json();
      cachedDataset = data;
      return data;
    } catch (err) {
      console.warn('Deals dataset unavailable or empty:', err);
      const emptyDataset: DealsDataset = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        totalDeals: 0,
        deals: [],
      };
      cachedDataset = emptyDataset;
      return emptyDataset;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Clear cached dataset (primarily for testing or manual refreshes).
 */
export function clearDealsCache(): void {
  cachedDataset = null;
  fetchPromise = null;
}

/**
 * Seed deals dataset into memory (primarily for unit tests).
 */
export function setDealsDatasetCache(dataset: DealsDataset): void {
  cachedDataset = dataset;
  fetchPromise = null;
}

/**
 * Retrieve all active deals for a specific game ID.
 */
export async function getDealsForGame(gameId: number | string): Promise<GameDeal[]> {
  const numericId = typeof gameId === 'number' ? gameId : parseInt(String(gameId).replace(/\D/g, ''), 10);
  if (isNaN(numericId)) return [];

  const dataset = await loadDealsDataset();
  return dataset.deals.filter(d => d.gameId === numericId);
}

/**
 * Retrieve the single best deal for a specific game ID (highest discount or lowest current price).
 */
export async function getBestDealForGame(gameId: number | string): Promise<GameDeal | null> {
  const deals = await getDealsForGame(gameId);
  if (deals.length === 0) return null;

  return deals.reduce((best, current) => {
    if (current.cut > best.cut) return current;
    if (current.cut === best.cut && current.currentPrice.amount < best.currentPrice.amount) return current;
    return best;
  }, deals[0]);
}

/**
 * Retrieve all deals matching optional filter criteria.
 */
export async function getAllDeals(filters?: DealsFilterOptions): Promise<GameDeal[]> {
  const dataset = await loadDealsDataset();
  let results = [...dataset.deals];

  if (!filters) {
    return results;
  }

  // Filter by query (store name or ITAD ID)
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      d =>
        d.storeName.toLowerCase().includes(q) ||
        d.storeId.toLowerCase().includes(q) ||
        String(d.gameId).includes(q)
    );
  }

  // Filter by minimum discount percentage
  if (filters.minDiscount !== undefined && filters.minDiscount > 0) {
    results = results.filter(d => d.cut >= filters.minDiscount!);
  }

  // Filter by maximum price ceiling
  if (filters.maxPrice !== undefined && filters.maxPrice >= 0) {
    results = results.filter(d => d.currentPrice.amount <= filters.maxPrice!);
  }

  // Filter by storefront
  if (filters.storeId && filters.storeId !== 'all') {
    const targetStore = filters.storeId.toLowerCase();
    results = results.filter(d => d.storeId.toLowerCase() === targetStore);
  }

  // Filter historical low deals only
  if (filters.historicalLowOnly) {
    results = results.filter(d => d.isHistoricalLow);
  }

  // Filter freebies only (100% off or $0 price)
  if (filters.freebiesOnly) {
    results = results.filter(d => d.currentPrice.amount === 0 || d.cut === 100);
  }

  // Apply sorting
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'discount':
        results.sort((a, b) => b.cut - a.cut);
        break;
      case 'price_low':
        results.sort((a, b) => a.currentPrice.amount - b.currentPrice.amount);
        break;
      case 'price_high':
        results.sort((a, b) => b.currentPrice.amount - a.currentPrice.amount);
        break;
    }
  }

  return results;
}

/**
 * Retrieve all giveaways and 100% freebies.
 */
export async function getGiveawaysAndFreebies(): Promise<GameDeal[]> {
  return getAllDeals({ freebiesOnly: true, sortBy: 'discount' });
}
