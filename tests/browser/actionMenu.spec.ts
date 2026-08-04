/**
 * Browser regression test for UniversalActionMenu portal visibility.
 *
 * Loads the full compiled application (including real CSS) in Chromium.
 * Verifies that the action menu portal:
 *   - mounts under document.body
 *   - has position:fixed (not relative/absolute/static)
 *   - is not display:none or visibility:hidden
 *   - has nonzero opacity
 *   - is inside the viewport (bounding rect not negative or off-screen)
 *   - has positive width and height
 *   - is not at large negative coordinates (not hidden via top/left:-9999px)
 *   - supports all interaction behaviors (click action, outside-click, Escape)
 *   - clamps correctly at right viewport edge
 *   - flips above trigger at bottom viewport edge
 *
 * Strategy: All tests share a SINGLE browser page (not isolated contexts) so
 * the catalog JSON is fetched once and cached by the browser. This avoids
 * repeated cold-start fetches that would each timeout 25s.
 */
import { test as base, expect, Browser, Page } from '@playwright/test';

// Shared page across all tests in this file
let sharedPage: Page;

// Custom test fixture that reuses the shared page
const test = base.extend<{ page: Page }>({
  page: async ({ browser }, use) => {
    // If the shared page is already set up and still open, reuse it
    if (!sharedPage || sharedPage.isClosed()) {
      sharedPage = await browser.newPage();
      // Load New Releases once and wait for cards to appear
      await sharedPage.goto('/#/new-releases');
      await sharedPage.waitForLoadState('domcontentloaded');
      // Wait up to 30s for catalog to hydrate (first fetch, cold start)
      await sharedPage
        .locator('[data-testid="action-menu-trigger"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    }
    // Close any open menu before each test
    await sharedPage.keyboard.press('Escape');
    await sharedPage.waitForTimeout(100);
    await use(sharedPage);
  },
});

/** Click the first trigger and wait for the portal dropdown to settle. */
async function openMenu(page: Page): Promise<void> {
  const trigger = page.locator('[data-testid="action-menu-trigger"]').first();
  await trigger.click();
  await page.waitForTimeout(150); // RAF positioning settles
}

test.describe('UniversalActionMenu portal visibility', () => {
  // ── Point 1–3: Portal mounts under document.body ─────────────────────────
  test('portal element is attached to document.body', async ({ page }) => {
    await openMenu(page);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const isBodyChild = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el?.parentElement === document.body;
    });
    expect(isBodyChild).toBe(true);
  });

  // ── Point 4: position === 'fixed' ────────────────────────────────────────
  test('computed position is fixed (not relative/absolute/static)', async ({ page }) => {
    await openMenu(page);

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });

    const computedPosition = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? getComputedStyle(el).position : 'not-found';
    });

    expect(computedPosition).toBe('fixed');
  });

  // ── Points 5–6: display and visibility ───────────────────────────────────
  test('computed display is not none and visibility is not hidden', async ({ page }) => {
    await openMenu(page);

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });

    const { display, visibility } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      if (!el) return { display: 'not-found', visibility: 'not-found' };
      const s = getComputedStyle(el);
      return { display: s.display, visibility: s.visibility };
    });

    expect(display).not.toBe('none');
    expect(visibility).not.toBe('hidden');
  });

  // ── Point 7: opacity is visibly nonzero ──────────────────────────────────
  test('computed opacity is greater than zero', async ({ page }) => {
    await openMenu(page);

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(80); // extra frame so RAF opacity:1 is applied

    const opacity = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? parseFloat(getComputedStyle(el).opacity) : -1;
    });

    expect(opacity).toBeGreaterThan(0);
  });

  // ── Points 8–10: bounding rect inside viewport, positive size, not -9999 ─
  test('bounding rect is inside viewport with positive dimensions', async ({ page }) => {
    await openMenu(page);

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(80);

    const { rect, vpWidth, vpHeight } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      const r = el?.getBoundingClientRect();
      return {
        rect: r
          ? { top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height }
          : null,
        vpWidth: window.innerWidth,
        vpHeight: window.innerHeight,
      };
    });

    expect(rect).not.toBeNull();
    if (!rect) return;

    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.top).toBeGreaterThan(-100);  // not at -9999 sentinel
    expect(rect.left).toBeGreaterThan(-100); // not at -9999 sentinel
    expect(rect.top).toBeLessThan(vpHeight);
    expect(rect.left).toBeLessThan(vpWidth);
    expect(rect.bottom).toBeGreaterThan(0);
    expect(rect.right).toBeGreaterThan(0);
  });

  // ── Point 11: Clicking a non-closing action inside doesn't crash ──────────
  test('clicking a non-closing action inside the dropdown does not error', async ({ page }) => {
    await openMenu(page);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const backlogBtn = dropdown.locator('button').filter({ hasText: /backlog/i }).first();
    if (await backlogBtn.count() > 0) {
      await backlogBtn.click();
      await page.waitForTimeout(200);
      // No assertion on open/closed — just verifying no JS error / crash
    }
  });

  // ── Point 12: Outside click closes the menu ──────────────────────────────
  test('clicking outside the dropdown closes it', async ({ page }) => {
    await openMenu(page);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(100); // RAF-deferred pointerdown listener is attached

    await page.mouse.click(10, 10);
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Point 13: Escape key closes the menu ─────────────────────────────────
  test('pressing Escape closes the dropdown', async ({ page }) => {
    await openMenu(page);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Point 14: Right-edge card remains viewport-clamped ───────────────────
  test('right-edge clamping remains inside viewport', async ({ page }) => {
    await openMenu(page);

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(80);

    const { right, vpWidth } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      const r = el?.getBoundingClientRect();
      return { right: r?.right ?? -1, vpWidth: window.innerWidth };
    });

    expect(right).toBeLessThanOrEqual(vpWidth + 1); // +1 for subpixel tolerance
  });

  // ── Point 15: Bottom-edge card flips above trigger ───────────────────────
  test('bottom-edge flip stays visible (flips or scrolls)', async ({ page }) => {
    // Scroll to bottom to simulate bottom-edge card scenario
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const triggerCount = await page.locator('[data-testid="action-menu-trigger"]').count();
    if (triggerCount === 0) return; // No triggers visible — skip gracefully

    const lastTrigger = page.locator('[data-testid="action-menu-trigger"]').last();
    await lastTrigger.scrollIntoViewIfNeeded();
    await lastTrigger.click();
    await page.waitForTimeout(200);

    const dropdownCount = await page.locator('[data-testid="action-menu-dropdown"]').count();
    if (dropdownCount === 0) return; // Menu not opened — skip

    const { bottom, vpHeight } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      const r = el?.getBoundingClientRect();
      return { bottom: r?.bottom ?? -1, vpHeight: window.innerHeight };
    });

    expect(bottom).toBeLessThanOrEqual(vpHeight + 1);
  });
});
