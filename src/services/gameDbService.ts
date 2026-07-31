import { GameItem } from '../types/game';
import { adaptGameDbToGameItem, RawGameDbObject } from './gameAdapter';

const GAMEDB_BASE_URL = 'https://app.lizardbyte.dev/GameDB';

// In-memory cache to prevent duplicate fetches
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

// Active GameDB game IDs across different buckets
const GAMEDB_DISCOVERY_POOL = [
  '119133', '119280', '19566', '138545', '204380', '119277', '119288', '227844',
  '279304', '291983', '290888', '240009', '317173', '290890', '383549', '393462',
  '384009', '361013', '383063', '363943', '381802', '352467', '338850', '405985',
  '389145', '366392', '332005', '248914', '181313', '204381'
];

export async function fetchNewReleasesFromGameDb(timeframe: 'day' | 'week' | 'month'): Promise<GameItem[]> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // Current date yyyy-MM-dd
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Fetch items from GameDB discovery pool
  const rawResults = await Promise.all(GAMEDB_DISCOVERY_POOL.map(id => fetchGameDetails(id)));
  const validGames = rawResults.filter((item): item is GameItem => item !== null);

  return validGames.filter(game => {
    if (!game.releaseDate) return false;

    const gameTime = new Date(game.releaseDate).getTime();
    if (isNaN(gameTime)) return false;
    const diffDays = (now.getTime() - gameTime) / oneDayMs;

    if (timeframe === 'day') {
      return game.releaseDate === todayStr || (diffDays >= 0 && diffDays <= 1.2);
    }
    if (timeframe === 'week') {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (timeframe === 'month') {
      return diffDays >= 0 && diffDays <= 31;
    }
    return true;
  }).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
}

export async function fetchUpcomingGames(): Promise<GameItem[]> {
  const upcomingIds = ['119171', '119253', '290890', '317173', '227843', '227845'];
  const results = await Promise.all(upcomingIds.map(id => fetchGameDetails(id)));
  return results.filter((item): item is GameItem => item !== null);
}

export async function fetchCuratedGames(): Promise<GameItem[]> {
  return fetchNewReleasesFromGameDb('month');
}

export async function searchGamesByQuery(query: string): Promise<GameItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return fetchCuratedGames();
  }

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

    const matchingIds = Object.entries(bucketData)
      .filter(([_, value]) => value.name.toLowerCase().includes(cleanQuery))
      .map(([id]) => id)
      .slice(0, 10);

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
