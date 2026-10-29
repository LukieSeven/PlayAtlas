import type { GameDeal } from '../types/deals';
import { activeDeals } from './activeDeals';
import { comparePopularDeals } from './dealRanking';

export const RECENT_PRICE_DROP_MS = 7 * 24 * 60 * 60 * 1000;
export type DealDiscoveryMode = 'new_sales' | 'price_drops' | 'ending_soon';

function observedDate(value: string | undefined, now: number): number {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now ? timestamp : 0;
}

/** Legacy feeds can use ITAD's offer timestamp, never our daily polling time. */
export function saleStartedTime(deal: GameDeal, now = Date.now()): number {
  return observedDate(deal.saleStartedAt === undefined ? deal.sourceUpdatedAt : deal.saleStartedAt, now);
}

function dropAmount(deal: GameDeal): number {
  const previous = deal.previousPrice;
  return previous && previous.currency === deal.currentPrice.currency
    && Number.isFinite(previous.amount) && Number.isFinite(deal.currentPrice.amount)
    ? previous.amount - deal.currentPrice.amount : 0;
}

/** Returns fresh arrays so changing discovery modes cannot reorder the cache. */
export function discoverDeals(deals: GameDeal[], mode: DealDiscoveryMode, now = Date.now()): GameDeal[] {
  const current = activeDeals(deals, now);
  if (mode === 'new_sales') {
    return current.sort((a, b) => saleStartedTime(b, now) - saleStartedTime(a, now) || comparePopularDeals(a, b));
  }
  if (mode === 'price_drops') {
    return current.filter(deal => {
      const droppedAt = observedDate(deal.priceDroppedAt, now);
      return droppedAt > 0 && now - droppedAt <= RECENT_PRICE_DROP_MS && dropAmount(deal) > 0;
    }).sort((a, b) => observedDate(b.priceDroppedAt, now) - observedDate(a.priceDroppedAt, now)
      || dropAmount(b) - dropAmount(a) || comparePopularDeals(a, b));
  }
  return current.filter(deal => Boolean(deal.expiresAt) && Date.parse(deal.expiresAt!) > now)
    .sort((a, b) => Date.parse(a.expiresAt!) - Date.parse(b.expiresAt!) || comparePopularDeals(a, b));
}
