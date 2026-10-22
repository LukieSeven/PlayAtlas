import { test, expect, type Page } from '@playwright/test';
import zlib from 'node:zlib';
import fs from 'node:fs';

const catalog = zlib.gzipSync(JSON.stringify({ schemaVersion: 1, records: [{ id: 101, name: 'Ready Game', gameType: 'main_game', coverUrl: '/branding/play-atlas-compass-watercolor.png' }] }));
async function heldIndex(page: Page) {
  let release!: () => void;
  let requests = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/data/catalog-facets.json.gz', async route => { requests++; await held; await route.fulfill({ contentType: 'application/gzip', body: catalog }); });
  return { release, requests: () => requests };
}

for (const sample of [{ width: 1440, theme: 'watercolor_atlas' }, { width: 390, theme: 'watercolor_atlas' }, { width: 1440, theme: 'midnight_ocean' }]) {
  test(`themed splash holds the page until ready at ${sample.width}px with ${sample.theme}`, async ({ page }) => {
    await page.setViewportSize({ width: sample.width, height: sample.width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => localStorage.setItem('playatlas_theme_preset_key', theme), sample.theme);
    const index = await heldIndex(page);
    try {
      await page.goto('/#/search');
      await expect(page.getByText('Preparing catalog search', { exact: true })).toBeVisible();
      await expect(page.locator('main')).toHaveCount(0);
      await expect(page.getByRole('progressbar', { name: 'Downloading catalog' })).not.toHaveAttribute('aria-valuenow');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.atlas-startup-orbit').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
      await expect(page.locator('.atlas-startup-compass img')).toHaveJSProperty('complete', true);
      fs.mkdirSync('generated/readability', { recursive: true });
      await page.screenshot({ path: `generated/readability/startup-${sample.theme}-${sample.width}.png` });
      index.release();
      await expect(page.getByRole('heading', { name: 'Ready Game', exact: true })).toBeVisible();
      await expect(page.getByTestId('startup-splash')).toHaveCount(0);
      expect(index.requests()).toBe(1);
      if (sample.width < 640) await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('link', { name: 'My Games', exact: true }).click();
      await expect(page.locator('header h1')).toHaveText('My Games');
      await expect(page.getByTestId('startup-splash')).toHaveCount(0);
    } finally { index.release(); }
  });
}

test('failed deals download offers retry and can recover', async ({ page }) => {
  let requests = 0;
  await page.route('**/data/deals.json', route => {
    requests++;
    return requests === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: { schemaVersion: 1, totalDeals: 0, generatedAt: '2026-10-11', deals: [] } });
  });
  await page.goto('/#/discounts');
  await expect(page.getByRole('heading', { name: 'We couldn’t finish loading' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('header h1')).toHaveText('Discounts & Deals');
  await expect(page.getByTestId('startup-splash')).toHaveCount(0);
  expect(requests).toBe(2);
});

test('a slow download offers entry without locking navigation', async ({ page }) => {
  await page.clock.install();
  const index = await heldIndex(page);
  try {
    await page.goto('/#/search');
    await expect(page.getByText('Preparing catalog search', { exact: true })).toBeVisible();
    await page.clock.fastForward(12001);
    await page.getByRole('button', { name: 'Open atlas', exact: true }).click();
    await page.getByRole('link', { name: 'Settings & Customization', exact: true }).click();
    await expect(page.locator('header h1')).toHaveText('Settings');
    await expect(page.getByTestId('startup-splash')).toHaveCount(0);
  } finally { index.release(); }
});

test('a failed page bundle offers reload and recovers', async ({ page }) => {
  let requests = 0;
  await page.route('**/data/catalog-facets.json.gz', route => route.fulfill({ contentType: 'application/gzip', body: catalog }));
  await page.route('**/assets/SearchPage-*.js', route => { requests++; return requests === 1 ? route.abort() : route.continue(); });
  await page.goto('/#/search');
  await expect(page.getByRole('heading', { name: 'We couldn’t finish loading' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ready Game', exact: true })).toBeVisible();
});

test('the initial HTML offers recovery when the application script cannot load', async ({ page }) => {
  let requests = 0;
  await page.route('**/assets/index-*.js', route => { requests++; return requests === 1 ? route.abort() : route.continue(); });
  await page.goto('/#/my-games');
  await expect(page.getByText('We couldn’t open your atlas. Please try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('header h1')).toHaveText('My Games');
});
