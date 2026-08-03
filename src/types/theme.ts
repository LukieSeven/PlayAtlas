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

  // Primary Structure Colors
  appBackground: string;
  appBackgroundSecondary: string;
  sidebarBackground: string;
  sidebarText: string;
  sidebarMutedText: string;
  sidebarActiveBackground: string;
  headerBackground: string;
  
  // Custom Sidebar Edge Framing
  sidebarEdgeStyle?: 'beveled-arrow' | 'simple-border' | 'none';
  sidebarEdgePrimary?: string;
  sidebarEdgeSecondary?: string;

  // Paper, Watercolor & Landmass Texture Tokens
  paperBase: string;
  paperHighlight: string;
  paperTextureUrl?: string;
  paperTextureOpacity: number;
  paperGrainOpacity: number;
  washBlue: string;
  washTeal: string;
  washGreen: string;
  washNavy: string;
  washOpacity: number;
  pigmentEdgeOpacity: number;
  landmassTextureUrl?: string;
  coastlineTextureUrl?: string;
  mapLabelOpacity: number;
  routeDensity: 'high' | 'medium' | 'low' | 'none';
  coastlineOpacity: number;
  backgroundArtworkIntensity: number;
  contentSurfaceOpacity: number;

  atlasLineColor: string;
  atlasLineOpacity: number;
  routeLineColor: string;
  routeLineOpacity: number;
  ornamentColor: string;
  ornamentOpacity: number;
  panelPaperColor: string;
  panelTextureOpacity: number;

  // Panel & Card Surfaces
  panelBackground: string;
  panelElevatedBackground: string;
  panelBorder: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  headingColor: string;

  // Actions & Focus
  primaryAction: string;
  primaryActionHover: string;
  accent: string; // Gold for Play Atlas
  focusRing: string;

  // Inputs & Badges
  inputBackground: string;
  inputBorder: string;
  badgeBackground: string;
  badgeText: string;
  overlayBackground: string;

  // Status Colors
  success: string;
  warning: string;
  danger: string;

  // Typography Families
  headingFontFamily: string;
  displayHeadingFont: string;
  bodyFontFamily: string;

  // Utilities & Decorative Controls
  shadow: string;
  cornerRadius: string;
  textureOpacity: number;
  decorativeMotif: 'cartographic' | 'minimal' | 'neon' | 'retro' | 'none';

  isDark: boolean;
}
