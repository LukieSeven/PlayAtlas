import { GameIndexRecord, IndexManifest } from '../types/indexSchema';

const DB_NAME = 'play_atlas_catalog_db';
const DB_VERSION = 2; // Upgraded to v2 for tiered hybrid catalog storage

const STORE_METADATA = 'catalog_metadata';
const STORE_RELEASE_PARTITIONS = 'release_partitions';
const STORE_SEARCH_BUCKETS = 'search_buckets';
const STORE_FULL_CHUNKS = 'full_chunks';
const STORE_GAME_RECORDS = 'game_records';
const STORE_INSTALLATION_STATE = 'installation_state';

export interface StorageEstimateResult {
  quota: number | null;
  usage: number | null;
  persisted: boolean;
}

export interface InstallationProgress {
  completedChunks: number;
  totalChunks: number;
  recordsInstalled: number;
  totalRecords: number;
  bytesDownloaded: number;
  totalBytes: number;
  isComplete: boolean;
}

/**
 * Open Browser IndexedDB Database with v2 Object Stores & Indexes
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORE_RELEASE_PARTITIONS)) {
        db.createObjectStore(STORE_RELEASE_PARTITIONS, { keyPath: 'year' });
      }

      if (!db.objectStoreNames.contains(STORE_SEARCH_BUCKETS)) {
        db.createObjectStore(STORE_SEARCH_BUCKETS, { keyPath: 'bucketKey' });
      }

      if (!db.objectStoreNames.contains(STORE_FULL_CHUNKS)) {
        db.createObjectStore(STORE_FULL_CHUNKS, { keyPath: 'chunkFile' });
      }

      if (!db.objectStoreNames.contains(STORE_INSTALLATION_STATE)) {
        db.createObjectStore(STORE_INSTALLATION_STATE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORE_GAME_RECORDS)) {
        const store = db.createObjectStore(STORE_GAME_RECORDS, { keyPath: 'id' });
        store.createIndex('sourceId', 'sourceId', { unique: true });
        store.createIndex('firstReleaseDate', 'firstReleaseDate', { unique: false });
        store.createIndex('firstReleaseYear', 'firstReleaseYear', { unique: false });
        store.createIndex('gameType', 'gameType', { unique: false });
        store.createIndex('defaultVisible', 'defaultVisible', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Request Storage Persistence & Estimate
 */
export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  let quota: number | null = null;
  let usage: number | null = null;
  let persisted = false;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || null;
      usage = estimate.usage || null;
    } catch (err) {
      console.warn('Storage estimate failed:', err);
    }
  }

  if (navigator.storage && navigator.storage.persisted) {
    try {
      persisted = await navigator.storage.persisted();
    } catch {
      persisted = false;
    }
  }

  return { quota, usage, persisted };
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Fetch Browser Catalog Manifest
 */
export async function fetchBrowserCatalogManifest(): Promise<any> {
  const rawBaseUrl = (import.meta as any).env?.BASE_URL || './';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

  let manifestUrl = `${baseUrl}data/browser_catalog_manifest.json`;
  let res = await fetch(manifestUrl);

  if (!res.ok) {
    manifestUrl = `${baseUrl}data/igdb_index_manifest.json`;
    res = await fetch(manifestUrl);
  }

  if (!res.ok) {
    manifestUrl = `${baseUrl}data/game_index_manifest.json`;
    res = await fetch(manifestUrl);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch catalog manifest (${res.status}): ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Save records into IndexedDB
 */
export async function saveRecordsToIndexedDB(records: GameIndexRecord[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GAME_RECORDS, 'readwrite');
    const store = tx.objectStore(STORE_GAME_RECORDS);

    for (const record of records) {
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load records from IndexedDB
 */
export async function loadRecordsFromIndexedDB(): Promise<GameIndexRecord[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GAME_RECORDS, 'readonly');
    const store = tx.objectStore(STORE_GAME_RECORDS);
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
    const raw = localStorage.getItem('play_atlas_cached_manifest');
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
    localStorage.setItem('play_atlas_cached_manifest', JSON.stringify(manifest));
  } catch (err) {
    console.warn('Failed to save manifest metadata to LocalStorage:', err);
  }
}

/**
 * Sync catalog for default browsing view (Tier 1 & Tier 2)
 */
export async function syncGameIndexCatalog(): Promise<any> {
  const rawBaseUrl = (import.meta as any).env?.BASE_URL || './';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

  let manifestUrl = `${baseUrl}data/igdb_index_manifest.json`;
  let indexUrl = `${baseUrl}data/igdb_index.json`;

  let manifestRes = await fetch(manifestUrl);
  if (!manifestRes.ok) {
    manifestUrl = `${baseUrl}data/game_index_manifest.json`;
    indexUrl = `${baseUrl}data/game_index.json`;
    manifestRes = await fetch(manifestUrl);
  }

  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch index manifest (${manifestRes.status}): ${manifestRes.statusText}`);
  }

  const publishedManifest: IndexManifest = await manifestRes.json();
  const cachedManifest = getCachedManifestMetadata();
  const cachedRecords = await loadRecordsFromIndexedDB();

  const isCacheValid =
    cachedManifest !== null &&
    cachedRecords.length > 0 &&
    cachedManifest.source === publishedManifest.source &&
    cachedManifest.version === publishedManifest.version &&
    cachedManifest.schemaVersion === publishedManifest.schemaVersion &&
    cachedManifest.generatedAt === publishedManifest.generatedAt &&
    cachedRecords.length === publishedManifest.recordCount;

  if (isCacheValid) {
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

  const indexRes = await fetch(indexUrl);
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch full game index (${indexRes.status}): ${indexRes.statusText}`);
  }

  const compiledIndex: any = await indexRes.json();
  await saveRecordsToIndexedDB(compiledIndex.records);
  saveManifestMetadataToLocalStorage(compiledIndex.manifest);

  return compiledIndex;
}

