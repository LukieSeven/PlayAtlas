import type { GameDeal } from '../types/deals';

// Unknown end dates must not make a failed nightly refresh look current forever.
export const MAX_DEAL_AGE_MS = 26 * 60 * 60 * 1000;

export function isActiveDeal(deal: GameDeal, now = Date.now()): boolean {
  if (!(deal.cut > 0 && deal.currentPrice.amount < deal.regularPrice.amount)) return false;
  const checkedAt = Date.parse(deal.updatedAt);
  if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt >= MAX_DEAL_AGE_MS) return false;
  if (deal.expiresAt != null) {
    const expiry = Date.parse(deal.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now) return false;
  }
  return true;
}

export function activeDeals(deals: GameDeal[], now = Date.now()): GameDeal[] {
  return deals.filter(deal => isActiveDeal(deal, now));
}
