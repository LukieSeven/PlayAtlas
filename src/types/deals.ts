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
  itadId: string; // ITAD game UUID
  storeId: string; // e.g. "steam", "gog", "epic", "humble"
  storeName: string; // e.g. "Steam", "GOG", "Epic Games Store"
  regularPrice: DealPrice;
  currentPrice: DealPrice;
  cut: number; // discount percentage e.g. 50 for 50% off
  url: string; // direct storefront or deal URL
  isHistoricalLow: boolean;
  historyLowPrice?: DealPrice;
  voucher?: string | null;
  updatedAt: string; // ISO date string
}

export interface DealsDataset {
  schemaVersion: number;
  generatedAt: string;
  totalDeals: number;
  deals: GameDeal[];
}

export interface DealsFilterOptions {
  minDiscount?: number; // e.g. 20 for >= 20% off
  maxPrice?: number; // e.g. 30 for <= $30
  storeId?: string; // filter by store ID
  historicalLowOnly?: boolean;
  freebiesOnly?: boolean;
  query?: string; // search term for game title
  sortBy?: 'discount' | 'price_low' | 'price_high' | 'title';
}
