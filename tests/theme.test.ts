import { themePresets } from '../src/config/themePresets';
import { defaultAccessibilitySettings } from '../src/services/themeTokenService';

function runThemeTokenTests() {
  console.log('🧪 Running Phase 1 Official Parchment Texture Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Verify Default Watercolor Atlas Theme Preset & Parchment Paper Asset
  const watercolor = themePresets.watercolor_atlas;
  assert(Boolean(watercolor), 'Watercolor Atlas preset exists in themePresets');
  assert(watercolor.paperTextureUrl === '/branding/watercolor-parchment-base.webp', 'paperTextureUrl is /branding/watercolor-parchment-base.webp');
  assert(watercolor.paperTextureOpacity === 0.85, 'paperTextureOpacity is 0.85');
  assert(watercolor.paperBase === '#f7f4ea', 'Paper base is warm parchment #f7f4ea');
  assert(watercolor.sidebarBackground === '#0d1b2a', 'Sidebar background is deep navy ink #0d1b2a');
  assert(watercolor.primaryAction === '#2b7a94', 'Primary action ocean blue is #2b7a94');
  assert(watercolor.washBlue === '#2b7a94', 'Wash ocean blue is #2b7a94');
  assert(watercolor.washTeal === '#1b5e75', 'Wash teal is #1b5e75');
  assert(watercolor.washGreen === '#366e57', 'Wash sea green is #366e57');
  assert(watercolor.accent === '#d4af37', 'Accent gold is #d4af37');
  assert(watercolor.textPrimary === '#0f2b48', 'Text primary is deep navy ink #0f2b48');

  // 2. Verify Theme Presets Count and Theme Isolation
  const presetKeys = Object.keys(themePresets);
  assert(presetKeys.length === 6, 'All 6 theme presets declared (watercolor_atlas, midnight_ocean, clean_catalog, neon_arcade, retro_console, forest_explorer)');

  assert(themePresets.midnight_ocean.paperTextureUrl === undefined, 'Midnight Ocean does not force paper texture');
  assert(themePresets.neon_arcade.paperTextureUrl === undefined, 'Neon Arcade does not force paper texture');

  // 3. Verify Accessibility Settings Defaults
  assert(defaultAccessibilitySettings.disableTextures === false, 'Default disableTextures is false');
  assert(defaultAccessibilitySettings.reduceDecorativeElements === false, 'Default reduceDecorativeElements is false');
  assert(defaultAccessibilitySettings.reduceMotion === false, 'Default reduceMotion is false');
  assert(defaultAccessibilitySettings.highContrast === false, 'Default highContrast is false');

  console.log(`----------------------------------------------------`);
  console.log(`📊 Theme Token Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`----------------------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

runThemeTokenTests();
