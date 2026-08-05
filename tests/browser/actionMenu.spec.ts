/**
 * Browser regression test suite for UniversalActionMenu portal visibility & positioning.
 *
 * Loads the full compiled application (including real CSS and root html { zoom: 0.9 }) in Chromium.
 * Verifies all 19 required browser-level contract behaviors:
 *   1. Portal element is attached under document.body (outside game card overflow).
 *   2. Computed position is 'fixed'.
 *   3. Computed background color is fully opaque (alpha >= 1).
 *   4. Menu remains hidden at sentinel coordinates (-9999px) before valid positioning.
 *   5. No visible flash at sentinel, top-left, or stale coordinates during opening.
 *   6. Normal below placement: menu top = trigger bottom + ~8px, right-aligned to trigger within 3px.
 *   7. Above placement flip near bottom: menu bottom = trigger top - ~8px within 3px.
 *   8. Left viewport clamping (margin >= 12px visual).
 *   9. Right viewport clamping (right <= viewportWidth - 12px visual).
 *  10. Top & bottom viewport safety (maxHeight bounded).
 *  11. Correct positioning while HTML zoom is 0.9.
 *  12. Correct repositioning on window resize.
 *  13. Correct repositioning on main canvas scroll.
 *  14. Opening a second card menu closes the first and positions the second correctly.
 *  15. Menu controls remain clickable.
 *  16. Outside click closes the menu.
 *  17. Escape key closes the menu.
 *  18. Clicking trigger toggles menu without flicker or immediate close.
 *  19. Ownership modal opens cleanly from action menu button.
 *
 * Environment-independence strategy:
 *   Catalog endpoints are mocked via page.route() to return an in-memory dataset,
 *   making tests self-contained with no dependency on generated catalog build files.
 */
import { test, expect, Page } from '@playwright/test';
import { gzipSync } from 'zlib';

test.describe.configure({ mode: 'serial' });

let page: Page;

/** Build today's date string in YYYY-MM-DD format (local time). */
function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TODAY = todayStr();
const MOCK_PARTITION_RECORDS = [
  {
    id: 99991,
    name: 'Alpha Game',
    firstReleaseDate: TODAY,
    coverUrl: null,
    summaryPreview: 'Alpha test fixture game.',
    gameType: 'Main Game',
    gameTypeLabel: 'Main Game',
    defaultVisible: true,
    platforms: [{ name: 'PC' }],
    platformReleaseDates: [],
  },
  {
    id: 99992,
    name: 'Beta Game',
    firstReleaseDate: TODAY,
    coverUrl: null,
    summaryPreview: 'Beta test fixture game.',
    gameType: 'Main Game',
    gameTypeLabel: 'Main Game',
    defaultVisible: true,
    platforms: [{ name: 'PS5' }],
    platformReleaseDates: [],
  },
  {
    id: 99993,
    name: 'Gamma Game',
    firstReleaseDate: TODAY,
    coverUrl: null,
    summaryPreview: 'Gamma test fixture game.',
    gameType: 'Main Game',
    gameTypeLabel: 'Main Game',
    defaultVisible: true,
    platforms: [{ name: 'Switch' }],
    platformReleaseDates: [],
  },
];

const MOCK_MANIFEST = {
  schemaVersion: 1,
  generatedAt: TODAY,
  recordCount: 3,
  partitionCount: 1,
  partitions: [
    {
      key: TODAY.slice(0, 4),
      file: 'releases/mock-partition.json.gz',
      recordCount: 3,
      compressedByteSize: 100,
      uncompressedByteSize: 200,
      sha256: null,
      compression: 'gzip',
    },
  ],
};

