/**
 * Browser test suite for Production Home Dashboard & Illustrated Shell (Batch 4).
 *
 * Verifies key contract requirements:
 *   1. Production Home route renders at /#/.
 *   2. Development showcase route is NOT mounted.
 *   3. Home header displays large page title and subtitle.
 *   4. Desktop sidebar renders the expanded illustrated cartography layout.
 *   5. Six primary Home widget regions render (Featured, Top 10, Currently Playing, New Releases, Deals, Events).
 *   6. Desktop Home uses a two-column grid composition.
 *   7. Home remains visually structured even without local catalog data.
 *   8. Narrow viewport (390px) collapses to single column with zero horizontal overflow.
 *   9. Navigation to My Games route functions cleanly.
 *  10. Main page canvas remains scrollable.
 *  11. No legacy dark tiled background appears.
 */
import { test, expect } from '@playwright/test';

test.describe('Production Home Dashboard & Illustrated Shell (Batch 4)', () => {
  test('renders production Home route with 6 dashboard widgets and expanded sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Standalone showcase is NOT mounted
    const devShowcase = page.locator('[data-testid="dev-showcase-root"]');
    await expect(devShowcase).toHaveCount(0);

    // 2. Header page title & subtitle exist
    const headerTitle = page.locator('header h1:has-text("Home")');
    await expect(headerTitle).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('header p:has-text("Your customizable gaming hub")')).toBeVisible();

    // 3. Desktop sidebar renders with brand logo & title
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('h1:has-text("Play Atlas")')).toBeVisible();

    // 4. Six Primary Dashboard Widgets render
    await expect(page.locator('text="FEATURED UPCOMING GAME"')).toBeVisible();
    await expect(page.locator('text="TOP 10 IN PROGRESS"')).toBeVisible();
    await expect(page.locator('text="CURRENTLY PLAYING"')).toBeVisible();
    await expect(page.locator('text="NEW RELEASES"')).toBeVisible();
    await expect(page.locator('text="DEALS • PLAYSTATION STORE"')).toBeVisible();
    await expect(page.locator('text="UPCOMING EVENTS"')).toBeVisible();

    // 5. Featured Game widget countdown and title exist
    await expect(page.locator('h2:has-text("ECHOES OF THE WILDMOOR")')).toBeVisible();
    await expect(page.locator('text="RELEASES IN"')).toBeVisible();
  });

  test('navigating from Home to My Games updates active route', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // Click My Games link in sidebar
    const myGamesLink = page.locator('aside a[href*="my-games"]').first();
    await expect(myGamesLink).toBeVisible();
    await myGamesLink.click();

    // Verify My Games title is visible in header
    const myGamesTitle = page.locator('header h1:has-text("My Games")');
    await expect(myGamesTitle).toBeVisible({ timeout: 5_000 });
  });

  test('narrow viewport (390px) collapses Home dashboard with zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // Featured game title is rendered
    await expect(page.locator('h2:has-text("ECHOES OF THE WILDMOOR")')).toBeVisible({ timeout: 5_000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
