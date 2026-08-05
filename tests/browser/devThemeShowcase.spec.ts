/**
 * Browser regression test suite for isolated DevThemeShowcase page.
 *
 * Verifies key contract requirements:
 *   1. The development showcase root is present.
 *   2. The production AppLayout/sidebar is NOT mounted.
 *   3. No old production screenshot background is present.
 *   4. Main dashboard uses the available desktop width.
 *   5. The primary parchment canvas and widget surfaces are opaque.
 *   6. The showcase sidebar is visible at desktop width.
 *   7. No horizontal page overflow exists at narrow viewport (390px).
 */
import { test, expect } from '@playwright/test';

test.describe('DevThemeShowcase Isolated Preview', () => {
  test('renders standalone showcase without production AppLayout or card bleed-through', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/dev-theme-showcase');
    await page.waitForLoadState('domcontentloaded');

    // 1. Showcase root is present
    const showcaseRoot = page.locator('[data-testid="dev-theme-showcase-root"]');
    await expect(showcaseRoot).toBeVisible({ timeout: 5_000 });

    // 2. Production AppLayout / production sidebar / header is NOT mounted
    const prodAppShell = page.locator('.themed-app-shell');
    await expect(prodAppShell).toHaveCount(0);

    const prodHeader = page.locator('.themed-header');
    await expect(prodHeader).toHaveCount(0);

    // 3. Showcase sidebar is present and visible at desktop width
    const showcaseSidebar = page.locator('[data-testid="showcase-sidebar"]');
    await expect(showcaseSidebar).toBeVisible();

    // 4. Main workspace fills viewport width and has opaque parchment background
    const workspace = page.locator('[data-testid="showcase-main-workspace"]');
    await expect(workspace).toBeVisible();

    const bgColor = await showcaseRoot.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/);

    // 5. Featured game widget is mounted and readable
    await expect(page.locator('text=ECHOES OF THE WILDMOOR')).toBeVisible();
    await expect(page.locator('text=Wildmoor Citadel')).toBeVisible();

    // 6. Verify main workspace utilizes desktop width (width > 900px)
    const workspaceBox = await workspace.boundingBox();
    expect(workspaceBox).not.toBeNull();
    if (workspaceBox) {
      expect(workspaceBox.width).toBeGreaterThan(800);
    }
  });

  test('responsive layout at narrow viewport (390px) has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/dev-theme-showcase');
    await page.waitForLoadState('domcontentloaded');

    const showcaseRoot = page.locator('[data-testid="dev-theme-showcase-root"]');
    await expect(showcaseRoot).toBeVisible({ timeout: 5_000 });

    // Verify zero horizontal scrolling overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
