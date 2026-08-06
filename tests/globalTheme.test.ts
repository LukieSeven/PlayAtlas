import { themePresets } from '../src/config/themePresets';
import { applyThemeTokensToDOM, defaultAccessibilitySettings } from '../src/services/themeTokenService';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function runGlobalThemeTests() {
  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, name: string) => {
    if (condition) {
      passed++;
      console.log(`  PASS: ${name}`);
    } else {
      failed++;
      console.error(`  FAIL: ${name}`);
    }
  };

  const presets = Object.values(themePresets);
  assert(presets.length >= 6, 'at least six global theme variations are available');
  assert(presets.some(preset => preset.isDark), 'a true dark theme is available');
  assert(
    themePresets.watercolor_atlas.sidebarBackground === '#f4efe6'
      && themePresets.watercolor_atlas.sidebarText === '#0f2b48',
    'default Watercolor Atlas sidebar remains parchment with readable navy ink',
  );
  assert(
    existsSync(resolve(process.cwd(), 'public/branding/play-atlas-wordmark-dark.png')),
    'dark theme wordmark asset is packaged with the application',
  );

  for (const preset of presets) {
    const opaquePanelBackground = preset.panelBackground.startsWith('#')
      ? preset.panelBackground
      : preset.panelPaperColor;
    assert(
      contrast(preset.textPrimary, opaquePanelBackground) >= 4.5,
      `${preset.name} primary panel text meets WCAG AA contrast`,
    );
    assert(
      contrast(preset.sidebarText, preset.sidebarBackground) >= 4.5,
      `${preset.name} sidebar text meets WCAG AA contrast`,
    );
  }

  const properties = new Map<string, string>();
  const classes = new Set<string>();
  const root = {
    dataset: {} as Record<string, string>,
    style: { setProperty: (name: string, value: string) => properties.set(name, value) },
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
    },
  };
  (globalThis as typeof globalThis & { document: unknown }).document = { documentElement: root };

  applyThemeTokensToDOM(themePresets.midnight_ocean, defaultAccessibilitySettings);
  assert(root.dataset.theme === 'midnight_ocean', 'active preset is exposed on the document root');
  assert(root.dataset.themeMode === 'dark' && classes.has('dark'), 'dark mode is exposed globally');
  assert(properties.get('--atlas-canvas-bg') === themePresets.midnight_ocean.appBackground, 'atlas canvas uses active preset');
  assert(properties.get('--atlas-ink-primary') === themePresets.midnight_ocean.textPrimary, 'atlas text uses active preset');
  assert(properties.get('--background-artwork-opacity') === '0', 'dark minimal theme suppresses parchment artwork');

  console.log(`Global theme tests: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runGlobalThemeTests();
