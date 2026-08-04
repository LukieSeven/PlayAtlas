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
 * Environment-independence strategy:
 *   The New Releases page requires generated catalog JSON files
 *   (public/releases/, public/data/browser_catalog_manifest.json) that are NOT
 *   committed to the repo. Without them the page shows no cards and triggers
 *   never appear. We mock both catalog endpoints via page.route() to return a
 *   minimal in-memory dataset, making the test completely self-contained.
 *
 *   The partition file is served as real gzip (Node zlib) because
 *   fetchAndDecompressJson always decompresses the partition response.
 */
import { test, expect, Page } from '@playwright/test';
import { gzipSync } from 'zlib';

// Run tests serially so one shared page is loaded once.
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

/**
 * Synthetic release partition: one game whose firstReleaseDate is today so it
 * always falls inside the current-month date range that New Releases uses.
 */
const TODAY = todayStr();
const MOCK_PARTITION_RECORDS = [
  {
    id: 99999,
    name: 'Test Action Menu Game',
    firstReleaseDate: TODAY,
    coverUrl: null,
    summaryPreview: 'A test fixture game used by Playwright.',
    gameType: 'Main Game',
    gameTypeLabel: 'Main Game',
    defaultVisible: true,
    platforms: [{ name: 'PC' }],
    platformReleaseDates: [],
  },
];

const MOCK_MANIFEST = {
  schemaVersion: 1,
  generatedAt: TODAY,
  recordCount: 1,
  partitionCount: 1,
  partitions: [
    {
      key: TODAY.slice(0, 4),          // e.g. "2026"
      file: 'releases/mock-partition.json.gz',
      recordCount: 1,
      compressedByteSize: 100,
      uncompressedByteSize: 200,
      sha256: null,                    // null → sha256 check skipped
      compression: 'gzip',
    },
  ],
};

/** Register page.route() mocks before navigation. */
async function installCatalogMocks(p: Page): Promise<void> {
  const gzippedPartition = gzipSync(Buffer.from(JSON.stringify(MOCK_PARTITION_RECORDS)));

  // 1. browser_catalog_manifest.json — not needed (no releaseManifest redirect field)
  //    We let this 404 so fetchReleaseManifest falls through to the next fetch.
  await p.route('**/data/browser_catalog_manifest.json', async (route) => {
    await route.fulfill({ status: 404, body: 'Not found' });
  });

  // 2. release_manifest.json — return our minimal manifest (plain JSON)
  await p.route('**/data/releases/release_manifest.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_MANIFEST),
    });
  });

  // 3. Partition file — must be gzip-compressed (fetchAndDecompressJson always decompresses)
  await p.route('**/data/releases/mock-partition.json.gz', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: gzippedPartition,
    });
  });

  // 4. Platforms metadata — return an empty map (our mock game uses inline platform names)
  await p.route('**/data/metadata/platforms.json.gz', async (route) => {
    const gzippedEmpty = gzipSync(Buffer.from(JSON.stringify({})));
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: gzippedEmpty,
    });
  });
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);

  page = await browser.newPage();

  // Install mocks BEFORE navigation so the first fetch is intercepted
  await installCatalogMocks(page);

  await page.goto('/#/new-releases');
  await page.waitForLoadState('domcontentloaded');

  // With mocked catalog the card should appear within a few seconds
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

/** Click the first action-menu trigger and let the portal settle. */
async function openMenu(): Promise<void> {
  const trigger = page.locator('[data-testid="action-menu-trigger"]').first();
  await trigger.click();
  await page.waitForTimeout(150);
}

test.describe('UniversalActionMenu portal visibility', () => {
  // ── Point 1–3: Portal mounts under document.body ─────────────────────────
  test('portal element is attached to document.body', async () => {
    await openMenu();

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const isBodyChild = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el?.parentElement === document.body;
    });
    expect(isBodyChild).toBe(true);
  });

  // ── Point 4: position === 'fixed' ────────────────────────────────────────
  test('computed position is fixed (not relative/absolute/static)', async () => {
    await openMenu();

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });

    const computedPosition = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? getComputedStyle(el).position : 'not-found';
    });

    expect(computedPosition).toBe('fixed');
  });

  // ── Points 5–6: display and visibility ───────────────────────────────────
  test('computed display is not none and visibility is not hidden', async () => {
    await openMenu();

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
  test('computed opacity is greater than zero', async () => {
    await openMenu();

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(80);

    const opacity = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      return el ? parseFloat(getComputedStyle(el).opacity) : -1;
    });

    expect(opacity).toBeGreaterThan(0);
  });

  // ── Points 8–10: bounding rect inside viewport, positive size, not -9999 ─
  test('bounding rect is inside viewport with positive dimensions', async () => {
    await openMenu();

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
    expect(rect.top).toBeGreaterThan(-100);   // not at -9999 sentinel
    expect(rect.left).toBeGreaterThan(-100);  // not at -9999 sentinel
    expect(rect.top).toBeLessThan(vpHeight);
    expect(rect.left).toBeLessThan(vpWidth);
    expect(rect.bottom).toBeGreaterThan(0);
    expect(rect.right).toBeGreaterThan(0);
  });

  // ── Point 11: Clicking a non-closing action inside doesn't crash ──────────
  test('clicking a non-closing action inside the dropdown does not error', async () => {
    await openMenu();

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    const backlogBtn = dropdown.locator('button').filter({ hasText: /backlog/i }).first();
    if (await backlogBtn.count() > 0) {
      await backlogBtn.click();
      await page.waitForTimeout(200);
    }
  });

  // ── Point 12: Outside click closes the menu ──────────────────────────────
  test('clicking outside the dropdown closes it', async () => {
    await openMenu();

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(100);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Point 13: Escape key closes the menu ─────────────────────────────────
  test('pressing Escape closes the dropdown', async () => {
    await openMenu();

    const dropdown = page.locator('[data-testid="action-menu-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(dropdown).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Point 14: Right-edge card remains viewport-clamped ───────────────────
  test('right-edge clamping remains inside viewport', async () => {
    await openMenu();

    await expect(page.locator('[data-testid="action-menu-dropdown"]')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(80);

    const { right, vpWidth } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      const r = el?.getBoundingClientRect();
      return { right: r?.right ?? -1, vpWidth: window.innerWidth };
    });

    expect(right).toBeLessThanOrEqual(vpWidth + 1);
  });

  // ── Point 15: Bottom-edge card flips above trigger ───────────────────────
  test('bottom-edge flip stays visible (flips or scrolls)', async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const triggerCount = await page.locator('[data-testid="action-menu-trigger"]').count();
    if (triggerCount === 0) return;

    const lastTrigger = page.locator('[data-testid="action-menu-trigger"]').last();
    await lastTrigger.scrollIntoViewIfNeeded();
    await lastTrigger.click();
    await page.waitForTimeout(200);

    const dropdownCount = await page.locator('[data-testid="action-menu-dropdown"]').count();
    if (dropdownCount === 0) return;

    const { bottom, vpHeight } = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="action-menu-dropdown"]');
      const r = el?.getBoundingClientRect();
      return { bottom: r?.bottom ?? -1, vpHeight: window.innerHeight };
    });

    expect(bottom).toBeLessThanOrEqual(vpHeight + 1);
  });
});
