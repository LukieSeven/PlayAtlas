import { themePresets } from '../src/config/themePresets';
import { defaultAccessibilitySettings } from '../src/services/themeTokenService';

function runThemeTokenTests() {
  console.log('🧪 Running Phase 1 Watercolor Atlas Visual System Tests...');
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

  // 1. Verify Default Watercolor Atlas Theme Preset Colors & Layered Texture Tokens
  const watercolor = themePresets.watercolor_atlas;
  assert(Boolean(watercolor), 'Watercolor Atlas preset exists in themePresets');
  assert(watercolor.paperBase === '#f7f4ea', 'Paper base is warm parchment #f7f4ea');
  assert(watercolor.sidebarBackground === '#0d1b2a', 'Sidebar background is deep navy ink #0d1b2a');
  assert(watercolor.primaryAction === '#2b7a94', 'Primary action ocean blue is #2b7a94');
  assert(watercolor.washBlue === '#2b7a94', 'Wash ocean blue is #2b7a94');
  assert(watercolor.washTeal === '#1b5e75', 'Wash teal is #1b5e75');
  assert(watercolor.washGreen === '#366e57', 'Wash sea green is #366e57');
  assert(watercolor.accent === '#d4af37', 'Accent gold is #d4af37');
  assert(watercolor.textPrimary === '#0f2b48', 'Text primary is deep navy ink #0f2b48');
  assert(watercolor.headingFontFamily.includes('Cinzel'), 'Heading font includes Cinzel serif');

  // 2. Verify Theme Presets Count and Semantic Completeness
  const presetKeys = Object.keys(themePresets);
  assert(presetKeys.length === 6, 'All 6 theme presets declared (watercolor_atlas, midnight_ocean, clean_catalog, neon_arcade, retro_console, forest_explorer)');

  for (const key of presetKeys) {
    const preset = themePresets[key as keyof typeof themePresets];
    assert(Boolean(preset.appBackground), `Preset ${key} has appBackground`);
    assert(Boolean(preset.paperBase), `Preset ${key} has paperBase`);
    assert(Boolean(preset.sidebarBackground), `Preset ${key} has sidebarBackground`);
    assert(Boolean(preset.panelBackground), `Preset ${key} has panelBackground`);
    assert(Boolean(preset.textPrimary), `Preset ${key} has textPrimary`);
  }

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
