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
        store.createIndex('defaultVisible', 'defaultVisible', { unique: false });
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
 * Checks IGDB test manifest first (data/igdb_index_manifest.json), falling back to game_index_manifest.json.
 */
export async function syncGameIndexCatalog(): Promise<CompiledGameIndex> {
  const rawBaseUrl = (import.meta as any).env?.BASE_URL || './';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

  // First try IGDB index manifest, fallback to legacy manifest
  let manifestUrl = `${baseUrl}data/igdb_index_manifest.json`;
  let indexUrl = `${baseUrl}data/igdb_index.json`;

  let manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) {
    manifestUrl = `${baseUrl}data/game_index_manifest.json`;
    indexUrl = `${baseUrl}data/game_index.json`;
    manifestRes = await fetch(manifestUrl);
  }

  console.log(`[Diagnostics] Manifest URL requested: ${manifestUrl}`);
  console.log(`[Diagnostics] Manifest response status: ${manifestRes.status} ${manifestRes.statusText}`);

  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch index manifest (${manifestRes.status}): ${manifestRes.statusText}`);
  }

  const publishedManifest: IndexManifest = await manifestRes.json();
  const cachedManifest = getCachedManifestMetadata();
  const cachedRecords = await loadRecordsFromIndexedDB();

  console.log(`[Diagnostics] LocalStorage cached manifest:`, cachedManifest);
  console.log(`[Diagnostics] IndexedDB cached record count: ${cachedRecords.length}`);

  // Invalidate cache if cached record count is zero, manifest differs, or schema version changed
  const isCacheValid =
    cachedManifest !== null &&
    cachedRecords.length > 0 &&
    cachedManifest.source === publishedManifest.source &&
    cachedManifest.version === publishedManifest.version &&
    cachedManifest.schemaVersion === publishedManifest.schemaVersion &&
    cachedManifest.generatedAt === publishedManifest.generatedAt &&
    cachedRecords.length === publishedManifest.recordCount;

  if (isCacheValid) {
    console.log(`[Diagnostics] IndexedDB catalog cache is up-to-date (${cachedRecords.length} records). Loading from IndexedDB without network download.`);
    return {
      manifest: publishedManifest,
      diagnostics: {
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

  // Published index is newer or cache invalid: download full compiled index
  console.log(`[Diagnostics] Downloading fresh full index from URL: ${indexUrl}`);
  const indexRes = await fetch(indexUrl);
  console.log(`[Diagnostics] Index response status: ${indexRes.status} ${indexRes.statusText}`);

  if (!indexRes.ok) {
    throw new Error(`Failed to fetch full game index (${indexRes.status}): ${indexRes.statusText}`);
  }

  const compiledIndex: CompiledGameIndex = await indexRes.json();
  console.log(`[Diagnostics] Downloaded record count: ${compiledIndex.records.length}`);

  // Save complete catalog to IndexedDB and manifest metadata to LocalStorage
  await saveRecordsToIndexedDB(compiledIndex.records);
  saveManifestMetadataToLocalStorage(compiledIndex.manifest);

  const updatedIndexedDBRecords = await loadRecordsFromIndexedDB();
  console.log(`[Diagnostics] Updated IndexedDB record count: ${updatedIndexedDBRecords.length}`);

  return compiledIndex;
}
