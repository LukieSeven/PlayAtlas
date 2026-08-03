import { themePresets } from '../src/config/themePresets';
import { defaultAccessibilitySettings } from '../src/services/themeTokenService';

function runThemeTokenTests() {
  console.log('🧪 Running Phase 1 Theme Token Unit Tests...');
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

  // 1. Verify Default Watercolor Atlas Theme Preset Colors & Typography
  const watercolor = themePresets.watercolor_atlas;
  assert(Boolean(watercolor), 'Watercolor Atlas preset exists in themePresets');
  assert(watercolor.primaryColor === '#2b7a94', 'Primary ocean blue is #2b7a94');
  assert(watercolor.secondaryColor === '#366e57', 'Secondary sea green is #366e57');
  assert(watercolor.accentColor === '#d4af37', 'Accent gold is #d4af37');
  assert(watercolor.backgroundColor === '#0c1626', 'Background navy is #0c1626');
  assert(watercolor.headingFontFamily.includes('Cinzel'), 'Heading font includes Cinzel serif');

  // 2. Verify Theme Presets Count
  const presetKeys = Object.keys(themePresets);
  assert(presetKeys.length === 6, 'All 6 theme presets declared (watercolor_atlas, midnight_ocean, clean_catalog, neon_arcade, retro_console, forest_explorer)');

  // 3. Verify Accessibility Settings Defaults
  assert(defaultAccessibilitySettings.disableTextures === false, 'Default disableTextures is false');
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
