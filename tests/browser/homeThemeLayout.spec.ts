/**
 * Browser test suite for Production Home Dashboard & Illustrated Shell (Batch 4 Correction).
 *
 * Verifies key contract requirements:
 *   1. Production Home route renders at /#/.
 *   2. Development showcase route is NOT mounted.
 *   3. Home header displays title "Home" and subtitle "Your customizable gaming hub".
 *   4. Desktop sidebar renders the expanded illustrated cartography layout.
 *   5. Six primary Home widget regions render (Featured, Top 10, Currently Playing, New Releases, Deals, Events).
 *   6. No hardcoded mockup titles (Echoes of the Wildmoor, Manor Lords, Elden Ring) appear on production Home route.
 *   7. No hardcoded obsolete 2024 event dates appear on production Home route.
 *   8. Navigating to My Games route updates header title to "My Games" (NOT "Home").
 *   9. Narrow viewport (390px) collapses to single column with zero horizontal overflow.
 */
import { test, expect } from '@playwright/test';

test.describe('Production Home Dashboard & Illustrated Shell (Batch 4 Correction)', () => {
  test('renders production Home route with 6 dashboard widget shells and no hardcoded mockup data', async ({ page }) => {
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
    await expect(page.locator('text="DISCOUNTS & DEALS"')).toBeVisible();
    await expect(page.locator('text="UPCOMING EVENTS"')).toBeVisible();

    // 5. Hardcoded mockup sample titles do NOT exist on production Home route
    await expect(page.locator('text="ECHOES OF THE WILDMOOR"')).toHaveCount(0);
    await expect(page.locator('text="Manor Lords"')).toHaveCount(0);
    await expect(page.locator('text="Elden Ring"')).toHaveCount(0);

    // 6. Hardcoded obsolete 2024 dates do NOT exist on production Home route
    await expect(page.locator('text="May 24, 2024"')).toHaveCount(0);
    await expect(page.locator('text="June 9, 2024"')).toHaveCount(0);
  });

  test('navigating from Home to My Games updates header title to My Games (not Home)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // Click My Games link in sidebar
    const myGamesLink = page.locator('aside a[href*="my-games"]').first();
    await expect(myGamesLink).toBeVisible();
    await myGamesLink.click();

    // Verify header title is "My Games" and NOT "Home"
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toHaveText('My Games');
    await expect(headerTitle).not.toHaveText('Home');
  });

  test('narrow viewport (390px) collapses Home dashboard with zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/');
    await page.waitForLoadState('domcontentloaded');

    // Widget section heading is rendered
    await expect(page.locator('text="FEATURED UPCOMING GAME"')).toBeVisible({ timeout: 5_000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
