import { CompactGameLookupRecord } from '../types/catalog';
import { GameItem } from '../types/game';
import { GameDetailRecord } from '../types/catalogDetail';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { openIndexedDB } from './indexDbStorage';
import { buildCoverUrl } from '../utils/browserCatalogUtils';
import { resolveCompactRecordByGameId } from './tokenSearchService';
import { personalGameStore, isSyntheticTitle } from './personalGameStore';

export { resolveCompactRecordByGameId };

const inMemoryChunkCache = new Map<string, any[]>();
const hydratedRecordsCache = new Map<number, CompactGameLookupRecord>();

/**
 * Clears in-memory hydration cache (for testing and cache invalidation)
 */
export function clearHydrationCache(): void {
  hydratedRecordsCache.clear();
}

/**
 * Calculates a quality score for a compact game lookup record.
 * Authoritative records (real title, valid chunk, valid cover, metadata) score higher
 * than generic/unresolved fallback records (Game #ID, missing chunk, missing cover).
 */
export function calculateRecordQualityScore(rec: CompactGameLookupRecord): number {
  if (!rec) return -1;
  let score = 0;

  // Real title vs synthetic title (Game #ID / Unknown Game)
  if (!isSyntheticTitle(rec.name)) {
    score += 100;
  }

  // Authoritative chunk present
  if (typeof rec.chunk === 'number' && rec.chunk > 0) {
    score += 50;
  }

  // Valid cover URL vs missing/generic cover
  if (rec.coverUrl && !rec.coverUrl.includes('nocover')) {
    score += 40;
  }

  // Metadata presence
  if (Array.isArray(rec.platforms) && rec.platforms.length > 0) {
    score += 10;
  }

  if (Array.isArray(rec.genres) && rec.genres.length > 0) {
    score += 10;
  }

  if (rec.gameType && rec.gameType !== 'unknown') {
    score += 10;
  }

  if (typeof rec.year === 'number' && rec.year > 0) {
    score += 10;
  }

  return score;
}

/**
 * Returns true if the incoming record has higher or equal quality compared to existing cached record.
 * A lower-quality record (e.g. Game #ID, missing chunk) must NEVER overwrite a better record.
 */
export function isBetterRecord(
  incoming: CompactGameLookupRecord,
  existing?: CompactGameLookupRecord | null
): boolean {
  if (!existing) return true;
  return calculateRecordQualityScore(incoming) > calculateRecordQualityScore(existing);
}

/**
 * Updates shared in-memory hydration cache only if the incoming record is valid and higher quality.
 * Prevents caching failed lookups, unresolved personal fallbacks, or synthetic Game #ID records.
 */
export function updateHydrationCacheIfBetter(record: CompactGameLookupRecord): boolean {
  if (!record || !record.id) return false;

  // Do not cache failed lookups or synthetic records without an authoritative title or chunk
  if (isSyntheticTitle(record.name) || typeof record.chunk !== 'number') {
    return false;
  }

  const existing = hydratedRecordsCache.get(record.id);
  if (isBetterRecord(record, existing)) {
    hydratedRecordsCache.set(record.id, record);
    return true;
  }
  return false;
}

/**
 * Safely extracts a primitive display string from unknown entity representations
 * (handles raw strings, IGDB objects { id, name, abbreviation }, or nulls)
 */
export function normalizeEntityName(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const entity = value as Record<string, unknown>;

    if (typeof entity.abbreviation === 'string' && entity.abbreviation.trim()) {
      return entity.abbreviation.trim();
    }

    if (typeof entity.name === 'string' && entity.name.trim()) {
      return entity.name.trim();
    }
  }

  return fallback;
}

/**
 * Normalizes an array or single item into a unique array of primitive string names
 */
export function normalizeEntityNames(value: unknown): string[] {
  if (!value) return [];

  if (!Array.isArray(value)) {
    const single = normalizeEntityName(value);
    return single ? [single] : [];
  }

  return Array.from(
    new Set(
      value
        .map(item => normalizeEntityName(item))
        .filter((name): name is string => Boolean(name))
    )
  );
}

