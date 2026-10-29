import type { DealsDataset, GameDeal } from '../src/types/deals';

const validDate = (value: string | undefined, latest: number): string | undefined =>
  value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= latest ? value : undefined;
const key = (deal: GameDeal) => `${deal.itadId}:${deal.storeId}:${deal.currentPrice.currency}`;

/** Compare complete snapshots; a daily check is not a new sale. */
export function trackDealHistory(current: DealsDataset, previous: DealsDataset | null): DealsDataset {
  const previousTime = previous ? Date.parse(previous.generatedAt) : NaN;
  const currentTime = Date.parse(current.generatedAt);
  if (previous && (!Number.isFinite(previousTime) || previousTime > currentTime)) {
    throw new Error('Previous pricing history has an invalid or future date.');
  }
  const oldOffers = new Map((previous?.deals ?? []).map(deal => [key(deal), deal]));
  const deals = current.deals.map(deal => {
    const checkedAt = Date.parse(deal.updatedAt);
    if (!Number.isFinite(checkedAt)) throw new Error('Invalid price check date');
    const old = oldOffers.get(key(deal));
    const oldExpiry = old?.expiresAt ? Date.parse(old.expiresAt) : undefined;
    const continuing = old && old.cut > 0 && old.currentPrice.amount < old.regularPrice.amount
      && (oldExpiry === undefined || oldExpiry > checkedAt);
    // Unknown legacy dates remain unknown. Never mark the whole initial feed new.
    const baseline = validDate(old?.sourceUpdatedAt, checkedAt) ?? validDate(deal.sourceUpdatedAt, checkedAt);
    const saleStartedAt = continuing
      ? validDate(old.saleStartedAt, checkedAt) ?? baseline
      : previous ? current.generatedAt : baseline;
    const { priceDroppedAt: _oldDrop, previousPrice: _oldPrice, ...fresh } = deal;
    const tracked: GameDeal = { ...fresh, saleStartedAt };
    if (continuing && deal.currentPrice.amount < old.currentPrice.amount) {
      tracked.priceDroppedAt = current.generatedAt;
      tracked.previousPrice = old.currentPrice;
    } else if (continuing && validDate(old.priceDroppedAt, checkedAt)
      && old.previousPrice?.currency === deal.currentPrice.currency
      && old.previousPrice.amount > deal.currentPrice.amount) {
      tracked.priceDroppedAt = old.priceDroppedAt;
      tracked.previousPrice = old.previousPrice;
    }
    return tracked;
  });
  return { ...current, deals };
}
