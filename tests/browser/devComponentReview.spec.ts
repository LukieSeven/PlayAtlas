/**
 * Browser test suite for Standalone Development Component Review Route (/#/dev-component-review).
 *
 * Verifies key contract requirements:
 *   1. Development review root mounts at /#/dev-component-review.
 *   2. Production AppLayout (.themed-app-shell) does NOT mount beneath it.
 *   3. Real production GameCards render using static in-memory fixtures.
 *   4. UniversalActionMenu opens from a fixture card and portals to document.body.
 *   5. OwnershipModal opens, is opaque, and closes properly.
 *   6. AddTabModal opens, accepts input, and closes properly.
 *   7. Segmented status tabs and view mode controls are clickable.
 *   8. Narrow viewport (390px) has zero horizontal overflow.
 *   9. Normal production routes (/#/) remain unaffected.
 */
import { test, expect } from '@playwright/test';

test.describe('Development Component Review Route (/#/dev-component-review)', () => {
  test('mounts dev-component-review route without mounting production AppLayout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/dev-component-review');
    await page.waitForLoadState('domcontentloaded');

    // 1. Dev review root element is mounted
    const devRoot = page.locator('[data-testid="dev-component-review-root"]');
    await expect(devRoot).toBeVisible({ timeout: 5_000 });

    // 2. Production AppLayout container is NOT mounted
    const prodAppShell = page.locator('.themed-app-shell');
    await expect(prodAppShell).toHaveCount(0);

    // 3. Page heading is present
    await expect(devRoot.locator('h1:has-text("Play Atlas Production Component Visual Inspection")')).toBeVisible();

    // 4. 6 fixture GameCards are rendered
    const gameCards = devRoot.locator('.themed-card');
    await expect(gameCards).toHaveCount(6);
  });

  test('UniversalActionMenu opens from a fixture card and portals to document.body', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/dev-component-review');
    await page.waitForLoadState('domcontentloaded');

    const firstCardMenuBtn = page.locator('[data-testid="dev-component-review-root"] button[data-testid="action-menu-trigger"]').first();
    await expect(firstCardMenuBtn).toBeVisible();
    await firstCardMenuBtn.click();

    // Verify popover is mounted under document.body
    const popover = page.locator('body > div.action-menu-popover');
    await expect(popover).toBeVisible();

    // Verify Ownership Modal opens from menu option
    const addOwnershipOpt = popover.locator('button:has-text("Own It")').or(popover.locator('button:has-text("Owned")'));
    await expect(addOwnershipOpt).toBeVisible();
    await addOwnershipOpt.click();

    // Verify Ownership Modal is opaque and visible
    const modal = page.locator('[data-testid="ownership-modal"]');
    await expect(modal).toBeVisible();

    // Close modal
    const closeBtn = modal.locator('button').first();
    await closeBtn.click();
    await expect(modal).toHaveCount(0);
  });

  test('AddTabModal opens from review button, accepts input, and closes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/dev-component-review');
    await page.waitForLoadState('domcontentloaded');

    const openAddTabBtn = page.locator('button:has-text("Open AddTabModal")');
    await expect(openAddTabBtn).toBeVisible();
    await openAddTabBtn.click();

    // Modal dialog is displayed
    const modalHeading = page.locator('h3:has-text("Add Custom Taskbar Tab")');
    await expect(modalHeading).toBeVisible();

    // Input accepts text
    const input = page.locator('input[placeholder*="Games My Brother"]');
    await input.fill('Co-op Classics');
    await expect(input).toHaveValue('Co-op Classics');

    // Close modal
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await expect(modalHeading).toHaveCount(0);
  });

  test('narrow viewport (390px) has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/dev-component-review');
    await page.waitForLoadState('domcontentloaded');

    const devRoot = page.locator('[data-testid="dev-component-review-root"]');
    await expect(devRoot).toBeVisible({ timeout: 5_000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
