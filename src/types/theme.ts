export type ThemePresetKey =
  | 'watercolor_atlas'
  | 'midnight_ocean'
  | 'clean_catalog'
  | 'neon_arcade'
  | 'retro_console'
  | 'forest_explorer';

export interface AccessibilitySettings {
  disableTextures: boolean;
  reduceDecorativeElements: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  plainBackgroundMode: boolean;
}

export interface ThemeTokens {
  presetKey: ThemePresetKey;
  name: string;
  description: string;

  // Color Palette
  primaryColor: string;
  secondaryColor: string;
  accentColor: string; // Gold for Play Atlas
  backgroundColor: string;
  panelSurfaceColor: string;
  panelBorderColor: string;
  textColor: string;
  textMutedColor: string;
  headingColor: string;

  // Typography
  headingFontFamily: string;
  bodyFontFamily: string;

  // Stylistic Utilities
  textureUrl?: string;
  textureStrength: number; // 0.0 to 1.0
  decorativeMotif: 'cartographic' | 'minimal' | 'neon' | 'retro' | 'none';
  borderStyle: string;
  cornerRadius: string;
  shadowStyle: string;

  // Mode Indicator
  isDark: boolean;
}
