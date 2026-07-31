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

export interface GameDbQueryResult {
  games: GameItem[];
  asOfDate: string; // Formatting timestamp like "As of July 30, 2026"
}

/**
 * Dynamic GameDB Live Query Service
 * Queries live GameDB CDN over HTTPS. If today has 0 records, automatically queues
 * the most recent available date's records and returns the exact 'As of X date' timestamp.
 */
export async function fetchDirectGameDbReleases(timeframe: 'day' | 'week' | 'month'): Promise<GameDbQueryResult> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Scan live GameDB buckets alphabetically to discover game IDs
  const prefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'w'];
  const discoveredIds: string[] = [];

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
  const validGames = fetchedGames.filter((item): item is GameItem => item !== null && item.releaseDate !== 'Unknown');

  // Sort by release date descending
  const sorted = validGames.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  if (timeframe === 'day') {
    // Check for games released today
    const todayGames = sorted.filter(game => {
      const gameTime = new Date(game.releaseDate).getTime();
      const diffDays = (now.getTime() - gameTime) / oneDayMs;
      return game.releaseDate === todayStr || (diffDays >= 0 && diffDays <= 1.0);
    });

    if (todayGames.length > 0) {
      return {
        games: todayGames,
        asOfDate: `As of Today (${todayStr})`,
      };
    }

    // If 0 games today, queue the most recent available date from GameDB's live dataset
    const recentDate = sorted[0]?.releaseDate || todayStr;
    const recentGames = sorted.filter(game => game.releaseDate === recentDate || new Date(game.releaseDate) <= now).slice(0, 6);

    return {
      games: recentGames,
      asOfDate: `As of ${recentDate}`,
    };
  }

  if (timeframe === 'week') {
    const weekGames = sorted.filter(game => {
      const gameTime = new Date(game.releaseDate).getTime();
      const diffDays = (now.getTime() - gameTime) / oneDayMs;
      return diffDays >= 0 && diffDays <= 7.0;
    });

    return {
      games: weekGames.length > 0 ? weekGames : sorted.slice(0, 8),
      asOfDate: `As of Last 7 Days`,
    };
  }

  // Month
  const monthGames = sorted.filter(game => {
    const gameTime = new Date(game.releaseDate).getTime();
    const diffDays = (now.getTime() - gameTime) / oneDayMs;
    return diffDays >= 0 && diffDays <= 31.0;
  });

  return {
    games: monthGames.length > 0 ? monthGames : sorted.slice(0, 12),
    asOfDate: `As of Last 31 Days`,
  };
}

export async function fetchUpcomingGames(): Promise<GameItem[]> {
  const res = await fetchDirectGameDbReleases('month');
  return res.games;
}

export async function fetchCuratedGames(): Promise<GameItem[]> {
  const res = await fetchDirectGameDbReleases('month');
  return res.games;
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
