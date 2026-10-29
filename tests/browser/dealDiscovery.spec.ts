import { test, expect } from '@playwright/test';

test('New Sales is default and discovery modes show genuine price drops and known endings', async ({ page }) => {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const iso = (offset: number) => new Date(now + offset).toISOString();
  const price = (amount: number) => ({ amount, amountFormatted: `$${amount}`, currency: 'USD' });
  const base = { storeId: '61', storeName: 'Steam', currentPrice: price(10), regularPrice: price(40), cut: 75, updatedAt: iso(-1), url: 'https://example.com', isHistoricalLow: false };
  const deals = [
    { ...base, gameId: 1, gameTitle: 'Older popular sale', itadId: 'one', popularityScore: 100, saleStartedAt: iso(-12 * hour), priceDroppedAt: iso(-hour), previousPrice: price(15), expiresAt: iso(10 * hour) },
    { ...base, gameId: 2, gameTitle: 'Newest sale', itadId: 'two', popularityScore: 20, saleStartedAt: iso(-hour), expiresAt: null },
    { ...base, gameId: 3, gameTitle: 'Recently reduced sale', itadId: 'three', popularityScore: 10, saleStartedAt: iso(-6 * hour), priceDroppedAt: iso(-hour / 2), previousPrice: price(30), expiresAt: iso(hour) },
  ];
  await page.route('**/data/deals.json', route => route.fulfill({ json: { schemaVersion: 1, generatedAt: iso(-1), totalDeals: deals.length, deals } }));
  await page.goto('/#/discounts');
  const sort = page.getByRole('combobox', { name: 'Sort deals' });
  const titles = page.getByTestId('deal-card').locator('h4');
  await expect(sort).toHaveValue('new_sales');
  await expect(titles).toHaveText(['Newest sale', 'Recently reduced sale', 'Older popular sale']);
  await sort.selectOption('price_drops');
  await expect(titles).toHaveText(['Recently reduced sale', 'Older popular sale']);
  await sort.selectOption('ending_soon');
  await expect(titles).toHaveText(['Recently reduced sale', 'Older popular sale']);
  await sort.selectOption('popular');
  await expect(titles.first()).toHaveText('Older popular sale');
  await page.getByPlaceholder('Search game title or store name...').fill('nothing matches');
  await page.getByRole('button', { name: 'Reset Filters', exact: true }).click();
  await expect(sort).toHaveValue('new_sales');
  await expect(titles.first()).toHaveText('Newest sale');
});
