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

  root.dataset.theme = tokens.presetKey;
  root.dataset.themeMode = tokens.isDark ? 'dark' : 'light';

  // Apply Backgrounds
  if (accessibility.plainBackgroundMode) {
    root.style.setProperty('--app-bg', tokens.isDark ? '#0c1626' : '#ffffff');
    root.style.setProperty('--app-bg-secondary', tokens.isDark ? '#132238' : '#f8fafc');
    root.style.setProperty('--panel-bg', tokens.isDark ? '#132238' : '#ffffff');
    root.style.setProperty('--panel-elevated-bg', tokens.isDark ? '#1c2d47' : '#ffffff');
    root.style.setProperty('--sidebar-bg', tokens.isDark ? '#070f1a' : '#f1f5f9');
  } else {
    root.style.setProperty('--app-bg', tokens.appBackground);
    root.style.setProperty('--app-bg-secondary', tokens.appBackgroundSecondary);
    root.style.setProperty('--panel-bg', tokens.panelBackground);
    root.style.setProperty('--panel-elevated-bg', tokens.panelElevatedBackground);
    root.style.setProperty('--sidebar-bg', tokens.sidebarBackground);
  }

  root.style.setProperty('--header-bg', tokens.headerBackground);
  root.style.setProperty('--panel-border', tokens.panelBorder);

  // Keep the current atlas component palette connected to the preset engine.
  // Newer screens use these semantic variables while older screens use the
  // legacy variables below; both must describe the same active theme.
  root.style.setProperty('--atlas-canvas-bg', accessibility.plainBackgroundMode ? (tokens.isDark ? '#0c1626' : '#ffffff') : tokens.appBackground);
  root.style.setProperty('--atlas-panel-bg', accessibility.plainBackgroundMode ? (tokens.isDark ? '#132238' : '#ffffff') : tokens.panelBackground);
  root.style.setProperty('--atlas-panel-raised-bg', accessibility.plainBackgroundMode ? (tokens.isDark ? '#1c2d47' : '#ffffff') : tokens.panelElevatedBackground);
  root.style.setProperty('--atlas-panel-inset-bg', accessibility.plainBackgroundMode ? (tokens.isDark ? '#0f1d31' : '#f8fafc') : tokens.appBackgroundSecondary);
  root.style.setProperty('--atlas-panel-featured-bg', accessibility.plainBackgroundMode ? (tokens.isDark ? '#132238' : '#ffffff') : tokens.panelElevatedBackground);
  root.style.setProperty('--atlas-border-gold', tokens.accent);
  root.style.setProperty('--atlas-border-panel', tokens.panelBorder);
  root.style.setProperty('--atlas-border-subtle', tokens.inputBorder);
  root.style.setProperty('--atlas-shadow-sm', tokens.shadow);
  root.style.setProperty('--atlas-shadow-md', tokens.shadow);
  root.style.setProperty('--atlas-shadow-lg', tokens.shadow);
  root.style.setProperty('--atlas-radius-lg', tokens.cornerRadius);
  root.style.setProperty('--atlas-radius-xl', tokens.cornerRadius);

  // Apply Sidebar Beveled Rail Tokens
  root.style.setProperty('--sidebar-edge-primary', tokens.sidebarEdgePrimary || '#d4af37');
  root.style.setProperty('--sidebar-edge-secondary', tokens.sidebarEdgeSecondary || '#1b5e75');

  // Apply Parchment Paper & Landmass Texture System Variables
  const activePaperTextureUrl = (accessibility.disableTextures || accessibility.plainBackgroundMode || !tokens.paperTextureUrl)
    ? 'none'
    : `url("${tokens.paperTextureUrl}")`;

  const activeLandmassTextureUrl = (accessibility.disableTextures || accessibility.plainBackgroundMode || !tokens.landmassTextureUrl)
    ? 'none'
    : `url("${tokens.landmassTextureUrl}")`;

  const activeCoastlineTextureUrl = (accessibility.reduceDecorativeElements || accessibility.plainBackgroundMode || !tokens.coastlineTextureUrl)
    ? 'none'
    : `url("${tokens.coastlineTextureUrl}")`;

  const activePaperTextureOpacity = (accessibility.disableTextures || accessibility.plainBackgroundMode)
    ? 0
    : tokens.paperTextureOpacity;

  root.style.setProperty('--paper-base', tokens.paperBase);
  root.style.setProperty('--paper-highlight', tokens.paperHighlight);
  root.style.setProperty('--paper-texture-url', activePaperTextureUrl);
  root.style.setProperty('--landmass-texture-url', activeLandmassTextureUrl);
  root.style.setProperty('--coastline-texture-url', activeCoastlineTextureUrl);
  root.style.setProperty('--paper-texture-opacity', activePaperTextureOpacity.toString());

  root.style.setProperty('--wash-blue', tokens.washBlue);
  root.style.setProperty('--wash-teal', tokens.washTeal);
  root.style.setProperty('--wash-green', tokens.washGreen);
  root.style.setProperty('--wash-navy', tokens.washNavy);
  
  // Apply Accessibility Controlled Texture Opacities
  const activeGrainOpacity = accessibility.disableTextures || accessibility.plainBackgroundMode ? 0 : tokens.paperGrainOpacity;
  const activeWashOpacity = accessibility.disableTextures || accessibility.plainBackgroundMode ? 0 : tokens.washOpacity;
  const activePigmentEdgeOpacity = accessibility.disableTextures || accessibility.plainBackgroundMode ? 0 : tokens.pigmentEdgeOpacity;
  const activeAtlasLineOpacity = accessibility.reduceDecorativeElements || accessibility.plainBackgroundMode ? 0 : tokens.atlasLineOpacity;
  const activeMapLabelOpacity = accessibility.reduceDecorativeElements || accessibility.plainBackgroundMode ? 0 : tokens.mapLabelOpacity;
  const activeRouteOpacity = accessibility.reduceDecorativeElements || accessibility.plainBackgroundMode ? 0 : tokens.routeLineOpacity;
  const activeOrnamentOpacity = accessibility.reduceDecorativeElements || accessibility.plainBackgroundMode ? 0 : tokens.ornamentOpacity;

  root.style.setProperty('--paper-grain-opacity', activeGrainOpacity.toString());
  root.style.setProperty('--wash-opacity', activeWashOpacity.toString());
  root.style.setProperty('--pigment-edge-opacity', activePigmentEdgeOpacity.toString());
  root.style.setProperty('--atlas-line-color', tokens.atlasLineColor);
  root.style.setProperty('--atlas-line-opacity', activeAtlasLineOpacity.toString());
  root.style.setProperty('--map-label-opacity', activeMapLabelOpacity.toString());
  root.style.setProperty('--route-line-color', tokens.routeLineColor);
  root.style.setProperty('--route-line-opacity', activeRouteOpacity.toString());
  root.style.setProperty('--ornament-color', tokens.ornamentColor);
  root.style.setProperty('--ornament-opacity', activeOrnamentOpacity.toString());
  root.style.setProperty('--panel-texture-opacity', (accessibility.disableTextures ? 0 : tokens.panelTextureOpacity).toString());

  // Apply Sidebar Colors
  root.style.setProperty('--sidebar-text', tokens.sidebarText);
  root.style.setProperty('--sidebar-muted-text', tokens.sidebarMutedText);
  root.style.setProperty('--sidebar-active-bg', tokens.sidebarActiveBackground);

  // Apply Typography Colors
  root.style.setProperty('--text-primary', accessibility.highContrast ? (tokens.isDark ? '#ffffff' : '#000000') : tokens.textPrimary);
  root.style.setProperty('--text-secondary', accessibility.highContrast ? (tokens.isDark ? '#cbd5e1' : '#334155') : tokens.textSecondary);
  root.style.setProperty('--text-muted', accessibility.highContrast ? (tokens.isDark ? '#cbd5e1' : '#475569') : tokens.textMuted);
  root.style.setProperty('--heading-color', accessibility.highContrast ? (tokens.isDark ? '#ffffff' : '#000000') : tokens.headingColor);
  root.style.setProperty('--atlas-ink-primary', accessibility.highContrast ? (tokens.isDark ? '#ffffff' : '#000000') : tokens.textPrimary);
  root.style.setProperty('--atlas-ink-secondary', accessibility.highContrast ? (tokens.isDark ? '#e2e8f0' : '#1e293b') : tokens.textSecondary);
  root.style.setProperty('--atlas-ink-muted', accessibility.highContrast ? (tokens.isDark ? '#cbd5e1' : '#334155') : tokens.textMuted);
  root.style.setProperty('--atlas-ink-subdued', accessibility.highContrast ? (tokens.isDark ? '#cbd5e1' : '#475569') : tokens.textMuted);

  // Apply Actions & Accents
  root.style.setProperty('--primary-action', tokens.primaryAction);
  root.style.setProperty('--primary-action-hover', tokens.primaryActionHover);
  root.style.setProperty('--accent-color', tokens.accent);
  root.style.setProperty('--focus-ring', tokens.focusRing);
  root.style.setProperty('--atlas-teal-deep', tokens.primaryAction);
  root.style.setProperty('--atlas-teal-dark', tokens.primaryAction);
  root.style.setProperty('--atlas-teal-medium', tokens.primaryActionHover);
  root.style.setProperty('--atlas-teal-light', tokens.primaryActionHover);
  root.style.setProperty('--atlas-gold-antique', tokens.accent);
  root.style.setProperty('--atlas-gold-light', tokens.accent);
  root.style.setProperty('--atlas-gold-dark', tokens.accent);
  root.style.setProperty('--atlas-focus-ring', tokens.focusRing);

  // Apply Inputs & Badges
  root.style.setProperty('--input-bg', tokens.inputBackground);
  root.style.setProperty('--input-border', tokens.inputBorder);
  root.style.setProperty('--badge-bg', tokens.badgeBackground);
  root.style.setProperty('--badge-text', tokens.badgeText);
  root.style.setProperty('--overlay-bg', tokens.overlayBackground);

  // Apply Status Colors
  root.style.setProperty('--status-success', tokens.success);
  root.style.setProperty('--status-warning', tokens.warning);
  root.style.setProperty('--status-danger', tokens.danger);
  root.style.setProperty('--atlas-status-success', tokens.success);
  root.style.setProperty('--atlas-status-warning', tokens.warning);
  root.style.setProperty('--atlas-status-danger', tokens.danger);

  // Apply Font Families (Cormorant Garamond display headings)
  root.style.setProperty('--font-heading', tokens.displayHeadingFont || tokens.headingFontFamily);
  root.style.setProperty('--font-display', tokens.displayHeadingFont || tokens.headingFontFamily);
  root.style.setProperty('--font-body', tokens.bodyFontFamily);

  // Apply Utilities & General Styles
  root.style.setProperty('--texture-opacity', (accessibility.disableTextures ? 0 : tokens.textureOpacity).toString());
  root.style.setProperty('--border-radius', tokens.cornerRadius);
  root.style.setProperty('--shadow-style', tokens.shadow);
  const artworkIntensity = accessibility.disableTextures || accessibility.plainBackgroundMode ? 0 : tokens.backgroundArtworkIntensity;
  root.style.setProperty('--background-artwork-intensity', artworkIntensity.toString());
  root.style.setProperty('--background-artwork-opacity', (0.48 * artworkIntensity).toString());
  root.style.setProperty('--cartographic-overlay-opacity', ((tokens.atlasLineOpacity + 0.16) * artworkIntensity).toString());

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
