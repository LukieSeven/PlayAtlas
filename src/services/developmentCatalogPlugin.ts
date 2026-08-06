import { CompactGameLookupRecord } from '../types/catalog';
import type { ReleaseListingRecord } from './releaseCatalogService';

export interface DevelopmentCatalogPlugin {
  search(query: string): CompactGameLookupRecord[];
  sampleRandom(randomValue: number): CompactGameLookupRecord | null;
  createReleaseRecords(isUpcoming: boolean): ReleaseListingRecord[];
}

let pluginPromise: Promise<DevelopmentCatalogPlugin | null> | null = null;

export function isDevelopmentCatalogPluginConfigured(): boolean {
  return Boolean(import.meta.env?.DEV && import.meta.env?.VITE_CATALOG_PLUGIN_URL);
}

export async function getDevelopmentCatalogPlugin(): Promise<DevelopmentCatalogPlugin | null> {
  if (!isDevelopmentCatalogPluginConfigured()) return null;
  if (!pluginPromise) {
    const pluginUrl: string = import.meta.env.VITE_CATALOG_PLUGIN_URL;
    pluginPromise = import(/* @vite-ignore */ pluginUrl)
      .then(module => module.default as DevelopmentCatalogPlugin)
      .catch(error => {
        console.warn('Development catalog plugin could not be loaded:', error);
        return null;
      });
  }
  return pluginPromise;
}