export function convertIgdbRecordToGameItem(rec: any): GameItem {
  let category: GameItem['category'] = 'Base Game';

  if (rec.gameType === 'dlc_addon' || rec.gameType === 'expansion' || rec.gameType === 'standalone_expansion') {
    category = 'DLC / Expansion';
  } else if (rec.gameType === 'bundle' || rec.gameType === 'pack') {
    category = 'Bundle';
  } else if (rec.gameType === 'remake' || rec.gameType === 'remaster') {
    category = 'Remake';
  } else if (rec.gameType === 'mod') {
    category = 'Mod';
  }

  const platformsList = normalizeEntityNames(rec.platforms);
  const genresList = normalizeEntityNames(rec.genres);

  const developer =
    normalizeEntityName(rec.developer) ||
    normalizeEntityName(rec.developers?.[0]) ||
    normalizeEntityName(
      rec.involvedCompanies?.find((company: any) => company?.developer)?.company
    ) ||
    normalizeEntityName(
      rec.involved_companies?.find((company: any) => company?.developer)?.company
    ) ||
    '';

  const title = normalizeEntityName(rec.name) || normalizeEntityName(rec.title) || 'Untitled Game';
  
  let summary = 'No summary available.';
  if (typeof rec.summary === 'string' && rec.summary.trim()) {
    summary = rec.summary.trim();
  } else if (rec.summary) {
    summary = normalizeEntityName(rec.summary, 'No summary available.');
  }

  let coverUrl = 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.jpg';
  if (typeof rec.coverUrl === 'string' && rec.coverUrl.trim()) {
    coverUrl = rec.coverUrl.trim();
  } else if (rec.cover_image_id || rec.cover?.image_id) {
    const built = buildCoverUrl(rec.cover_image_id || rec.cover?.image_id);
    if (built) coverUrl = built;
  }

  let releaseDate = 'TBD';
  if (typeof rec.firstReleaseDate === 'string' && rec.firstReleaseDate.trim()) {
    releaseDate = rec.firstReleaseDate.trim();
  } else if (typeof rec.releaseDate === 'string' && rec.releaseDate.trim()) {
    releaseDate = rec.releaseDate.trim();
  }

  const gameItem: GameItem = {
    id: String(rec.sourceId || rec.id || 0),
    title,
    coverUrl,
    rating: typeof rec.rating === 'number' && !isNaN(rec.rating) && rec.rating > 0 ? Math.round(rec.rating) : 0,
    releaseDate,
    platforms: platformsList,
    genres: genresList,
    developer,
    summary,
    category,
  };

  return gameItem;
}

/**
 * Maps a raw catalog record to GameDetailRecord schema with compact record fallback
 */
