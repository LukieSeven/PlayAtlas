import { CompactGameLookupRecord } from '../../scripts/build-browser-catalog';
import { GameItem } from '../types/game';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { openIndexedDB } from './indexDbStorage';

const inMemoryChunkCache = new Map<string, any[]>();

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

  const platformsList = Array.isArray(rec.platforms)
    ? rec.platforms.map((p: any) => p.abbreviation || p.name || 'Platform')
    : [];

  const genresList = Array.isArray(rec.genres) ? rec.genres : [];

  return {
    id: String(rec.sourceId || rec.id),
    title: rec.name,
    coverUrl: rec.coverUrl || 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.jpg',
    rating: rec.rating ? Math.round(rec.rating) : 85,
    releaseDate: rec.firstReleaseDate || 'TBD',
    platforms: platformsList.length > 0 ? platformsList : ['PC'],
    genres: genresList.length > 0 ? genresList : ['Action'],
    developer: rec.developer || 'Unknown Developer',
    summary: rec.summary || 'No summary available.',
    category,
  };
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
        rating: 85,
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
