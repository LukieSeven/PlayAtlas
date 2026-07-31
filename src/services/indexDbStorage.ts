import { CompiledGameIndex, GameIndexRecord, IndexManifest } from '../types/indexSchema';

const DB_NAME = 'play_atlas_catalog_db';
const DB_VERSION = 1;
const STORE_NAME = 'game_records';
const LOCAL_STORAGE_MANIFEST_KEY = 'play_atlas_cached_manifest';

/**
 * Open Browser IndexedDB Store
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('firstReleaseDate', 'firstReleaseDate', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save Catalog Records to IndexedDB
 */
export async function saveRecordsToIndexedDB(records: GameIndexRecord[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.clear(); // Clear existing catalog before storing fresh index

    for (const record of records) {
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load Catalog Records from IndexedDB
 */
export async function loadRecordsFromIndexedDB(): Promise<GameIndexRecord[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as GameIndexRecord[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read cached manifest metadata from LocalStorage
 */
export function getCachedManifestMetadata(): IndexManifest | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MANIFEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save manifest metadata to LocalStorage
 */
export function saveManifestMetadataToLocalStorage(manifest: IndexManifest): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_MANIFEST_KEY, JSON.stringify(manifest));
  } catch (err) {
    console.warn('Failed to save manifest metadata to LocalStorage:', err);
  }
}

/**
 * Check Manifest & Sync Catalog with IndexedDB
 * Checks lightweight public/data/game_index_manifest.json before downloading complete index.
 */
export async function syncGameIndexCatalog(): Promise<CompiledGameIndex> {
  const manifestRes = await fetch('./data/game_index_manifest.json');
  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch index manifest: ${manifestRes.statusText}`);
  }
  const publishedManifest: IndexManifest = await manifestRes.json();
  const cachedManifest = getCachedManifestMetadata();

  // If cached manifest matches published manifest, load catalog directly from IndexedDB
  if (
    cachedManifest &&
    cachedManifest.version === publishedManifest.version &&
    cachedManifest.generatedAt === publishedManifest.generatedAt
  ) {
    const cachedRecords = await loadRecordsFromIndexedDB();
    if (cachedRecords.length > 0) {
      return {
        manifest: publishedManifest,
        diagnostics: {
          bucketFilesProcessed: 26,
          bucketEntriesProcessed: publishedManifest.recordCount,
          uniqueGameIdsFound: publishedManifest.recordCount,
          duplicateEntriesRemoved: 0,
          gameRecordsLoaded: cachedRecords.length,
          validReleaseDatesCount: cachedRecords.filter(r => r.firstReleaseDate !== null).length,
          recordsWithoutReleaseDates: cachedRecords.filter(r => r.firstReleaseDate === null).length,
          recordsWithPlatformReleaseDates: cachedRecords.filter(r => r.platformReleaseDates.length > 0).length,
          firstReleaseTodayCount: 0,
          platformReleaseTodayCount: 0,
          diagnosticDate: new Date().toISOString().split('T')[0],
          diagnosticTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          failedRecordRequests: [],
          indexGeneratedAt: publishedManifest.generatedAt,
        },
        records: cachedRecords,
      };
    }
  }

  // Published index is newer or cache missing: download full compiled index
  const indexRes = await fetch('./data/game_index.json');
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch full game index: ${indexRes.statusText}`);
  }

  const compiledIndex: CompiledGameIndex = await indexRes.json();

  // Save complete catalog to IndexedDB and metadata to LocalStorage
  await saveRecordsToIndexedDB(compiledIndex.records);
  saveManifestMetadataToLocalStorage(compiledIndex.manifest);

  return compiledIndex;
}
