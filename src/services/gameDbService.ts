import { GameItem } from '../types/game';
import { adaptGameDbToGameItem, RawGameDbObject } from './gameAdapter';

const GAMEDB_BASE_URL = 'https://app.lizardbyte.dev/GameDB';

// Cache in memory to avoid duplicate network fetches
const gameCache = new Map<string, GameItem>();

export async function fetchGameDetails(gameId: string): Promise<GameItem | null> {
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }

  try {
    const res = await fetch(`${GAMEDB_BASE_URL}/games/${gameId}.json`);
    if (!res.ok) return null;
    const data: RawGameDbObject = await res.json();
    const item = adaptGameDbToGameItem(data);
    gameCache.set(gameId, item);
    return item;
  } catch (error) {
    console.warn(`Failed to fetch GameDB game ID ${gameId}:`, error);
    return null;
  }
}

// Popular IGDB Game IDs in GameDB
const FEATURED_GAME_IDS = [
  '119133', // Elden Ring
  '119280', // Baldur's Gate 3
  '19566',  // Cyberpunk 2077
  '138545', // It Takes Two
  '204380', // Final Fantasy VII Rebirth
  '119277', // Zelda: Tears of the Kingdom
  '119288', // God of War Ragnarök
  '227844', // Hades II
];

export async function fetchCuratedGames(): Promise<GameItem[]> {
  const results = await Promise.all(FEATURED_GAME_IDS.map(id => fetchGameDetails(id)));
  return results.filter((item): item is GameItem => item !== null);
}

export async function searchGamesByQuery(query: string): Promise<GameItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return fetchCuratedGames();
  }

  // Get 2-character bucket prefix
  const prefix = cleanQuery.slice(0, 2);
  if (prefix.length < 2) {
    return fetchCuratedGames();
  }

  try {
    const res = await fetch(`${GAMEDB_BASE_URL}/buckets/${prefix}.json`);
    if (!res.ok) {
      return fetchCuratedGames();
    }
    const bucketData: Record<string, { name: string }> = await res.json();

    // Match game IDs by title substring
    const matchingIds = Object.entries(bucketData)
      .filter(([_, value]) => value.name.toLowerCase().includes(cleanQuery))
      .map(([id]) => id)
      .slice(0, 8); // Top 8 matches

    if (matchingIds.length === 0) {
      return [];
    }

    const fetchedMatches = await Promise.all(matchingIds.map(id => fetchGameDetails(id)));
    return fetchedMatches.filter((item): item is GameItem => item !== null);
  } catch (error) {
    console.warn(`Failed bucket search for prefix "${prefix}":`, error);
    return fetchCuratedGames();
  }
}
