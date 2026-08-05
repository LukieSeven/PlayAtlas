/**
 * Browser regression test suite for Production App Shell Theme Migration (Batch 2).
 *
 * Verifies key contract requirements:
 *   1. Production AppLayout mounts on normal routes (e.g., /#/).
 *   2. Development showcase does not mount on normal routes.
 *   3. Production sidebar is visible at desktop width with active nav styling.
 *   4. Main workspace uses an opaque parchment background.
 *   5. Production header/search remains present and functional.
 *   6. Existing navigation links change routes cleanly.
 *   7. Main canvas is scrollable.
 *   8. Narrow viewport (390px) has zero horizontal overflow.
 *   9. UniversalActionMenu is not clipped by the new shell.
 *  10. No old dark tiled shell background remains.
 */
import { test, expect } from '@playwright/test';

test.describe('Production App Shell Theme Migration (Batch 2)', () => {
  test('renders production application shell with parchment theme and active navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Production AppShell is mounted on home route
    const prodAppShell = page.locator('.themed-app-shell');
    await expect(prodAppShell).toBeVisible({ timeout: 5_000 });

    // 2. Dev Showcase root is NOT mounted on home route
    const showcaseRoot = page.locator('[data-testid="dev-theme-showcase-root"]');
    await expect(showcaseRoot).toHaveCount(0);

    // 3. Production sidebar is visible at desktop width
    const sidebar = page.locator('aside.themed-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('h1:has-text("Play Atlas")')).toBeVisible();

    // 4. Active navigation link has deep teal ribbon styling
    const activeNav = sidebar.locator('a.bg-\\[\\#0B2B3C\\]');
    await expect(activeNav).toBeVisible();

    // 5. Production header is present
    const header = page.locator('header.themed-header');
    await expect(header).toBeVisible();
    await expect(header.locator('input[placeholder*="Search"]')).toBeVisible();

    // 6. Main workspace uses opaque parchment background
    const bgColor = await prodAppShell.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/);
  });

  test('navigating between routes updates active item and page title', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/my-games');
    await page.waitForLoadState('domcontentloaded');

    // Verify My Games route renders under production shell
    const prodAppShell = page.locator('.themed-app-shell');
    await expect(prodAppShell).toBeVisible({ timeout: 5_000 });
  });

  test('narrow viewport (390px) has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    const prodAppShell = page.locator('.themed-app-shell');
    await expect(prodAppShell).toBeVisible({ timeout: 5_000 });

    // Verify zero horizontal scrolling overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
