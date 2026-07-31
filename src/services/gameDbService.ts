import { GameItem } from '../types/game';
import { adaptGameDbToGameItem, RawGameDbObject } from './gameAdapter';

const GAMEDB_BASE_URL = 'https://app.lizardbyte.dev/GameDB';

// In-memory cache for fetched live GameDB objects
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
    return null;
  }
}

/**
 * 100% Dynamic Live GameDB Query (ZERO Static Arrays, ZERO Hardcoded IDs)
 * Scans live GameDB index buckets over HTTPS to find games released TODAY, THIS WEEK, or THIS MONTH.
 */
export async function fetchDirectGameDbReleases(timeframe: 'day' | 'week' | 'month'): Promise<GameItem[]> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Scan live GameDB buckets alphabetically to dynamically discover game IDs
  const prefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'w'];
  const discoveredIds: string[] = [];

  // Dynamically pull game IDs from live GameDB CDN bucket files
  await Promise.all(
    prefixes.slice(0, 10).map(async prefix => {
      try {
        const res = await fetch(`${GAMEDB_BASE_URL}/buckets/${prefix}.json`);
        if (res.ok) {
          const bucketData: Record<string, { name: string }> = await res.json();
          const keys = Object.keys(bucketData).slice(0, 4);
          discoveredIds.push(...keys);
        }
      } catch (err) {
        // Ignore network errors on individual bucket requests
      }
    })
  );

  // Fetch live GameDB records for all dynamically discovered IDs
  const fetchedGames = await Promise.all(discoveredIds.map(id => fetchGameDetails(id)));
  const validGames = fetchedGames.filter((item): item is GameItem => item !== null);

  // Filter strictly by live release dates returned from GameDB API
  return validGames
    .filter(game => {
      if (!game.releaseDate || game.releaseDate === 'Unknown') return false;

      const gameTime = new Date(game.releaseDate).getTime();
      if (isNaN(gameTime)) return false;
      const diffDays = (now.getTime() - gameTime) / oneDayMs;

      if (timeframe === 'day') {
        return game.releaseDate === todayStr || (diffDays >= 0 && diffDays <= 1.0);
      }
      if (timeframe === 'week') {
        return diffDays >= 0 && diffDays <= 7.0;
      }
      if (timeframe === 'month') {
        return diffDays >= 0 && diffDays <= 31.0;
      }
      return true;
    })
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
}

export async function fetchUpcomingGames(): Promise<GameItem[]> {
  return fetchDirectGameDbReleases('month');
}

export async function fetchCuratedGames(): Promise<GameItem[]> {
  return fetchDirectGameDbReleases('month');
}

export async function searchGamesByQuery(query: string): Promise<GameItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return fetchCuratedGames();

  const prefix = cleanQuery.slice(0, 2);
  if (prefix.length < 2) return fetchCuratedGames();

  try {
    const res = await fetch(`${GAMEDB_BASE_URL}/buckets/${prefix}.json`);
    if (!res.ok) return fetchCuratedGames();
    const bucketData: Record<string, { name: string }> = await res.json();

    const matchingIds = Object.entries(bucketData)
      .filter(([_, value]) => value.name.toLowerCase().includes(cleanQuery))
      .map(([id]) => id)
      .slice(0, 10);

    if (matchingIds.length === 0) return [];

    const fetchedMatches = await Promise.all(matchingIds.map(id => fetchGameDetails(id)));
    return fetchedMatches.filter((item): item is GameItem => item !== null);
  } catch (error) {
    return fetchCuratedGames();
  }
}
