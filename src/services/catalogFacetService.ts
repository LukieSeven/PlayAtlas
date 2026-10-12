import type { CompactGameLookupRecord } from '../types/catalog';
import { getBasePathAwareUrl } from './catalogDataSource';

let pending: Promise<Map<number, CompactGameLookupRecord>> | null = null;
export function loadCatalogFacets(): Promise<Map<number, CompactGameLookupRecord>> {
  if (!pending) pending = new Promise<Map<number, CompactGameLookupRecord>>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/catalogFacets.worker.ts', import.meta.url), { type: 'module' });
    const timer = window.setTimeout(() => { worker.terminate(); reject(new Error('Catalog filter download timed out')); }, 120000);
    const stop = () => { window.clearTimeout(timer); worker.terminate(); };
    worker.onmessage = event => {
      stop();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(new Map((event.data.records as CompactGameLookupRecord[]).map(record => [record.id, record])));
    };
    worker.onerror = event => { stop(); reject(new Error(event.message)); };
    worker.postMessage({ url: new URL(getBasePathAwareUrl('data/catalog-facets.json.gz'), window.location.href).href });
  }).catch(error => { pending = null; throw error; });
  return pending;
}