export function mapRawCatalogRecordToGameDetail(
  rawRecord: any,
  compactFallback?: CompactGameLookupRecord
): GameDetailRecord {
  const id = compactFallback?.id || rawRecord?.sourceId || rawRecord?.id || 0;
  const name = normalizeEntityName(rawRecord?.name || rawRecord?.title || compactFallback?.name || 'Untitled Game');

  let coverUrl = compactFallback?.coverUrl;
  if (!coverUrl || coverUrl.includes('nocover')) {
    if (typeof rawRecord?.coverUrl === 'string' && rawRecord.coverUrl.trim()) {
      coverUrl = rawRecord.coverUrl.trim();
    } else if (rawRecord?.cover_image_id || rawRecord?.cover?.image_id) {
      const built = buildCoverUrl(rawRecord.cover_image_id || rawRecord.cover?.image_id);
      if (built) coverUrl = built;
    }
  }

  let releaseYear = compactFallback?.year || undefined;
  if (!releaseYear) {
    const rDate = rawRecord?.firstReleaseDate || rawRecord?.releaseDate;
    if (typeof rDate === 'string' && rDate.length >= 4) {
      const y = parseInt(rDate.slice(0, 4), 10);
      if (!isNaN(y)) releaseYear = y;
    }
  }

  let summary: string | undefined = undefined;
  if (typeof rawRecord?.summary === 'string' && rawRecord.summary.trim()) {
    summary = rawRecord.summary.trim();
  }

  const rating = typeof rawRecord?.rating === 'number' && !isNaN(rawRecord.rating) && rawRecord.rating > 0
    ? Math.round(rawRecord.rating)
    : compactFallback?.rating;

  const platforms = normalizeEntityNames(rawRecord?.platforms);
  const genres = normalizeEntityNames(rawRecord?.genres);

  const developer =
    normalizeEntityName(rawRecord?.developer) ||
    normalizeEntityName(rawRecord?.developers?.[0]) ||
    normalizeEntityName(rawRecord?.involvedCompanies?.find((c: any) => c?.developer)?.company) ||
    compactFallback?.developer;

  const gameType = rawRecord?.gameType || compactFallback?.gameType || 'main_game';

  return {
    id,
    name,
    coverUrl: coverUrl || undefined,
    releaseYear,
    summary,
    rating,
    platforms: platforms.length > 0 ? platforms : compactFallback?.platforms,
    genres: genres.length > 0 ? genres : compactFallback?.genres,
    developer,
    gameType,
  };
}

/**
 * Loads the exact local catalog detail chunk specified by record.chunk without any guessed chunk calculation.
 * Never guesses chunk 1 or uses mathematical fallbacks.
 */
