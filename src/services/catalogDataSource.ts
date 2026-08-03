export type CatalogDataSourceMode = 'lizardbyte' | 'igdb_browser_catalog';

const STORAGE_KEY = 'play_atlas_data_source';

/**
 * Get active catalog data source mode (defaults to 'lizardbyte' unless set or URL param specifies 'igdb')
 */
export function getCatalogDataSourceMode(): CatalogDataSourceMode {
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    const dsParam = urlParams.get('datasource');
    if (dsParam === 'igdb' || dsParam === 'igdb_browser_catalog') {
      return 'igdb_browser_catalog';
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'igdb' || stored === 'igdb_browser_catalog') {
      return 'igdb_browser_catalog';
    }
  } catch {
    // LocalStorage fallback
  }

  return 'lizardbyte';
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
