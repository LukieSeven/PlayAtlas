import { useSyncExternalStore } from 'react';
import { getCatalogLoadProgress, subscribeCatalogLoadProgress } from '../services/catalogFacetService';

export function useCatalogLoadProgress() {
  return useSyncExternalStore(subscribeCatalogLoadProgress, getCatalogLoadProgress, () => null);
}
