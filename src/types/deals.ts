/**
 * Type definitions for IsThereAnyDeal (ITAD) deals and discounts integration.
 */

export interface DealPrice {
  amount: number;
  amountFormatted: string;
  currency: string;
}

export interface GameDeal {
  gameId: number; // Play Atlas primitive numeric ID or IGDB sourceId
  gameTitle?: string; // Game display title (e.g. "Elden Ring")
  popularityScore?: number; // 0–100 IGDB catalog prominence score
  coverUrl?: string; // Cover artwork URL
  itadId: string; // ITAD game UUID
  storeId: string; // ITAD numeric shop ID serialized as a string (e.g. "61")
  storeName: string; // e.g. "Steam", "GOG", "Epic Games Store"
  regularPrice: DealPrice;
  currentPrice: DealPrice;
  cut: number; // discount percentage e.g. 50 for 50% off
  url: string; // direct storefront or deal URL
  isHistoricalLow: boolean;
  historyLowPrice?: DealPrice;
  voucher?: string | null;
  updatedAt: string; // ISO date string
  sourceUpdatedAt?: string; // ITAD's offer timestamp, distinct from our check time
  expiresAt?: string | null; // ITAD expiry; null means the source has no end date
  saleStartedAt?: string; // First observed in this continuous best-store sale
  priceDroppedAt?: string; // Last observed reduction for this same store/currency
  previousPrice?: DealPrice; // Price immediately before that reduction
}

export interface DealsDataset {
  schemaVersion: number;
  generatedAt: string;
  totalDeals: number;
  deals: GameDeal[];
}

export type DealSortMode = 'new_sales' | 'price_drops' | 'ending_soon' | 'popular' | 'discount' | 'price_low' | 'price_high' | 'title';

export interface DealsFilterOptions {
  minDiscount?: number; // e.g. 20 for >= 20% off
  maxPrice?: number; // e.g. 30 for <= $30
  storeId?: string; // filter by store ID
  historicalLowOnly?: boolean;
  freebiesOnly?: boolean;
  query?: string; // search term for game title
  sortBy?: DealSortMode;
}