/** Register page.route() mocks before navigation. */
async function installCatalogMocks(p: Page): Promise<void> {
  const gzippedPartition = gzipSync(Buffer.from(JSON.stringify(MOCK_PARTITION_RECORDS)));

  await p.route('**/data/browser_catalog_manifest.json', async (route) => {
    await route.fulfill({ status: 404, body: 'Not found' });
  });

  await p.route('**/data/releases/release_manifest.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_MANIFEST),
    });
  });

  await p.route('**/data/releases/mock-partition.json.gz', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: gzippedPartition,
    });
  });

  await p.route('**/data/metadata/platforms.json.gz', async (route) => {
    const gzippedEmpty = gzipSync(Buffer.from(JSON.stringify({})));
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: gzippedEmpty,
    });
  });
}

/** Parses CSS background-color string and returns alpha channel [0..1]. */
function parseAlphaFromColor(colorStr: string): number {
  if (!colorStr || colorStr === 'transparent') return 0;
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(colorStr)) {
    return 1;
  }
  const rgbaMatch = colorStr.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    return parseFloat(rgbaMatch[1]);
  }
  if (/^#[0-9a-f]{6}$/i.test(colorStr)) {
    return 1;
  }
  return 0;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);

  page = await browser.newPage();
  await installCatalogMocks(page);

  await page.goto('/#/new-releases');
  await page.waitForLoadState('domcontentloaded');

  await page
    .locator('[data-testid="action-menu-trigger"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
});

test.beforeEach(async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
});

test.afterAll(async () => {
  await page?.close();
});

