import { test, expect, type Locator } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { themePresets } from '../../src/config/themePresets';

async function expectAlignedActions(toolbar: Locator) {
  const boxes = await toolbar.locator('button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect();
    const icon = button.querySelector('svg')!.getBoundingClientRect();
    return { width: box.width, height: box.height, center: box.y + box.height / 2, iconX: icon.x + icon.width / 2 - box.x, iconY: icon.y + icon.height / 2 - box.y };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (const box of boxes) {
    expect(box.width).toBe(32);
    expect(box.height).toBe(32);
    expect(Math.abs(box.center - boxes[0].center)).toBeLessThan(1);
    expect(box.iconX).toBeCloseTo(16, 0);
    expect(box.iconY).toBeCloseTo(16, 0);
  }
}

for (const preset of Object.keys(themePresets)) test(`two consistent font families in ${preset}`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('playatlas_theme_preset_key', value), preset);
  await page.goto('/#/settings');
  await expect(page.locator('header h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('header h1').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Cormorant Garamond');
  expect(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Source Sans 3');
  const numericLabel = page.locator('.font-mono').first();
  expect(await numericLabel.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Source Sans 3');
});

for (const width of [1440, 390]) test(`card actions align across grid, list and expanded views at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/#/dev-component-review');
  await expect(page.getByTestId('game-card-variants')).toBeVisible();
  for (const toolbar of await page.locator('.atlas-card-actions').all()) await expectAlignedActions(toolbar);
  const expanded = page.locator('.atlas-game-card-expanded');
  expect((await expanded.boundingBox())!.width).toBeGreaterThan(220);
  expect((await expanded.boundingBox())!.width).toBeLessThanOrEqual(360);
  const widths = await expanded.evaluate(element => ({ card: element.clientWidth, art: element.firstElementChild!.getBoundingClientRect().width, padding: parseFloat(getComputedStyle(element).paddingLeft) * 2 }));
  expect(widths.art).toBeCloseTo(widths.card - widths.padding, 0);
  await expanded.screenshot({ path: `generated/readability/expanded-card-${width}.png` });
});

test('calendar expanded card, close control, import button and detail actions fit together', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const today = new Date().toLocaleDateString('en-CA');
  const records = [{ id: 99991, sourceId: 99991, name: 'Calendar alignment fixture', firstReleaseDate: today, firstReleaseDatePrecision: 'day', platforms: [{ id: 6, name: 'PC' }], platformReleaseDates: [], gameType: 'main_game', defaultVisible: true }];
  await page.route('**/data/browser_catalog_manifest.json', route => route.fulfill({ status: 404 }));
  await page.route('**/data/releases/release_manifest.json', route => route.fulfill({ json: { schemaVersion: 1, partitions: [{ key: today.slice(0, 4), file: 'releases/alignment.json.gz' }] } }));
  await page.route('**/data/releases/alignment.json.gz', route => route.fulfill({ body: gzipSync(JSON.stringify(records)) }));
  await page.goto('/#/calendar');
  await page.getByRole('button', { name: 'Expand Calendar alignment fixture' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Calendar alignment fixture calendar card' });
  await expect(dialog).toBeVisible();
  const card = dialog.locator('.atlas-game-card-expanded');
  await expectAlignedActions(card.locator('.atlas-card-actions'));
  const close = await dialog.getByRole('button', { name: 'Close expanded game' }).boundingBox();
  const box = await card.boundingBox();
  expect(close!.y + close!.height).toBeLessThanOrEqual(box!.y);
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.screenshot({ path: 'generated/readability/calendar-expanded-card.png' });
  await card.locator('h3').click();
  const actions = page.locator('.atlas-card-actions').last();
  await expectAlignedActions(actions);
});
