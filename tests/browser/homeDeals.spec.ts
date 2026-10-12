import { test, expect } from '@playwright/test';

test('Home shows the top ten popular deals without loading the full feed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('playatlas_home_widgets_v1', JSON.stringify({
    schemaVersion: 2, visible: ['deals'], widths: { deals: 'half' },
  })));
  let fullFeedRequests = 0;
  await page.route('**/data/deals.json', route => {
    fullFeedRequests++;
    return route.fulfill({ status: 500 });
  });
  const deals = Array.from({ length: 12 }, (_, index) => ({
    gameId: index + 1, gameTitle: `Popular deal ${index + 1}`, itadId: `uuid-${index + 1}`,
    storeId: '61', storeName: 'Steam', popularityScore: (index + 1) * 5,
    regularPrice: { amount: 20, amountFormatted: '$20.00', currency: 'USD' },
    currentPrice: { amount: 10, amountFormatted: '$10.00', currency: 'USD' },
    cut: 50, url: 'https://isthereanydeal.com/', isHistoricalLow: false, updatedAt: '2026-10-11T00:00:00Z',
  }));
  await page.route('**/data/deals-preview.json', route => route.fulfill({ json: {
    schemaVersion: 1, generatedAt: '2026-10-11T00:00:00Z', totalDeals: deals.length, deals,
  } }));
  await page.goto('/');
  const list = page.getByRole('list', { name: 'Top 10 deals' });
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await expect(list.getByRole('listitem').first()).toContainText('Popular deal 12');
  await expect(list.getByText('Popular deal 1', { exact: true })).toHaveCount(0);
  await expect(list.getByRole('link').first()).toHaveAttribute('href', 'https://isthereanydeal.com/');
  expect(fullFeedRequests).toBe(0);
});