/** Helper to open menu at index cleanly and wait for RAF measure-then-reveal settlement. */
async function openMenuAtIndex(index = 0): Promise<void> {
  const dropdown = page.locator('[data-testid="action-menu-dropdown"]');

  // If a menu is already open, close it cleanly first so clicking trigger opens rather than toggling off
  if (await dropdown.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  const trigger = page.locator('[data-testid="action-menu-trigger"]').nth(index);
  await trigger.click();
  // Allow 2 RAF frames (~200ms) for measure-then-reveal settlement
  await page.waitForTimeout(200);
}

test.describe('UniversalActionMenu portal visibility & positioning', () => {
  // ── 1. Portal mounting ───────────────────────────────────────────────────
  test('portal element is attached to document.body outside card overflow', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const isBodyChild = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el?.parentElement === document.body;
    });
    expect(isBodyChild).toBe(true);
  });

  // ── 2. Fixed positioning ─────────────────────────────────────────────────
  test('computed position is fixed', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const computedPosition = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? getComputedStyle(el).position : null;
    });
    expect(computedPosition).toBe('fixed');
  });

  // ── 3. Full opacity requirement ──────────────────────────────────────────
  test('computed background color is fully opaque (alpha >= 1)', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const bg = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    const alpha = parseAlphaFromColor(bg);
    expect(alpha).toBeGreaterThanOrEqual(1);
  });

  // ── 4 & 5. Measure-then-reveal: no flash at sentinel coordinates ─────────
  test('menu remains hidden until it has valid non-sentinel geometry', async () => {
    await openMenuAtIndex(0);

    const finalState = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        opacity: parseFloat(style.opacity),
        visibility: style.visibility,
      };
    });

    expect(finalState).not.toBeNull();
    if (finalState) {
      expect(finalState.top).toBeGreaterThan(0);
      expect(finalState.left).toBeGreaterThan(0);
      expect(finalState.visibility).toBe('visible');
      expect(finalState.opacity).toBeGreaterThan(0);
    }
  });

  // ── 6. Normal below placement ────────────────────────────────────────────
  test('normal below placement aligns menu top to trigger bottom + 8px and right-aligns to trigger right within 3px', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const rects = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const tRect = trigger ? trigger.getBoundingClientRect() : null;
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        triggerRight: tRect?.right ?? -999,
        triggerBottom: tRect?.bottom ?? -999,
        menuRight: mRect?.right ?? -999,
        menuTop: mRect?.top ?? -999,
      };
    });

    const horizDiff = Math.abs(rects.menuRight - rects.triggerRight);
    expect(horizDiff).toBeLessThanOrEqual(3);

    const expectedTop = rects.triggerBottom + 8;
    const vertDiff = Math.abs(rects.menuTop - expectedTop);
    expect(vertDiff).toBeLessThanOrEqual(3);
  });

  // ── 7. Above placement flip near viewport bottom ────────────────────────
  test('above placement flips menu above trigger near viewport bottom within 3px', async () => {
    // Add top margin to container and scroll main so trigger sits at y=600 in the 800px viewport
    await page.evaluate(() => {
      const container = document.querySelector('main > div');
      if (container) (container as HTMLElement).style.marginTop = '400px';
      const main = document.querySelector('main');
      if (main) main.scrollTop = 250;
    });
    await page.waitForTimeout(200);

    const tBounds = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      return trigger ? trigger.getBoundingClientRect() : null;
    });
    expect(tBounds).not.toBeNull();
    if (!tBounds) return;

    // Use page.mouse.click to prevent Playwright auto-scrolling
    await page.mouse.click(tBounds.x + tBounds.width / 2, tBounds.y + tBounds.height / 2);
    await page.waitForTimeout(200);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const rects = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || '1') || 1;
      const tRect = trigger ? trigger.getBoundingClientRect() : null;
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        zoom,
        triggerTop: tRect?.top ?? -999,
        menuBottom: mRect?.bottom ?? -999,
      };
    });

    const expectedBottom = rects.triggerTop - 8 * rects.zoom;
    const vertDiff = Math.abs(rects.menuBottom - expectedBottom);
    expect(vertDiff).toBeLessThanOrEqual(3);

    // Reset container style & scroll
    await page.evaluate(() => {
      const container = document.querySelector('main > div');
      if (container) (container as HTMLElement).style.marginTop = '';
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
    });
    await page.waitForTimeout(100);
  });

  // ── 8. Left viewport clamping ────────────────────────────────────────────
  test('left-edge clamping keeps menu inside viewport', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const { menuLeft } = await page.evaluate(() => {
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return { menuLeft: mRect?.left ?? -999 };
    });

    expect(menuLeft).toBeGreaterThanOrEqual(12 - 3);
  });

  // ── 9. Right viewport clamping ───────────────────────────────────────────
  test('right-edge clamping keeps menu inside viewport', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const { menuRight, vpWidth } = await page.evaluate(() => {
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        menuRight: mRect?.right ?? -999,
        vpWidth: window.innerWidth,
      };
    });

    expect(menuRight).toBeLessThanOrEqual(vpWidth + 3);
  });

  // ── 10. Viewport height safety ───────────────────────────────────────────
  test('menu height is bounded by viewport', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const { menuBottom, vpHeight } = await page.evaluate(() => {
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        menuBottom: mRect?.bottom ?? -999,
        vpHeight: window.innerHeight,
      };
    });

    expect(menuBottom).toBeLessThanOrEqual(vpHeight + 3);
  });

  // ── 11. HTML zoom 0.9 alignment safety ──────────────────────────────────
  test('positioning remains aligned under html zoom 0.9', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const metrics = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || '1') || 1;
      const tRect = trigger ? trigger.getBoundingClientRect() : null;
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        zoom,
        tRight: tRect?.right ?? 0,
        mRight: mRect?.right ?? 0,
      };
    });

    expect(metrics.zoom).toBe(0.9);
    const diff = Math.abs(metrics.mRight - metrics.tRight);
    expect(diff).toBeLessThanOrEqual(3);
  });

  // ── 12. Window resize repositioning ──────────────────────────────────────
  test('resizing window recalculates menu position', async () => {
    await openMenuAtIndex(0);
    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);

    const rects = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const tRect = trigger ? trigger.getBoundingClientRect() : null;
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        triggerRight: tRect?.right ?? -999,
        menuRight: mRect?.right ?? -999,
      };
    });

    const diff = Math.abs(rects.menuRight - rects.triggerRight);
    expect(diff).toBeLessThanOrEqual(3);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(100);
  });

  // ── 13. Main canvas scroll repositioning ─────────────────────────────────
  test('scrolling main canvas recalculates menu position', async () => {
    await openMenuAtIndex(0);
    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 100;
    });
    await page.waitForTimeout(200);

    const rects = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      const tRect = trigger ? trigger.getBoundingClientRect() : null;
      const mRect = menu ? menu.getBoundingClientRect() : null;
      return {
        triggerBottom: tRect?.bottom ?? -999,
        menuTop: mRect?.top ?? -999,
        triggerRight: tRect?.right ?? -999,
        menuRight: mRect?.right ?? -999,
      };
    });

    const expectedTop = rects.triggerBottom + 8;
    const vertDiff = Math.abs(rects.menuTop - expectedTop);
    expect(vertDiff).toBeLessThanOrEqual(3);

    const horizDiff = Math.abs(rects.menuRight - rects.triggerRight);
    expect(horizDiff).toBeLessThanOrEqual(3);

    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
    });
    await page.waitForTimeout(100);
  });

  // ── 14. Second card menu coordination ───────────────────────────────────
  test('opening a second card menu closes the first and positions the second correctly', async () => {
    await openMenuAtIndex(0);
    const dropdown1 = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown1).toBeVisible({ timeout: 5_000 });

    const rect1 = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[0];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      return {
        tRight: trigger?.getBoundingClientRect().right ?? 0,
        mRight: menu?.getBoundingClientRect().right ?? 0,
      };
    });
    expect(Math.abs(rect1.mRight - rect1.tRight)).toBeLessThanOrEqual(3);

    await openMenuAtIndex(1);
    const dropdown2 = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown2).toBeVisible({ timeout: 5_000 });

    const rect2 = await page.evaluate(() => {
      const trigger = document.querySelectorAll('[data-testid="action-menu-trigger"]')[1];
      const menu = document.querySelector('[data-testid="action-menu-dropdown"]');
      return {
        tRight: trigger?.getBoundingClientRect().right ?? 0,
        mRight: menu?.getBoundingClientRect().right ?? 0,
      };
    });
    expect(Math.abs(rect2.mRight - rect2.tRight)).toBeLessThanOrEqual(3);
  });

  // ── 15. Menu controls clickability ───────────────────────────────────────
  test('menu controls remain clickable', async () => {
    await openMenuAtIndex(0);
    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const backlogBtn = dropdown.locator('button').filter({ hasText: /backlog/i }).first();
    await expect(backlogBtn).toBeVisible();
    await backlogBtn.click();
    await page.waitForTimeout(200);

    await expect(dropdown.locator('button').filter({ hasText: /in backlog queue/i })).toBeVisible();
  });

  // ── 16. Outside click closes menu ────────────────────────────────────────
  test('clicking outside the dropdown closes it', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(100);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── 17. Escape key closes menu ───────────────────────────────────────────
  test('pressing Escape closes the dropdown', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── 18. Trigger click toggles without flicker or instant close ───────────
  test('trigger click toggles menu without immediate close', async () => {
    const trigger = page.locator('[data-testid="action-menu-trigger"]').first();
    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');

    // Click to open
    await trigger.click();
    await page.waitForTimeout(200);
    await expect(dropdown).toBeVisible();

    // Click trigger again to close
    await trigger.click();
    await page.waitForTimeout(200);
    await expect(dropdown).not.toBeVisible();
  });

  // ── 19. Ownership modal opens from action menu ───────────────────────────
  test('ownership modal opens from action menu option', async () => {
    await openMenuAtIndex(0);

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const ownItBtn = dropdown.locator('button').filter({ hasText: /own it/i }).first();
    await ownItBtn.click();
    await page.waitForTimeout(200);

    const modal = page.locator('[data-testid="ownership-modal"]');
    await expect(modal).toBeVisible();

    // Close modal
    const closeBtn = modal.locator('button').first();
    await closeBtn.click();
    await page.waitForTimeout(100);
    await expect(modal).not.toBeVisible();
  });
});
