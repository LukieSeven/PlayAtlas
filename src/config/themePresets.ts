import { ThemeTokens, ThemePresetKey } from '../types/theme';

export const themePresets: Record<ThemePresetKey, ThemeTokens> = {
  watercolor_atlas: {
    presetKey: 'watercolor_atlas',
    name: 'Watercolor Atlas (Default)',
    description: 'Fantasy cartography featuring Cormorant Garamond lettering, rich ocean-blue & forest-green landmasses, play-arrow beveled gold sidebar framing, faded atlas script, and compass gold accents.',
    
    appBackground: '#f5f0e1',               // Warm Parchment Base
    appBackgroundSecondary: '#ece4d0',      // Aged Parchment Shadow
    sidebarBackground: '#0d1b2a',            // Deep Navy Ink Sidebar
    sidebarText: '#f1f5f9',                  // Parchment White Sidebar Text
    sidebarMutedText: '#94a3b8',             // Muted Slate Navy
    sidebarActiveBackground: 'linear-gradient(135deg, rgba(43, 122, 148, 0.45) 0%, rgba(54, 110, 87, 0.45) 100%)',
    headerBackground: 'rgba(245, 240, 225, 0.94)', // Parchment Translucent Header
    
    // Play-Arrow Inspired Beveled Sidebar Rail
    sidebarEdgeStyle: 'beveled-arrow',
    sidebarEdgePrimary: '#d4af37',
    sidebarEdgeSecondary: '#1b5e75',

    // Official Parchment Paper, Forest Landmass & Atlas Text System
    paperBase: '#f7f4ea',
    paperHighlight: '#fefcf5',
    paperTextureUrl: './branding/watercolor-paper-grain.svg',
    paperTextureOpacity: 0.35,
    paperGrainOpacity: 0.35,
    washBlue: '#2b7a94',
    washTeal: '#1b5e75',
    washGreen: '#366e57',
    washNavy: '#0f2b48',
    washOpacity: 0.85, // 2-3x richer watercolor visual presence
    pigmentEdgeOpacity: 0.6,
    landmassTextureUrl: './branding/watercolor-landmass-forest.svg',
    coastlineTextureUrl: './branding/watercolor-coastline.svg',
    mapLabelOpacity: 0.14,
    routeDensity: 'high',
    coastlineOpacity: 0.35,
    backgroundArtworkIntensity: 1.0,
    contentSurfaceOpacity: 0.95,

    atlasLineColor: '#2b4c6f',
    atlasLineOpacity: 0.35,
    routeLineColor: '#d4af37',
    routeLineOpacity: 0.45,
    ornamentColor: '#d4af37',
    ornamentOpacity: 0.4,
    panelPaperColor: '#fefcf6',
    panelTextureOpacity: 0.25,

    panelBackground: 'rgba(254, 252, 246, 0.95)',
    panelElevatedBackground: 'rgba(255, 255, 255, 0.97)',
    panelBorder: 'rgba(212, 175, 55, 0.45)',
    
    textPrimary: '#0f2b48',                  // Deep Navy Ink Primary
    textSecondary: '#2b4c6f',                // Muted Ocean Navy
    textMuted: '#64748b',                    // Ink Slate
    headingColor: '#0c1e36',                 // Deep Cartographic Navy
    
    primaryAction: '#2b7a94',                // Ocean Blue
    primaryActionHover: '#1b5e75',           // Deep Ocean Blue
    accent: '#d4af37',                       // Compass Gold Accent
    focusRing: 'rgba(212, 175, 55, 0.5)',
    
    inputBackground: '#fefcf6',
    inputBorder: 'rgba(43, 122, 148, 0.35)',
    badgeBackground: 'rgba(54, 110, 87, 0.18)', // Sea Green Badge
    badgeText: '#1b5e75',                    // Ocean Blue Badge Text
    overlayBackground: 'rgba(12, 22, 38, 0.75)',
    
    success: '#366e57',                      // Sea Green
    warning: '#d4af37',                      // Compass Gold
    danger: '#c53030',                       // Wax Seal Red
    
    headingFontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    displayHeadingFont: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    bodyFontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    
    shadow: '0 10px 25px -5px rgba(15, 43, 72, 0.12), 0 0 12px rgba(212, 175, 55, 0.18)',
    cornerRadius: '1rem',
    textureOpacity: 0.35,
    decorativeMotif: 'cartographic',
    isDark: false,
  },
  midnight_ocean: {
    presetKey: 'midnight_ocean',
    name: 'Midnight Ocean',
    description: 'Deep oceanic night sky, cyan glow highlights, and dark slate panels.',
    
    appBackground: '#030712',
    appBackgroundSecondary: '#0b1329',
    sidebarBackground: '#070f23',
    sidebarText: '#f1f5f9',
    sidebarMutedText: '#94a3b8',
    sidebarActiveBackground: 'rgba(14, 165, 233, 0.2)',
    headerBackground: 'rgba(3, 7, 18, 0.85)',
    
    sidebarEdgeStyle: 'simple-border',
    sidebarEdgePrimary: 'rgba(56, 189, 248, 0.25)',

    paperBase: '#030712',
    paperHighlight: '#0f172a',
    paperTextureOpacity: 0.0,
    paperGrainOpacity: 0.0,
    washBlue: '#0ea5e9',
    washTeal: '#0284c7',
    washGreen: '#10b981',
    washNavy: '#0f172a',
    washOpacity: 0.15,
    pigmentEdgeOpacity: 0.1,
    mapLabelOpacity: 0.0,
    routeDensity: 'low',
    coastlineOpacity: 0.0,
    backgroundArtworkIntensity: 0.0,
    contentSurfaceOpacity: 0.95,

    atlasLineColor: '#38bdf8',
    atlasLineOpacity: 0.05,
    routeLineColor: '#38bdf8',
    routeLineOpacity: 0.1,
    ornamentColor: '#38bdf8',
    ornamentOpacity: 0.1,
    panelPaperColor: '#0f172a',
    panelTextureOpacity: 0.0,

    panelBackground: '#0f172a',
    panelElevatedBackground: '#1e293b',
    panelBorder: 'rgba(56, 189, 248, 0.25)',
    
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    headingColor: '#ffffff',
    
    primaryAction: '#0ea5e9',
    primaryActionHover: '#0284c7',
    accent: '#38bdf8',
    focusRing: 'rgba(56, 189, 248, 0.5)',
    
    inputBackground: '#0f172a',
    inputBorder: '#334155',
    badgeBackground: 'rgba(14, 165, 233, 0.15)',
    badgeText: '#38bdf8',
    overlayBackground: 'rgba(3, 7, 18, 0.85)',
    
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    
    headingFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    displayHeadingFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    bodyFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    
    shadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
    cornerRadius: '0.75rem',
    textureOpacity: 0.0,
    decorativeMotif: 'minimal',
    isDark: true,
  },
  clean_catalog: {
    presetKey: 'clean_catalog',
    name: 'Clean Catalog (Light)',
    description: 'High-contrast light parchment and crisp indigo for daytime reading.',
    
    appBackground: '#f8fafc',
    appBackgroundSecondary: '#f1f5f9',
    sidebarBackground: '#ffffff',
    sidebarText: '#0f172a',
    sidebarMutedText: '#64748b',
    sidebarActiveBackground: 'rgba(30, 64, 175, 0.1)',
    headerBackground: 'rgba(255, 255, 255, 0.9)',
    
    sidebarEdgeStyle: 'simple-border',
    sidebarEdgePrimary: '#e2e8f0',

    paperBase: '#f8fafc',
    paperHighlight: '#ffffff',
    paperTextureOpacity: 0.0,
    paperGrainOpacity: 0.05,
    washBlue: '#1e40af',
    washTeal: '#047857',
    washGreen: '#059669',
    washNavy: '#1e293b',
    washOpacity: 0.05,
    pigmentEdgeOpacity: 0.05,
    mapLabelOpacity: 0.05,
    routeDensity: 'low',
    coastlineOpacity: 0.05,
    backgroundArtworkIntensity: 0.1,
    contentSurfaceOpacity: 1.0,

    atlasLineColor: '#cbd5e1',
    atlasLineOpacity: 0.1,
    routeLineColor: '#b45309',
    routeLineOpacity: 0.15,
    ornamentColor: '#1e40af',
    ornamentOpacity: 0.1,
    panelPaperColor: '#ffffff',
    panelTextureOpacity: 0.0,

    panelBackground: '#ffffff',
    panelElevatedBackground: '#ffffff',
    panelBorder: '#e2e8f0',
    
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    headingColor: '#0f172a',
    
    primaryAction: '#1e40af',
    primaryActionHover: '#1d4ed8',
    accent: '#b45309',
    focusRing: 'rgba(30, 64, 175, 0.4)',
    
    inputBackground: '#ffffff',
    inputBorder: '#cbd5e1',
    badgeBackground: 'rgba(30, 64, 175, 0.1)',
    badgeText: '#1e40af',
    overlayBackground: 'rgba(15, 23, 42, 0.5)',
    
    success: '#047857',
    warning: '#b45309',
    danger: '#b91c1c',
    
    headingFontFamily: "'Cormorant Garamond', Georgia, serif",
    displayHeadingFont: "'Cormorant Garamond', Georgia, serif",
    bodyFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    
    shadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05)',
    cornerRadius: '0.75rem',
    textureOpacity: 0.05,
    decorativeMotif: 'cartographic',
    isDark: false,
  },
  neon_arcade: {
    presetKey: 'neon_arcade',
    name: 'Neon Arcade',
    description: 'Cyberpunk neon magenta, cyan glow, and dark grid synth aesthetic.',
    
    appBackground: '#090514',
    appBackgroundSecondary: '#13092b',
    sidebarBackground: '#0d061e',
    sidebarText: '#f472b6',
    sidebarMutedText: '#c4b5fd',
    sidebarActiveBackground: 'rgba(236, 72, 153, 0.25)',
    headerBackground: 'rgba(9, 5, 20, 0.88)',
    
    sidebarEdgeStyle: 'simple-border',
    sidebarEdgePrimary: 'rgba(236, 72, 153, 0.35)',

    paperBase: '#090514',
    paperHighlight: '#160d29',
    paperTextureOpacity: 0.0,
    paperGrainOpacity: 0.0,
    washBlue: '#ec4899',
    washTeal: '#06b6d4',
    washGreen: '#10b981',
    washNavy: '#160d29',
    washOpacity: 0.15,
    pigmentEdgeOpacity: 0.1,
    mapLabelOpacity: 0.0,
    routeDensity: 'low',
    coastlineOpacity: 0.0,
    backgroundArtworkIntensity: 0.0,
    contentSurfaceOpacity: 0.95,

    atlasLineColor: '#ec4899',
    atlasLineOpacity: 0.1,
    routeLineColor: '#06b6d4',
    routeLineOpacity: 0.2,
    ornamentColor: '#ec4899',
    ornamentOpacity: 0.15,
    panelPaperColor: '#160d29',
    panelTextureOpacity: 0.0,

    panelBackground: '#160d29',
    panelElevatedBackground: '#21123d',
    panelBorder: 'rgba(236, 72, 153, 0.35)',
    
    textPrimary: '#f472b6',
    textSecondary: '#c084fc',
    textMuted: '#c4b5fd',
    headingColor: '#ffffff',
    
    primaryAction: '#ec4899',
    primaryActionHover: '#db2777',
    accent: '#06b6d4',
    focusRing: 'rgba(236, 72, 153, 0.6)',
    
    inputBackground: '#160d29',
    inputBorder: 'rgba(236, 72, 153, 0.4)',
    badgeBackground: 'rgba(236, 72, 153, 0.2)',
    badgeText: '#f472b6',
    overlayBackground: 'rgba(9, 5, 20, 0.9)',
    
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
    
    headingFontFamily: "'Cormorant Garamond', sans-serif",
    displayHeadingFont: "'Cormorant Garamond', sans-serif",
    bodyFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    
    shadow: '0 0 25px rgba(236, 72, 153, 0.3)',
    cornerRadius: '0.5rem',
    textureOpacity: 0.0,
    decorativeMotif: 'neon',
    isDark: true,
  },
  retro_console: {
    presetKey: 'retro_console',
    name: 'Retro Console',
    description: 'Nostalgic 16-bit amber, parchment brown, and CRT console styling.',
    
    appBackground: '#18120c',
    appBackgroundSecondary: '#211811',
    sidebarBackground: '#140f09',
    sidebarText: '#fef3c7',
    sidebarMutedText: '#fbbf24',
    sidebarActiveBackground: 'rgba(217, 119, 6, 0.3)',
    headerBackground: 'rgba(24, 18, 12, 0.9)',
    
    sidebarEdgeStyle: 'simple-border',
    sidebarEdgePrimary: 'rgba(217, 119, 6, 0.35)',

    paperBase: '#18120c',
    paperHighlight: '#261c14',
    paperTextureOpacity: 0.0,
    paperGrainOpacity: 0.1,
    washBlue: '#d97706',
    washTeal: '#b45309',
    washGreen: '#059669',
    washNavy: '#261c14',
    washOpacity: 0.15,
    pigmentEdgeOpacity: 0.15,
    mapLabelOpacity: 0.0,
    routeDensity: 'low',
    coastlineOpacity: 0.0,
    backgroundArtworkIntensity: 0.0,
    contentSurfaceOpacity: 0.95,

    atlasLineColor: '#d97706',
    atlasLineOpacity: 0.1,
    routeLineColor: '#d97706',
    routeLineOpacity: 0.2,
    ornamentColor: '#d97706',
    ornamentOpacity: 0.15,
    panelPaperColor: '#261c14',
    panelTextureOpacity: 0.05,

    panelBackground: '#261c14',
    panelElevatedBackground: '#33251a',
    panelBorder: 'rgba(217, 119, 6, 0.35)',
    
    textPrimary: '#fef3c7',
    textSecondary: '#fde68a',
    textMuted: '#fbbf24',
    headingColor: '#fffbeb',
    
    primaryAction: '#d97706',
    primaryActionHover: '#b45309',
    accent: '#dc2626',
    focusRing: 'rgba(217, 119, 6, 0.5)',
    
    inputBackground: '#261c14',
    inputBorder: '#78350f',
    badgeBackground: 'rgba(217, 119, 6, 0.2)',
    badgeText: '#fef3c7',
    overlayBackground: 'rgba(24, 18, 12, 0.85)',
    
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    
    headingFontFamily: "'Cormorant Garamond', Georgia, serif",
    displayHeadingFont: "'Cormorant Garamond', Georgia, serif",
    bodyFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    
    shadow: '4px 4px 0px rgba(0, 0, 0, 0.8)',
    cornerRadius: '0.375rem',
    textureOpacity: 0.1,
    decorativeMotif: 'retro',
    isDark: true,
  },
  forest_explorer: {
    presetKey: 'forest_explorer',
    name: 'Forest Explorer',
    description: 'Natural wilderness emerald green, earthy dark wood, and gold compass markers.',
    
    appBackground: '#061a12',
    appBackgroundSecondary: '#0a261b',
    sidebarBackground: '#04120c',
    sidebarText: '#ecfdf5',
    sidebarMutedText: '#6ee7b7',
    sidebarActiveBackground: 'rgba(16, 185, 129, 0.25)',
    headerBackground: 'rgba(6, 26, 18, 0.9)',
    
    sidebarEdgeStyle: 'simple-border',
    sidebarEdgePrimary: 'rgba(16, 185, 129, 0.3)',

    paperBase: '#061a12',
    paperHighlight: '#0d2d20',
    paperTextureOpacity: 0.0,
    paperGrainOpacity: 0.15,
    washBlue: '#059669',
    washTeal: '#10b981',
    washGreen: '#047857',
    washNavy: '#0d2d20',
    washOpacity: 0.2,
    pigmentEdgeOpacity: 0.25,
    mapLabelOpacity: 0.05,
    routeDensity: 'medium',
    coastlineOpacity: 0.1,
    backgroundArtworkIntensity: 0.2,
    contentSurfaceOpacity: 0.95,

    atlasLineColor: '#10b981',
    atlasLineOpacity: 0.15,
    routeLineColor: '#eab308',
    routeLineOpacity: 0.25,
    ornamentColor: '#eab308',
    ornamentOpacity: 0.2,
    panelPaperColor: '#0d2d20',
    panelTextureOpacity: 0.1,

    panelBackground: '#0d2d20',
    panelElevatedBackground: '#133e2d',
    panelBorder: 'rgba(16, 185, 129, 0.3)',
    
    textPrimary: '#ecfdf5',
    textSecondary: '#a7f3d0',
    textMuted: '#6ee7b7',
    headingColor: '#ffffff',
    
    primaryAction: '#059669',
    primaryActionHover: '#047857',
    accent: '#eab308',
    focusRing: 'rgba(16, 185, 129, 0.5)',
    
    inputBackground: '#0d2d20',
    inputBorder: '#064e3b',
    badgeBackground: 'rgba(16, 185, 129, 0.2)',
    badgeText: '#ecfdf5',
    overlayBackground: 'rgba(6, 26, 18, 0.85)',
    
    success: '#10b981',
    warning: '#eab308',
    danger: '#ef4444',
    
    headingFontFamily: "'Cormorant Garamond', Georgia, serif",
    displayHeadingFont: "'Cormorant Garamond', Georgia, serif",
    bodyFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    
    shadow: '0 10px 25px -5px rgba(6, 26, 18, 0.7)',
    cornerRadius: '1rem',
    textureOpacity: 0.15,
    decorativeMotif: 'cartographic',
    isDark: true,
  },
};
