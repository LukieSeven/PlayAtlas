import { fetchAndDecompressJson } from '../utils/decompression';
import type { CompactGameLookupRecord } from '../types/catalog';

self.onmessage = async event => {
  try {
    const data = await fetchAndDecompressJson<{ schemaVersion: number; records: CompactGameLookupRecord[] }>(event.data.url, undefined, progress => self.postMessage({ progress }));
    if (data.schemaVersion !== 1 || !Array.isArray(data.records)) throw new Error('Invalid catalog filters dataset');
    self.postMessage({ records: data.records });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Catalog filters unavailable' });
  }
};
