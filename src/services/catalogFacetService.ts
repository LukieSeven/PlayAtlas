import type { CompactGameLookupRecord } from '../types/catalog';
import { getBasePathAwareUrl } from './catalogDataSource';
import type { LoadingProgress } from '../types/loadingProgress';

let progress: LoadingProgress | null = null;
const listeners = new Set<() => void>();
export const getCatalogLoadProgress = () => progress;
export const subscribeCatalogLoadProgress = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function report(value: LoadingProgress) { progress = value; listeners.forEach(listener => listener()); }

let pending: Promise<Map<number, CompactGameLookupRecord>> | null = null;
export function loadCatalogFacets(): Promise<Map<number, CompactGameLookupRecord>> {
  if (!pending) pending = new Promise<Map<number, CompactGameLookupRecord>>((resolve, reject) => {
    report({ phase: 'download', loaded: 0 });
    const worker = new Worker(new URL('../workers/catalogFacets.worker.ts', import.meta.url), { type: 'module' });
    const timer = window.setTimeout(() => { worker.terminate(); reject(new Error('Catalog filter download timed out')); }, 120000);
    const stop = () => { window.clearTimeout(timer); worker.terminate(); };
    worker.onmessage = event => {
      if (event.data.progress) { report(event.data.progress); return; }
      stop();
      if (event.data.error) reject(new Error(event.data.error));
      else { const records = new Map((event.data.records as CompactGameLookupRecord[]).map(record => [record.id, record])); report({ phase: 'ready' }); resolve(records); }
    };
    worker.onerror = event => { stop(); reject(new Error(event.message)); };
    worker.postMessage({ url: new URL(getBasePathAwareUrl('data/catalog-facets.json.gz'), window.location.href).href });
  }).catch(error => { pending = null; report({ phase: 'error' }); throw error; });
  return pending;
}
