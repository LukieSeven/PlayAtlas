import { test, expect } from '@playwright/test';

test('production-size feed renders bounded pages and remains searchable', async ({ page }) => {
  const price = { amount: 10, amountFormatted: '$10.00', currency: 'USD' };
  const deals = Array.from({ length: 126511 }, (_, index) => ({
    gameId: index + 1, gameTitle: `Catalog game ${String(index + 1).padStart(6, '0')}`,
    itadId: `uuid-${index + 1}`, storeId: '61', storeName: 'Steam',
    currentPrice: price, regularPrice: { ...price, amount: 20 }, cut: 50,
    url: 'https://isthereanydeal.com/', isHistoricalLow: false,
    updatedAt: '2026-10-11T00:00:00Z',
  }));
  await page.route('**/data/deals.json', route => route.fulfill({ json: {
    schemaVersion: 1, generatedAt: '2026-10-11T00:00:00Z', totalDeals: deals.length, deals,
  } }));
  await page.goto('/#/discounts');
  const cards = page.getByTestId('deal-card');
  await expect(cards).toHaveCount(48, { timeout: 20000 });
  await expect(page.getByText('Catalog game 000001', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Catalog game 000049', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(48);
  await page.getByPlaceholder('Search game title or store name...').fill('Catalog game 126511');
  await expect(cards).toHaveCount(1);
  await expect(page.getByText('Catalog game 126511', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
});

test('title search and numeric storefront filters work and retain all store options', async ({ page }) => {
  const price = (amount: number) => ({ amount, amountFormatted: `$${amount.toFixed(2)}`, currency: 'USD' });
  const deal = (gameId: number, title: string, storeId: string, storeName: string) => ({
    gameId, gameTitle: title, itadId: `uuid-${gameId}`, storeId, storeName,
    currentPrice: price(10), regularPrice: price(20), cut: 50,
    url: 'https://isthereanydeal.com/', isHistoricalLow: false,
    updatedAt: '2026-10-11T00:00:00Z',
  });
  await page.route('**/data/deals.json', route => route.fulfill({ json: {
    schemaVersion: 1, generatedAt: '2026-10-11T00:00:00Z', totalDeals: 2,
    deals: [deal(101, 'Elden Ring', '61', 'Steam'), deal(102, 'Baldurs Gate', '35', 'GOG')],
  } }));
  await page.goto('/#/discounts');
  await expect(page.getByText('Elden Ring', { exact: true })).toBeVisible();
  await expect(page.getByText('Baldurs Gate', { exact: true })).toBeVisible();
  const search = page.getByPlaceholder('Search game title or store name...');
  await search.fill('ELDEN');
  await expect(page.getByText('Elden Ring', { exact: true })).toBeVisible();
  await expect(page.getByText('Baldurs Gate', { exact: true })).toHaveCount(0);
  await search.fill('');
  const stores = page.locator('select').filter({ has: page.locator('option[value="61"]') });
  await stores.selectOption('61');
  await expect(page.getByText('Elden Ring', { exact: true })).toBeVisible();
  await expect(page.getByText('Baldurs Gate', { exact: true })).toHaveCount(0);
  await expect(stores.locator('option[value="35"]')).toHaveCount(1);
  await stores.selectOption('35');
  await expect(page.getByText('Baldurs Gate', { exact: true })).toBeVisible();
  await expect(page.getByText('Elden Ring', { exact: true })).toHaveCount(0);
});
