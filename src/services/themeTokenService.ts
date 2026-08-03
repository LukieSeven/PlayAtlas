import { ThemeTokens, ThemePresetKey, AccessibilitySettings } from '../types/theme';
import { themePresets } from '../config/themePresets';

const THEME_PRESET_STORAGE_KEY = 'playatlas_theme_preset_key';
const ACCESSIBILITY_STORAGE_KEY = 'playatlas_accessibility_settings';

export const defaultAccessibilitySettings: AccessibilitySettings = {
  disableTextures: false,
  reduceDecorativeElements: false,
  reduceMotion: false,
  highContrast: false,
  plainBackgroundMode: false,
};

export function getStoredThemePresetKey(): ThemePresetKey {
  try {
    const saved = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (saved && saved in themePresets) {
      return saved as ThemePresetKey;
    }
  } catch {
    // LocalStorage fallback
  }
  return 'watercolor_atlas';
}

export function getStoredAccessibilitySettings(): AccessibilitySettings {
  try {
    const saved = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (saved) {
      return { ...defaultAccessibilitySettings, ...JSON.parse(saved) };
    }
  } catch {
    // LocalStorage fallback
  }
  return defaultAccessibilitySettings;
}

export function applyThemeTokensToDOM(
  tokens: ThemeTokens,
  accessibility: AccessibilitySettings
): void {
  const root = document.documentElement;

  // Apply Colors
  root.style.setProperty('--color-primary', tokens.primaryColor);
  root.style.setProperty('--color-secondary', tokens.secondaryColor);
  root.style.setProperty('--color-accent', tokens.accentColor);
  
  if (accessibility.plainBackgroundMode) {
    root.style.setProperty('--color-bg', tokens.isDark ? '#0a0f1d' : '#ffffff');
    root.style.setProperty('--color-panel-surface', tokens.isDark ? '#111827' : '#f8fafc');
  } else {
    root.style.setProperty('--color-bg', tokens.backgroundColor);
    root.style.setProperty('--color-panel-surface', tokens.panelSurfaceColor);
  }

  root.style.setProperty('--color-panel-border', tokens.panelBorderColor);
  root.style.setProperty('--color-text', accessibility.highContrast ? '#ffffff' : tokens.textColor);
  root.style.setProperty('--color-text-muted', accessibility.highContrast ? '#cbd5e1' : tokens.textMutedColor);
  root.style.setProperty('--color-heading', accessibility.highContrast ? '#ffffff' : tokens.headingColor);

  // Apply Fonts
  root.style.setProperty('--font-heading', tokens.headingFontFamily);
  root.style.setProperty('--font-body', tokens.bodyFontFamily);

  // Apply Stylistic Utilities & Accessibility Overrides
  const activeTextureStrength = accessibility.disableTextures || accessibility.plainBackgroundMode
    ? 0
    : tokens.textureStrength;

  root.style.setProperty('--texture-opacity', activeTextureStrength.toString());
  root.style.setProperty('--border-radius', tokens.cornerRadius);
  root.style.setProperty('--shadow-style', tokens.shadowStyle);

  // Motion Control
  if (accessibility.reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // Theme Mode Class
  if (tokens.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function saveThemePreference(presetKey: ThemePresetKey): void {
  try {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, presetKey);
  } catch {
    // Storage failure safety
  }
}

export function saveAccessibilityPreference(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage failure safety
  }
}
