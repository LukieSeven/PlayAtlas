import { CompactGameLookupRecord } from '../../scripts/build-browser-catalog';
import { GameItem } from '../types/game';
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
    'Unknown Developer';

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
    id: String(rec.sourceId || rec.id || Math.random().toString(36).slice(2)),
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

  // Runtime assertion before returning GameItem
  if (
    typeof gameItem.title !== 'string' ||
    typeof gameItem.developer !== 'string' ||
    typeof gameItem.summary !== 'string' ||
    typeof gameItem.coverUrl !== 'string' ||
    typeof gameItem.releaseDate !== 'string' ||
    !gameItem.genres.every(item => typeof item === 'string') ||
    !gameItem.platforms.every(item => typeof item === 'string')
  ) {
    throw new Error(`Data Conversion Error: Non-primitive display object detected in converted GameItem for record ID ${gameItem.id}`);
  }

  return gameItem;
}

export async function getGameDetail(gameId: number): Promise<any | null> {
  const items = await fetchGameDetailsForCompactRecords([{
    id: gameId,
    name: '',
    year: 0,
    gameType: 'main_game',
    defaultVisible: true,
    chunk: Math.floor(gameId % 20) + 1,
  }]);

  return items.length > 0 ? items[0] : null;
}

/**
 * Accepts ranked compact search results, groups by chunk, downloads each required detail chunk once,
 * extracts full records, and converts them to GameItem while preserving exact search ranking order.
 */
export async function fetchGameDetailsForCompactRecords(
  records: CompactGameLookupRecord[]
): Promise<GameItem[]> {
  if (!records || records.length === 0) return [];

  // Group by chunk file path
  const chunkToRecordsMap = new Map<string, CompactGameLookupRecord[]>();
  for (const r of records) {
    const chunkFile = `chunks/game_index_${String(r.chunk).padStart(4, '0')}.json.gz`;
    if (!chunkToRecordsMap.has(chunkFile)) chunkToRecordsMap.set(chunkFile, []);
    chunkToRecordsMap.get(chunkFile)!.push(r);
  }

  const foundDetailRecordsMap = new Map<number, any>();

  // Fetch each required chunk ONLY ONCE
  await Promise.all(
    Array.from(chunkToRecordsMap.keys()).map(async chunkFile => {
      let chunkData: any[] | null = null;

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
        } catch {
          // Fallback to network
        }

        // 3. Network fetch and decompress
        if (!chunkData) {
          const chunkUrl = getBasePathAwareUrl(`data/${chunkFile}`);
          chunkData = await fetchAndDecompressJson<any[]>(chunkUrl);
          inMemoryChunkCache.set(chunkFile, chunkData);

          // Cache in IndexedDB asynchronously
          try {
            const db = await openIndexedDB();
            const tx = db.transaction('full_chunks', 'readwrite');
            tx.objectStore('full_chunks').put({
              chunkFile,
              downloadedAt: new Date().toISOString(),
              records: chunkData,
            });
          } catch {
            // Non-critical cache write error
          }
        }
      }

      // Map requested records in this chunk
      const targetIds = new Set(chunkToRecordsMap.get(chunkFile)!.map(r => r.id));
      for (const rec of chunkData) {
        const id = rec.sourceId || parseInt(String(rec.id).replace(/\D/g, ''), 10);
        if (targetIds.has(id)) {
          foundDetailRecordsMap.set(id, rec);
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
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.jpg',
        rating: 0,
        releaseDate: compactRec.year ? String(compactRec.year) : 'TBD',
        platforms: ['PC'],
        genres: ['Action'],
        developer: 'Unknown Developer',
        summary: 'No summary available.',
        category: compactRec.defaultVisible ? 'Base Game' : 'DLC / Expansion',
      });
    }
  }

  return resultGameItems;
}