export async function getGameDetailForCompactRecord(
  record: CompactGameLookupRecord,
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<GameDetailRecord | null> {
  if (!record) return null;

  // A missing chunk must remain unresolved. Do not request chunk 1 as a fallback.
  if (typeof record.chunk !== 'number' || record.chunk <= 0) {
    return mapRawCatalogRecordToGameDetail(null, record);
  }

  const chunkFile = `chunks/game_index_${String(record.chunk).padStart(4, '0')}.json.gz`;

  let chunkData: any[] | null = null;
  if (chunkLoader) {
    chunkData = await chunkLoader(chunkFile);
  } else {
    // 1. Check in-memory cache
    if (inMemoryChunkCache.has(chunkFile)) {
      chunkData = inMemoryChunkCache.get(chunkFile)!;
    } else {
      // 2. Check IndexedDB cache
      try {
        const db = await openIndexedDB();
        const cachedObj: any = await new Promise((resolve, reject) => {
          const tx = db.transaction('full_chunks', 'readonly');
          const store = tx.objectStore('full_chunks');
          const req = store.get(chunkFile);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (cachedObj && Array.isArray(cachedObj.records)) {
          chunkData = cachedObj.records;
          inMemoryChunkCache.set(chunkFile, chunkData!);
        }
      } catch {}

      // 3. Network fetch and decompress
      if (!chunkData) {
        try {
          const chunkUrl = getBasePathAwareUrl(`data/${chunkFile}`);
          chunkData = await fetchAndDecompressJson<any[]>(chunkUrl);
          inMemoryChunkCache.set(chunkFile, chunkData);

          try {
            const db = await openIndexedDB();
            const tx = db.transaction('full_chunks', 'readwrite');
            tx.objectStore('full_chunks').put({
              chunkFile,
              downloadedAt: new Date().toISOString(),
              records: chunkData,
            });
          } catch {}
        } catch (err) {
          console.warn(`Failed to load chunk ${chunkFile}:`, err);
        }
      }
    }
  }

  if (chunkData && Array.isArray(chunkData)) {
    const rawMatch = chunkData.find(rec => {
      const recId = rec.sourceId || parseInt(String(rec.id).replace(/\D/g, ''), 10);
      return recId === record.id;
    });

    if (rawMatch) {
      return mapRawCatalogRecordToGameDetail(rawMatch, record);
    }
  }

  // Fallback if record was missing in chunk
  return mapRawCatalogRecordToGameDetail(null, record);
}

/**
 * Accepts ranked compact search results, groups by chunk, downloads each required detail chunk once,
 * extracts full records, and converts them to GameItem while preserving exact search ranking order.
 * Never defaults missing chunks to chunk 1.
 */
export async function fetchGameDetailsForCompactRecords(
  records: CompactGameLookupRecord[],
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<GameItem[]> {
  if (!records || records.length === 0) return [];

  // Group by chunk file path for records with authoritative chunks ONLY
  const chunkToRecordsMap = new Map<string, CompactGameLookupRecord[]>();
  for (const r of records) {
    if (typeof r.chunk !== 'number' || r.chunk <= 0) continue;
    const chunkFile = `chunks/game_index_${String(r.chunk).padStart(4, '0')}.json.gz`;
    if (!chunkToRecordsMap.has(chunkFile)) chunkToRecordsMap.set(chunkFile, []);
    chunkToRecordsMap.get(chunkFile)!.push(r);
  }

  const foundDetailRecordsMap = new Map<number, any>();

  // Fetch each required chunk ONLY ONCE
  await Promise.all(
    Array.from(chunkToRecordsMap.keys()).map(async chunkFile => {
      let chunkData: any[] | null = null;

      if (chunkLoader) {
        chunkData = await chunkLoader(chunkFile);
      } else {
        if (inMemoryChunkCache.has(chunkFile)) {
          chunkData = inMemoryChunkCache.get(chunkFile)!;
        } else {
          try {
            const db = await openIndexedDB();
            const cachedObj: any = await new Promise((resolve, reject) => {
              const tx = db.transaction('full_chunks', 'readonly');
              const store = tx.objectStore('full_chunks');
              const req = store.get(chunkFile);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });

            if (cachedObj && Array.isArray(cachedObj.records)) {
              chunkData = cachedObj.records;
              inMemoryChunkCache.set(chunkFile, chunkData!);
            }
          } catch {}

          if (!chunkData) {
            try {
              const chunkUrl = getBasePathAwareUrl(`data/${chunkFile}`);
              chunkData = await fetchAndDecompressJson<any[]>(chunkUrl);
              inMemoryChunkCache.set(chunkFile, chunkData);

              try {
                const db = await openIndexedDB();
                const tx = db.transaction('full_chunks', 'readwrite');
                tx.objectStore('full_chunks').put({
                  chunkFile,
                  downloadedAt: new Date().toISOString(),
                  records: chunkData,
                });
              } catch {}
            } catch {}
          }
        }
      }

      if (chunkData && Array.isArray(chunkData)) {
        const targetIds = new Set(chunkToRecordsMap.get(chunkFile)!.map(r => r.id));
        for (const rec of chunkData) {
          const id = rec.sourceId || parseInt(String(rec.id).replace(/\D/g, ''), 10);
          if (targetIds.has(id)) {
            foundDetailRecordsMap.set(id, rec);
          }
        }
      }
    })
  );

  // Preserve exact ranking order of original compact records
  const resultGameItems: GameItem[] = [];
  for (const compactRec of records) {
    const rawRec = foundDetailRecordsMap.get(compactRec.id);
    if (rawRec) {
      resultGameItems.push(convertIgdbRecordToGameItem(rawRec));
    } else {
      resultGameItems.push({
        id: String(compactRec.id),
        title: compactRec.name,
        coverUrl: compactRec.coverUrl || 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.jpg',
        rating: compactRec.rating || 0,
        releaseDate: compactRec.year ? String(compactRec.year) : 'TBD',
        platforms: compactRec.platforms || [],
        genres: compactRec.genres || [],
        developer: compactRec.developer || '',
        summary: 'No summary available.',
        category: compactRec.defaultVisible !== false ? 'Base Game' : 'DLC / Expansion',
      });
    }
  }

  return resultGameItems;
}

/**
 * Converts a PersonalGameRecord into a CompactGameLookupRecord for card rendering.
 * Does not invent synthetic catalog metadata (PC, Action, Base Game, chunk, rating, or release year).
 */
export function convertPersonalRecordToCompact(rec: any): CompactGameLookupRecord {
  const numericId = rec.numericId || parseInt(String(rec.gameId).replace(/\D/g, ''), 10) || 0;
  return {
    id: numericId,
    name: rec.catalogSnapshot?.name || (numericId ? `Game #${numericId}` : 'Unknown Game'),
    year: rec.catalogSnapshot?.releaseYear || undefined,
    coverUrl: rec.catalogSnapshot?.coverUrl || undefined,
    platforms: [],
    genres: [],
  };
}

/**
 * Hydrates a displayed batch of compact records with authoritative compact lookup & real catalog detail chunk metadata.
 * Resolves personal records through compact browser catalog lookup by numeric ID.
 * Caches only authoritative records using cache-quality protection.
 */
export async function hydrateCompactRecordsBatch(
  records: CompactGameLookupRecord[],
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<CompactGameLookupRecord[]> {
  if (!records || records.length === 0) return [];

  // Step 1: Pre-resolution pass for personal/unresolved records
  const resolvedRecords: CompactGameLookupRecord[] = await Promise.all(
    records.map(async r => {
      // Check if we already have a high-quality cached authoritative record
      const cached = hydratedRecordsCache.get(r.id);
      if (cached && !isSyntheticTitle(cached.name) && typeof cached.chunk === 'number') {
        return { ...r, ...cached };
      }

      // If record is missing an authoritative chunk or has a synthetic title, resolve through compact catalog
      if (typeof r.chunk !== 'number' || isSyntheticTitle(r.name)) {
        const compactLookup = await resolveCompactRecordByGameId(r.id);
        if (compactLookup) {
          // Safely repair stored catalogSnapshot in PersonalGameStore
          personalGameStore.updateCatalogSnapshot(r.id, {
            name: compactLookup.name,
            coverUrl: compactLookup.coverUrl || undefined,
            releaseYear: compactLookup.year || undefined,
          });
          return { ...r, ...compactLookup };
        }
      }

      return r;
    })
  );

  // Step 2: Determine which records need detail chunk hydration
  const unhydrated = resolvedRecords.filter(r => {
    if (typeof r.chunk !== 'number' || r.chunk <= 0) return false;
    const cached = hydratedRecordsCache.get(r.id);
    if (!cached) return true;
    return !cached.coverUrl || cached.coverUrl.includes('nocover');
  });

  if (unhydrated.length > 0) {
    const details = await fetchGameDetailsForCompactRecords(unhydrated, chunkLoader);
    for (let i = 0; i < unhydrated.length; i++) {
      const orig = unhydrated[i];
      const detail = details[i];

      // Cache ONLY if a matching raw catalog record was actually found in the chunk
      if (detail && (detail.id === String(orig.id) || detail.id === String(orig.id)) && !isSyntheticTitle(detail.title)) {
        const hydrated: CompactGameLookupRecord = {
          ...orig,
          name: !isSyntheticTitle(orig.name) ? orig.name : (detail.title && !isSyntheticTitle(detail.title) ? detail.title : orig.name),
          coverUrl: detail.coverUrl && !detail.coverUrl.includes('nocover') ? detail.coverUrl : orig.coverUrl,
          rating: detail.rating > 0 ? detail.rating : orig.rating,
          genres: detail.genres && detail.genres.length > 0 ? detail.genres : orig.genres,
          platforms: detail.platforms && detail.platforms.length > 0 ? detail.platforms : orig.platforms,
          developer: detail.developer || orig.developer,
        };

        updateHydrationCacheIfBetter(hydrated);
      }
    }
  }

  // Step 3: Return records matching exact caller array order
  return resolvedRecords.map(r => {
    const cached = hydratedRecordsCache.get(r.id);
    return cached && isBetterRecord(cached, r) ? { ...r, ...cached } : r;
  });
}
