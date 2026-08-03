export type CatalogDataSourceMode = 'igdb_browser_catalog' | 'lizardbyte';

const STORAGE_KEY = 'play_atlas_data_source';

/**
 * Get active catalog data source mode.
 * Default in production is 'igdb_browser_catalog'.
 * Temporary emergency rollback available via ?datasource=lizardbyte.
 */
export function getCatalogDataSourceMode(): CatalogDataSourceMode {
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    const dsParam = urlParams.get('datasource');
    if (dsParam === 'lizardbyte') {
      return 'lizardbyte';
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'lizardbyte') {
      return 'lizardbyte';
    }
  } catch {
    // LocalStorage fallback
  }

  return 'igdb_browser_catalog';
}

/**
 * Set catalog data source mode
 */
export function setCatalogDataSourceMode(mode: CatalogDataSourceMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (err) {
    console.warn('Failed to save data source mode:', err);
  }
}

/**
 * Get base-path aware resource URL for GitHub Pages compatibility (/PlayAtlas/ or ./)
 */
export function getBasePathAwareUrl(relPath: string): string {
  const rawBaseUrl = (import.meta as any).env?.BASE_URL || './';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
  const cleanRel = relPath.startsWith('/') ? relPath.slice(1) : relPath;
  return `${baseUrl}${cleanRel}`;
}

/**
 * GitHub Release URL for direct ZIP archive download (Offloaded from GitHub Pages site size)
 */
export const FULL_CATALOG_RELEASE_ZIP_URL =
  'https://github.com/LukieSeven/PlayAtlas/releases/download/v1.0.0-catalog/play-atlas-full-catalog.zip';
