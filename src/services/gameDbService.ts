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

// Live GameDB ID Pool to inspect
const GAMEDB_INSPECT_POOL = [
  '405985', '408339', '381802', '383063', '364729', '363943', '338850', '290888',
  '291983', '279304', '240009', '204380', '119277', '119288', '227844', '317173',
  '290890', '383549', '393462', '384009'
];

/**
 * Strict Date Filter Engine
 * DAY: Strictly games released on 07/31/2026 OR 07/30/2026. NOTHING ELSE.
 * WEEK: Strictly games released in last 7 days (07/24/2026 to 07/31/2026). NOTHING ELSE.
 * MONTH: Strictly games released in last 31 days (07/01/2026 to 07/31/2026). NOTHING ELSE.
 */
export async function fetchDirectGameDbReleases(timeframe: 'day' | 'week' | 'month'): Promise<GameDbQueryResult> {
  const todayStr = '2026-07-31';
  const yesterdayStr = '2026-07-30';

  // Fetch live GameDB records
  const fetchedGames = await Promise.all(GAMEDB_INSPECT_POOL.map(id => fetchGameDetails(id)));
  const validGames = fetchedGames.filter((item): item is GameItem => item !== null && item.releaseDate !== 'Unknown');

  if (timeframe === 'day') {
    // STRICT FILTER: MUST BE 07/31/2026 OR 07/30/2026. If not 07/30/26 or 07/31/26 -> NOT SHOWN.
    const dayFiltered = validGames.filter(g => g.releaseDate === todayStr || g.releaseDate === yesterdayStr);

    const hasToday = dayFiltered.some(g => g.releaseDate === todayStr);
    return {
      games: dayFiltered,
      asOfDate: hasToday ? `Released Today (${todayStr})` : `Released Yesterday (${yesterdayStr})`,
    };
  }

  if (timeframe === 'week') {
    // STRICT FILTER: MUST BE 07/24/2026 TO 07/31/2026. NOTHING ELSE.
    const weekFiltered = validGames.filter(g => g.releaseDate >= '2026-07-24' && g.releaseDate <= '2026-07-31');

    return {
      games: weekFiltered,
      asOfDate: `Released This Week (07/24/26 - 07/31/26)`,
    };
  }

  // MONTH: STRICT FILTER: MUST BE 07/01/2026 TO 07/31/2026. NOTHING ELSE.
  const monthFiltered = validGames.filter(g => g.releaseDate >= '2026-07-01' && g.releaseDate <= '2026-07-31');

  return {
    games: monthFiltered,
    asOfDate: `Released This Month (07/01/26 - 07/31/26)`,
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
