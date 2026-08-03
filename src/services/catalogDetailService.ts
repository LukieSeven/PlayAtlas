import { CompactGameLookupRecord } from '../types/catalog';
import { GameItem } from '../types/game';
import { GameDetailRecord } from '../types/catalogDetail';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { openIndexedDB } from './indexDbStorage';
import { buildCoverUrl } from '../utils/browserCatalogUtils';

const inMemoryChunkCache = new Map<string, any[]>();

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
    platforms: platformsList.length > 0 ? platformsList : ['PC'],
    genres: genresList.length > 0 ? genresList : ['Action'],
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
 */
export async function getGameDetailForCompactRecord(
  record: CompactGameLookupRecord,
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<GameDetailRecord | null> {
  if (!record) return null;

  // Use record.chunk directly if available
  const chunkNumber = record.chunk !== undefined && record.chunk !== null ? record.chunk : 1;
  const chunkFile = `chunks/game_index_${String(chunkNumber).padStart(4, '0')}.json.gz`;

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
 */
export async function fetchGameDetailsForCompactRecords(
  records: CompactGameLookupRecord[],
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<GameItem[]> {
  if (!records || records.length === 0) return [];

  // Group by chunk file path
  const chunkToRecordsMap = new Map<string, CompactGameLookupRecord[]>();
  for (const r of records) {
    const chunkFile = `chunks/game_index_${String(r.chunk || 1).padStart(4, '0')}.json.gz`;
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
        platforms: compactRec.platforms || ['PC'],
        genres: compactRec.genres || ['Action'],
        developer: compactRec.developer || '',
        summary: 'No summary available.',
        category: compactRec.defaultVisible !== false ? 'Base Game' : 'DLC / Expansion',
      });
    }
  }

  return resultGameItems;
}

const hydratedRecordsCache = new Map<number, CompactGameLookupRecord>();

/**
 * Hydrates a displayed batch (e.g., 20–40 games) of compact records with real cover art,
 * genres, platforms, rating, and developer from local catalog detail chunks while preserving exact array ordering.
 */
export async function hydrateCompactRecordsBatch(
  records: CompactGameLookupRecord[],
  chunkLoader?: (chunkFile: string) => Promise<any[]>
): Promise<CompactGameLookupRecord[]> {
  if (!records || records.length === 0) return [];

  const unhydrated = records.filter(r => !hydratedRecordsCache.has(r.id));

  if (unhydrated.length > 0) {
    const details = await fetchGameDetailsForCompactRecords(unhydrated, chunkLoader);
    for (let i = 0; i < unhydrated.length; i++) {
      const orig = unhydrated[i];
      const detail = details[i];
      if (detail) {
        const hydrated: CompactGameLookupRecord = {
          ...orig,
          coverUrl: detail.coverUrl && detail.coverUrl !== 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.jpg' ? detail.coverUrl : orig.coverUrl,
          rating: detail.rating > 0 ? detail.rating : orig.rating,
          genres: detail.genres && detail.genres.length > 0 ? detail.genres : orig.genres,
          platforms: detail.platforms && detail.platforms.length > 0 ? detail.platforms : orig.platforms,
          developer: detail.developer || orig.developer,
        };
        hydratedRecordsCache.set(orig.id, hydrated);
      }
    }
  }

  return records.map(r => hydratedRecordsCache.get(r.id) || r);
}
