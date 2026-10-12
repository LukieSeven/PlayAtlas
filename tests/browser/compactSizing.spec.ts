import { test, expect } from '@playwright/test';
import fs from 'node:fs';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 600 }]) {
  test(`standard sidebar fits without scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/my-games');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: 'Settings & Customization' })).toBeVisible();
    const sizes = await sidebar.evaluate(element => {
      const navigation = element.querySelector('.atlas-sidebar-navigation')!;
      return { total: element.scrollHeight - element.clientHeight, nav: navigation.scrollHeight - navigation.clientHeight, width: element.getBoundingClientRect().width };
    });
    expect(sizes.total).toBeLessThanOrEqual(1);
    expect(sizes.nav).toBeLessThanOrEqual(1);
    expect(sizes.width).toBe(240);
    for (const link of await sidebar.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    const home = sidebar.getByRole('link', { name: 'Home', exact: true });
    const search = sidebar.getByRole('link', { name: 'Search Catalog', exact: true });
    const library = sidebar.locator('a[href="#/my-games"]');
    const font = (link: typeof home) => link.locator('.atlas-nav-label').evaluate(element => getComputedStyle(element).fontFamily);
    expect(await font(search)).toBe(await font(library));
    expect(await search.locator('svg').evaluate(element => element.innerHTML)).not.toBe(await library.locator('svg').evaluate(element => element.innerHTML));
    expect((await home.boundingBox())!.height).toBeGreaterThan((await library.boundingBox())!.height);
    expect((await search.boundingBox())!.y - ((await home.boundingBox())!.y + (await home.boundingBox())!.height)).toBeGreaterThanOrEqual(12);
    fs.mkdirSync('generated/readability', { recursive: true });
    await sidebar.screenshot({ path: `generated/readability/compact-sidebar-${viewport.height}.png` });
  });
}

for (const height of [844, 667]) test(`mobile default navigation fits without scrolling at ${height}px`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height });
  await page.goto('/#/my-games');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const drawer = page.locator('.atlas-compact-mobile-nav');
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
});
