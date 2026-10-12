import { test, expect } from '@playwright/test';
import zlib from 'node:zlib';

const records = [
  { id: 101, name: 'Popular RPG', year: 2024, gameType: 'main_game', genres: ['Role-playing (RPG)'], platforms: ['PC (Microsoft Windows)'], developers: ['Studio Alpha'], publishers: ['Publisher One'], franchises: ['Atlas Saga'], catalogImportance: 90, rating: 9 },
  { id: 102, name: 'Other RPG', year: 2020, gameType: 'remake', genres: ['Role-playing (RPG)'], platforms: ['Nintendo Switch'], developers: ['Studio Beta'], publishers: ['Publisher One'], franchises: ['Other Saga'], catalogImportance: 20, rating: 7 },
  { id: 103, name: 'Puzzle Game', gameType: 'main_game', genres: ['Puzzle'], platforms: ['PC (Microsoft Windows)'], developers: ['Studio Alpha'], publishers: ['Publisher Two'], franchises: [], catalogImportance: 1 },
];
async function seed(page: import('@playwright/test').Page, games = records) {
  await page.route('**/data/catalog-facets.json.gz', route => route.fulfill({ contentType: 'application/gzip', body: zlib.gzipSync(JSON.stringify({ schemaVersion: 1, records: games })) }));
  const price = { amount: 10, amountFormatted: '$10.00', currency: 'USD' };
  await page.route('**/data/deals.json', route => route.fulfill({ json: { schemaVersion: 1, totalDeals: records.length, generatedAt: '2026-10-11', deals: records.map(game => ({ gameId: game.id, gameTitle: game.name, itadId: `${game.id}`, storeId: '61', storeName: 'Steam', currentPrice: price, regularPrice: price, cut: 50, url: 'https://example.com', isHistoricalLow: false })) } }));
}

