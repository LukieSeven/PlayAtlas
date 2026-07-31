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
  asOfDate: string;
}

/**
 * GameDB Live Query Service
 * Strictly filters by actual RELEASE DATE (not when the record was created in GameDB).
 * Games released in older years (e.g., 2023, 2021, 2018) are strictly excluded from New Releases.
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
        // Ignore network errors
      }
    })
  );

  // Fetch live GameDB records
  const fetchedGames = await Promise.all(discoveredIds.map(id => fetchGameDetails(id)));

  // Filter out invalid dates, future unreleased dates, or historical old games
  const validGames = fetchedGames.filter((item): item is GameItem => {
    if (!item || !item.releaseDate || item.releaseDate === 'Unknown') return false;
    const year = parseInt(item.releaseDate.split('-')[0], 10);
    // Strictly require release year to be recent (2025 or 2026)
    return !isNaN(year) && year >= 2025;
  });

  // Sort strictly by actual RELEASE DATE descending (newest release date first)
  const sortedByReleaseDate = validGames.sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );

  if (timeframe === 'day') {
    const todayGames = sortedByReleaseDate.filter(game => {
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

    // Queue the most recent actual RELEASE DATE from recent years
    const mostRecentDate = sortedByReleaseDate[0]?.releaseDate || todayStr;
    const mostRecentGames = sortedByReleaseDate.filter(game => game.releaseDate === mostRecentDate).slice(0, 6);

    return {
      games: mostRecentGames.length > 0 ? mostRecentGames : sortedByReleaseDate.slice(0, 4),
      asOfDate: `Most Recent Release Date: ${mostRecentDate}`,
    };
  }

  if (timeframe === 'week') {
    const weekGames = sortedByReleaseDate.filter(game => {
      const gameTime = new Date(game.releaseDate).getTime();
      const diffDays = (now.getTime() - gameTime) / oneDayMs;
      return diffDays >= 0 && diffDays <= 7.0;
    });

    return {
      games: weekGames.length > 0 ? weekGames : sortedByReleaseDate.slice(0, 8),
      asOfDate: `As of Last 7 Days`,
    };
  }

  // Month
  const monthGames = sortedByReleaseDate.filter(game => {
    const gameTime = new Date(game.releaseDate).getTime();
    const diffDays = (now.getTime() - gameTime) / oneDayMs;
    return diffDays >= 0 && diffDays <= 31.0;
  });

  return {
    games: monthGames.length > 0 ? monthGames : sortedByReleaseDate.slice(0, 12),
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
