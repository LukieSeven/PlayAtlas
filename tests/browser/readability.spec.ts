import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

for (const viewport of [{ width: 1920, height: 1000 }, { width: 1440, height: 1000 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
  test(`readable typography and layouts at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('playatlas_home_widgets_v1', JSON.stringify({ schemaVersion: 2, visible: ['deals', 'upcoming', 'releases', 'events'], widths: {} })));
    await page.route('**/dev-plugins/*.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export default {search:()=>[],sampleRandom:()=>null,createReleaseRecords:()=>[]}' }));
    const covers = ['co1q1f', 'coagib', 'cobkt6', 'co1rbe', 'co2p5w', 'co21a6'];
    const deals = ['Red Dead Redemption 2', 'Batman: Arkham Knight — Premium Edition', 'God of War', 'Assassin’s Creed Origins', 'Watch Dogs', 'Far Cry 5'].map((gameTitle, index) => ({
      gameId: index + 1, gameTitle, itadId: `uuid-${index}`, storeId: '61', storeName: ['Steam', 'Microsoft Store', 'GameBillet', 'Ubisoft Store', 'Ubisoft Store', 'Ubisoft Store'][index],
      coverUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${covers[index]}.jpg`, popularityScore: 100 - index,
      currentPrice: { amount: 14.99, amountFormatted: '$14.99', currency: 'USD' },
      regularPrice: { amount: 59.99, amountFormatted: '$59.99', currency: 'USD' },
      cut: 75, isHistoricalLow: index === 1, voucher: index >= 3 ? 'UBI40' : index === 1 ? 'ATLAS10' : null, url: 'https://isthereanydeal.com/', updatedAt: new Date().toISOString(),
    }));
    await page.route('**/data/deals*.json', route => route.fulfill({ json: { schemaVersion: 1, generatedAt: '2026-10-11', totalDeals: deals.length, deals } }));
    const directory = path.resolve('generated/readability');
    fs.mkdirSync(directory, { recursive: true });
    for (const route of ['discounts', '', 'my-games', 'settings', 'dev-component-review']) {
      await page.goto(`/#/${route}`);
      const title = route === 'discounts' ? 'Discounts' : route === 'my-games' ? 'My Games' : route === 'settings' ? 'Settings' : route === 'dev-component-review' ? 'Play Atlas Production' : 'Home';
      await expect(page.locator('header h1').first()).toContainText(title);
      await page.locator('main').evaluateAll(elements => elements.forEach(element => { element.scrollTop = 0; }));
      if (route === 'discounts') {
        const card = page.getByTestId('deal-card').first();
        await expect(card).toBeVisible();
        expect(await card.locator('h4').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(18);
        expect(await card.locator('a').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
        if (viewport.width === 1440) {
          const bounds = await card.boundingBox();
          expect(bounds!.width).toBeLessThanOrEqual(220);
          expect(bounds!.width * bounds!.height).toBeLessThanOrEqual(361 * 692 * 0.45);
        }
        const positions = await page.getByTestId('deal-card').evaluateAll(cards => cards.map(card => {
          const box = card.getBoundingClientRect();
          return { width: box.width, height: box.height, price: card.querySelector('.atlas-deal-price-row')!.getBoundingClientRect().top - box.top, action: card.querySelector('a')!.getBoundingClientRect().top - box.top };
        }));
        for (const position of positions) for (const key of ['width', 'height', 'price', 'action'] as const) expect(Math.abs(position[key] - positions[0][key])).toBeLessThan(1);
        const art = await card.locator('img').evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }));
        expect(art.height / art.width).toBeCloseTo(4 / 3, 1);
        await expect(page.getByTestId('deal-card').nth(1)).toContainText('Historical Low');
        await expect(page.getByTestId('deal-card').nth(1)).toContainText('Code: ATLAS10');
      }
      await expect(page.locator('header h1').first()).toBeVisible();
      if (route === '') {
        const headings = await page.locator('.atlas-widget-heading:visible').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.color].join('|');
        }));
        expect(headings.length).toBeGreaterThanOrEqual(4);
        expect(new Set(headings).size).toBe(1);
        expect(await page.locator('.atlas-widget-item-title').first().evaluate(element => getComputedStyle(element).fontSize)).toBe('18px');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const overflow = await page.locator('main').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1));
      expect(overflow, `${route} should not overflow the main canvas`).toBe(false);
      await page.screenshot({ path: path.join(directory, `${route || 'home'}-${viewport.width}.png`) });
      if (route === 'discounts') {
        await page.getByTestId('deal-card').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(directory, `discount-cards-${viewport.width}.png`) });
        if (viewport.width === 1920) await page.getByTestId('deal-card').first().locator('..').screenshot({ path: path.join(directory, 'uniform-deal-grid.png') });
        if (viewport.width === 1440) await page.getByTestId('deal-card').first().screenshot({ path: path.join(directory, 'readable-deal-card.png') });
      }
    }
  });
}