/**
 * Bulk Full Catalog Installer (Tier 3: Sequential Chunk Downloading with Progress & Resumability)
 */
export async function installFullCatalog(
  onProgress?: (progress: InstallationProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const rawBaseUrl = (import.meta as any).env?.BASE_URL || './';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

  const manifestUrl = `${baseUrl}data/browser_catalog_manifest.json`;
  const res = await fetch(manifestUrl);
  if (!res.ok) {
    throw new Error(`Full catalog manifest unavailable (${res.status}). Cannot install full catalog.`);
  }

  const manifest = await res.json();
  const chunks: any[] = manifest.fullCatalog?.chunks || [];

  if (chunks.length === 0) {
    throw new Error('No full catalog chunks listed in manifest.');
  }

  await requestStoragePersistence();

  const db = await openIndexedDB();
  const completedChunkFiles = new Set<string>();

  // Check already completed chunks from IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FULL_CHUNKS, 'readonly');
    const store = tx.objectStore(STORE_FULL_CHUNKS);
    const req = store.getAll();
    req.onsuccess = () => {
      for (const item of req.result) {
        completedChunkFiles.add(item.chunkFile);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });

  let completedChunks = completedChunkFiles.size;
  let recordsInstalled = 0;
  let bytesDownloaded = 0;
  const totalChunks = chunks.length;
  const totalRecords = manifest.catalogRecordCount || 0;
  const totalBytes = manifest.fullCatalogUncompressedBytes || 0;

  for (let i = 0; i < chunks.length; i++) {
    if (signal && signal.aborted) {
      throw new Error('Full catalog installation cancelled by user.');
    }

    const chunkInfo = chunks[i];
    const chunkRelPath = chunkInfo.file; // e.g. "chunks/game_index_0001.json"

    if (completedChunkFiles.has(chunkRelPath)) {
      recordsInstalled += chunkInfo.recordCount;
      bytesDownloaded += chunkInfo.byteSize;
      continue;
    }

    const chunkUrl = `${baseUrl}data/${chunkRelPath}`;
    const chunkRes = await fetch(chunkUrl);

    if (!chunkRes.ok) {
      throw new Error(`Failed to download chunk ${chunkRelPath} (HTTP ${chunkRes.status})`);
    }

    const chunkRecords: GameIndexRecord[] = await chunkRes.json();
    bytesDownloaded += chunkInfo.byteSize;
    recordsInstalled += chunkRecords.length;

    // Write chunk records & chunk completion state to IndexedDB incrementally
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_GAME_RECORDS, STORE_FULL_CHUNKS], 'readwrite');
      const gameStore = tx.objectStore(STORE_GAME_RECORDS);
      const chunkStore = tx.objectStore(STORE_FULL_CHUNKS);

      for (const record of chunkRecords) {
        gameStore.put(record);
      }

      chunkStore.put({
        chunkFile: chunkRelPath,
        downloadedAt: new Date().toISOString(),
        recordCount: chunkRecords.length,
        byteSize: chunkInfo.byteSize,
        sha256: chunkInfo.sha256,
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    completedChunkFiles.add(chunkRelPath);
    completedChunks = completedChunkFiles.size;

    if (onProgress) {
      onProgress({
        completedChunks,
        totalChunks,
        recordsInstalled,
        totalRecords,
        bytesDownloaded,
        totalBytes,
        isComplete: completedChunks === totalChunks,
      });
    }
  }

  // Mark Installation Complete in IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_INSTALLATION_STATE, 'readwrite');
    const store = tx.objectStore(STORE_INSTALLATION_STATE);
    store.put({
      key: 'full_catalog_installation',
      installedAt: new Date().toISOString(),
      completedChunks: totalChunks,
      totalRecords,
      totalBytes,
      isComplete: true,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove Full Catalog Installation (Retains Tier 1/2 cached data)
 */
export async function removeFullCatalogInstallation(): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FULL_CHUNKS, STORE_INSTALLATION_STATE], 'readwrite');
    tx.objectStore(STORE_FULL_CHUNKS).clear();
    tx.objectStore(STORE_INSTALLATION_STATE).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
