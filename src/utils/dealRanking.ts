import type { GameDeal } from '../types/deals';

export function comparePopularDeals(a: GameDeal, b: GameDeal): number {
  const score = (deal: GameDeal) => {
    const discounted = deal.cut > 0 || deal.currentPrice.amount < deal.regularPrice.amount;
    const popularity = Number.isFinite(deal.popularityScore) ? Math.max(0, Math.min(100, deal.popularityScore!)) : 0;
    return (discounted ? 1000 : 0) + popularity * 0.8 + Math.max(0, Math.min(100, deal.cut)) * 0.2;
  };
  return score(b) - score(a) || b.cut - a.cut || a.gameId - b.gameId;
}

export function topPopularDeals(deals: GameDeal[]): GameDeal[] {
  return deals.filter(deal => deal.cut > 0 || deal.currentPrice.amount < deal.regularPrice.amount)
    .sort(comparePopularDeals).slice(0, 10);
}