test('catalog and discount filters combine, reset, and honor missing metadata', async ({ page }) => {
  await seed(page);
  for (const route of ['search', 'discounts']) {
    await page.goto(`/#/${route}`);
    await page.getByRole('button', { name: 'More game filters' }).click();
    await expect(page.getByText('Loading filter details...', { exact: true })).toHaveCount(0);
    await page.getByLabel('Genre', { exact: true }).fill('RPG');
    await page.getByLabel('Developer', { exact: true }).fill('alpha');
    await page.getByLabel('Publisher', { exact: true }).fill('one');
    await page.getByLabel('Platform', { exact: true }).fill('windows');
    await page.getByLabel('Franchise', { exact: true }).fill('atlas');
    await page.getByLabel('Game type', { exact: true }).selectOption('main_game');
    await page.getByLabel('Ownership', { exact: true }).selectOption('unowned');
    await expect(page.getByRole('heading', { name: 'Popular RPG', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Other RPG', exact: true })).toHaveCount(0);
    await page.getByLabel('Ownership', { exact: true }).selectOption('owned');
    await expect(page.getByRole('heading', { name: 'Popular RPG', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear game filters' }).click();
    await expect(page.getByRole('heading', { name: 'Other RPG', exact: true })).toBeVisible();
    if (route === 'search') {
      await page.getByLabel('Sort games').selectOption('yearAsc');
      await expect(page.locator('main h3').first()).toHaveText('Other RPG');
      await expect(page.locator('main h3').last()).toHaveText('Puzzle Game');
      await page.getByLabel('Sort games').selectOption('popularity');
      await expect(page.locator('main h3').first()).toHaveText('Popular RPG');
      await page.getByLabel('Sort games').selectOption('rating');
      await expect(page.locator('main h3').first()).toHaveText('Popular RPG');
    }
  }
});

test('failed index downloads can be retried without reloading the page', async ({ page }) => {
  let requests = 0;
  await page.route('**/data/catalog-facets.json.gz', route => {
    requests++;
    return requests <= 2 ? route.fulfill({ status: 503 }) : route.fulfill({ contentType: 'application/gzip', body: zlib.gzipSync(JSON.stringify({ schemaVersion: 1, records })) });
  });
  await page.goto('/#/search');
  await expect(page.getByRole('alert')).toContainText('Catalog search could not load');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Popular RPG', exact: true })).toBeVisible();
  expect(requests).toBe(3);
});

test('list building and full-catalog release search filter beyond the initial search limit', async ({ page }) => {
  const games = Array.from({ length: 101 }, (_, index) => ({ ...records[0], id: index + 1, name: `Scope Game ${index + 1}`, coverUrl: '/branding/play-atlas-compass-watercolor.png', genres: index === 100 ? ['Unique genre'] : ['RPG'] }));
  await seed(page, games);
  await page.route('**/data/browser_catalog_manifest.json', route => route.fulfill({ status: 503 }));
  for (const route of ['lists', 'new-releases']) {
    await page.goto(`/#/${route}`);
    await page.getByPlaceholder(route === 'lists' ? 'Search the full catalog to populate this list...' : 'Search full 370,000+ catalog across all platforms and release windows...').fill('Scope');
    await page.getByRole('button', { name: 'More game filters' }).click();
    await page.getByLabel('Genre', { exact: true }).fill('Unique genre');
    await expect(page.getByRole('heading', { name: 'Scope Game 101', exact: true })).toBeVisible();
    await expect(page.getByText('Showing 1 of 1', { exact: true })).toBeVisible();
  }
});

test('380882-record catalog filters beyond first page without rendering the full catalog', async ({ page }) => {
  test.setTimeout(90000);
  const games = Array.from({ length: 380882 }, (_, index) => ({ ...records[0], id: index + 1, name: `Game ${index + 1}`, genres: index === 380881 ? ['Unique genre'] : ['RPG'] }));
  await seed(page, games);
  await page.goto('/#/search');
  await expect(page.getByText('Showing 40 of 380,882', { exact: true })).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'More game filters' }).click();
  const start = Date.now();
  await page.getByLabel('Genre', { exact: true }).fill('Unique genre');
  await expect(page.getByRole('heading', { name: 'Game 380882', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Showing 1 of 1', { exact: true })).toBeVisible();
  const elapsed = Date.now() - start;
  console.log(`380882-record filter result: ${elapsed} ms including debounce and rendering.`);
  expect(elapsed).toBeLessThan(10000);
  await page.getByRole('textbox', { name: 'Search the catalog', exact: true }).fill('nonexistent game');
  await expect(page.getByRole('heading', { name: 'No Matching Games Found' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search the catalog', exact: true }).fill('');
  await page.getByRole('button', { name: 'Clear game filters' }).click();
  await page.getByLabel('Sort games').selectOption('name');
  await expect(page.getByText('Showing 40 of 380,882', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('main h3').first()).toHaveText('Game 1');
});

test('personal-library metadata and ownership filters use actual platforms, not game IDs', async ({ page }) => {
  await seed(page);
  await page.goto('/#/my-games');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('PlayAtlas_PersonalDataDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('personal_games', 'readwrite');
      for (const [id, name] of [[101, 'Popular RPG'], [102, 'Other RPG']] as const) transaction.objectStore('personal_games').put({ gameId: `igdb_${id}`, numericId: id, schemaVersion: 1, ownerships: id === 101 ? [{ platformId: 6, ownershipType: 'physical' }] : [], interestStatus: 'wanted', customTags: [], playSessions: [], completionHistory: [], catalogSnapshot: { name }, createdAt: '2026-10-11', updatedAt: '2026-10-11' });
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByRole('button', { name: 'More game filters' }).click();
  await expect(page.getByText('Loading filter details...', { exact: true })).toHaveCount(0);
  await page.getByLabel('Platform', { exact: true }).fill('windows');
  await page.getByLabel('Ownership', { exact: true }).selectOption('physical');
  await expect(page.getByRole('heading', { name: 'Popular RPG', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Other RPG', exact: true })).toHaveCount(0);
  await page.getByLabel('Developer', { exact: true }).fill('beta');
  await expect(page.getByRole('heading', { name: 'Popular RPG', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear game filters' }).click();
  await expect(page.getByRole('heading', { name: 'Other RPG', exact: true })).toBeVisible();
});
