import { test, expect } from '@playwright/test';

test('review bar keeps animating at a measured percentage and respects reduced motion', async ({ page }) => {
  await page.goto('/#/dev-component-review');
  const bar = page.getByRole('progressbar', { name: 'Downloading catalog' });
  await expect(bar).toHaveAttribute('aria-valuenow', '62');
  await bar.scrollIntoViewIfNeeded();
  expect(await bar.locator('.atlas-loading-sheen').evaluate(element => getComputedStyle(element).animationName)).toBe('atlas-loading-travel');
  await bar.locator('..').screenshot({ path: 'generated/readability/catalog-loading-bar.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await bar.locator('.atlas-loading-sheen').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('catalog progress messages update the startup bar without finishing the load early', async ({ page }) => {
  await page.addInitScript(() => {
    const RealWorker = window.Worker;
    class FixtureWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        if (!String(url).includes('catalogFacets.worker')) return new RealWorker(url, options);
      }
      postMessage() {
        setTimeout(() => this.onmessage?.({ data: { progress: { phase: 'download', loaded: 250, total: 1000 } } } as MessageEvent), 0);
        window.addEventListener('catalog-test-unpack', () => this.onmessage?.({ data: { progress: { phase: 'unpack' } } } as MessageEvent));
        window.addEventListener('catalog-test-finish', () => this.onmessage?.({ data: { records: [{ id: 1, name: 'Loaded progress fixture' }] } } as MessageEvent));
      }
      terminate() { /* No network worker in this controlled progress fixture. */ }
    }
    window.Worker = FixtureWorker as unknown as typeof Worker;
  });
  await page.goto('/#/search');
  const download = page.getByRole('progressbar', { name: 'Downloading catalog' });
  await expect(download).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByTestId('startup-splash')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('catalog-test-unpack')));
  const unpack = page.getByRole('progressbar', { name: 'Unpacking catalog' });
  await expect(unpack).toBeVisible();
  await expect(unpack).not.toHaveAttribute('aria-valuenow');
  await page.evaluate(() => window.dispatchEvent(new Event('catalog-test-finish')));
  await expect(page.getByTestId('startup-splash')).toHaveCount(0);
  await expect(page.getByText('Loaded progress fixture', { exact: true }).first()).toBeVisible();
});
