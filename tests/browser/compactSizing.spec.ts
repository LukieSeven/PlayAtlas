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
    const brand = await sidebar.locator('.atlas-sidebar-brand').evaluate(element => {
      const emblem = element.querySelector('.atlas-brand-emblem')!.getBoundingClientRect();
      const mark = element.querySelector('.atlas-wordmark-crop')!.getBoundingClientRect();
      return { emblem: emblem.width, mark: mark.width, overflow: element.scrollWidth - element.clientWidth };
    });
    expect(brand.emblem).toBe(52);
    expect(brand.mark).toBe(140);
    expect(brand.overflow).toBeLessThanOrEqual(1);
    for (const link of await sidebar.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    const home = sidebar.locator('.atlas-sidebar-home');
    const search = sidebar.getByRole('link', { name: 'Search Catalog', exact: true });
    const library = sidebar.locator('a[href="#/my-games"]');
    const font = (link: typeof home) => link.locator('.atlas-nav-label').evaluate(element => getComputedStyle(element).fontFamily);
    expect(await font(search)).toBe(await font(library));
    expect(await search.locator('svg').evaluate(element => element.innerHTML)).not.toBe(await library.locator('svg').evaluate(element => element.innerHTML));
    expect((await home.boundingBox())!.height).toBeGreaterThan((await library.boundingBox())!.height);
    expect((await search.boundingBox())!.y - ((await home.boundingBox())!.y + (await home.boundingBox())!.height)).toBeGreaterThanOrEqual(12);
    await home.click();
    await expect(home).toHaveAttribute('aria-current', 'page');
    await expect.poll(async () => { const ribbon = await libraryColor(home); return ribbon.background === ribbon.tail; }).toBe(true);
    fs.mkdirSync('generated/readability', { recursive: true });
    await sidebar.screenshot({ path: `generated/readability/compact-sidebar-${viewport.height}.png` });
  });
}

async function libraryColor(link: import('@playwright/test').Locator) {
  return link.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, tail: getComputedStyle(element, '::after').backgroundColor }));
}

test('hover color utilities do not recolor idle controls', async ({ page }) => {
  await page.goto('/#/my-games');
  await expect(page.locator('aside')).toBeVisible();
  const colors = await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.className = 'hover:bg-[#EFE8D8] hover:text-[#0B2B3C]';
    probe.style.color = 'rgb(255, 255, 255)';
    probe.style.backgroundColor = 'rgb(10, 20, 30)';
    document.body.append(probe);
    const result = { text: getComputedStyle(probe).color, background: getComputedStyle(probe).backgroundColor };
    probe.remove();
    return result;
  });
  expect(colors).toEqual({ text: 'rgb(255, 255, 255)', background: 'rgb(10, 20, 30)' });
});

for (const height of [844, 667]) test(`mobile default navigation fits without scrolling at ${height}px`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height });
  await page.goto('/#/my-games');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const drawer = page.locator('.atlas-compact-mobile-nav');
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
});
