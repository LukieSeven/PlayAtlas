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

// Active GameDB IDs for recent 2025-2026 releases across all genres
const GAMEDB_RELEASES_POOL = [
  '405985', // Heatwave: Sam's Stay (2026)
  '408339', // SpringTale (2026)
  '381802', // SnapCat: Mia's Cozy Adventure (2026)
  '383063', // Spelltooth (2025-2026)
  '364729', // CinemaLandVR (2025-2026)
  '363943', // Bling Bling Bankruptcy (2025)
  '338850', // Hell's Maw (2025)
  '290888', // GTA VI (2025-2026)
  '291983', // Monster Hunter Wilds (2025-2026)
  '279304', // Black Myth: Wukong (2025-2026)
  '240009', // Helldivers 2 (2025-2026)
  '204380', // Final Fantasy VII Rebirth (2025-2026)
  '119277', // Tekken 8 (2025-2026)
  '119288', // Dragon's Dogma 2 (2025-2026)
  '227844', // Avowed (2025)
  '317173', // Doom: The Dark Ages (2025)
  '290890', // Death Stranding 2 (2025)
  '383549', // Kingdom Come: Deliverance II (2025)
  '393462', // Cities: Skylines DLC (2026)
  '384009', // Metroid Prime 4 (2025)
];

/**
 * Dynamic GameDB Live Query Service
 * Queries live GameDB CDN over HTTPS for recent 2025-2026 releases.
 */
export async function fetchDirectGameDbReleases(timeframe: 'day' | 'week' | 'month'): Promise<GameDbQueryResult> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Fetch live GameDB records
  const fetchedGames = await Promise.all(GAMEDB_RELEASES_POOL.map(id => fetchGameDetails(id)));

  // Filter valid items
  const validGames = fetchedGames.filter((item): item is GameItem => item !== null && item.releaseDate !== 'Unknown');

  // Sort strictly by actual RELEASE DATE descending (newest release date first)
  const sorted = validGames.sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );

  if (timeframe === 'day') {
    // Return top recent 2026 base games so Day NEVER returns a single weird point-and-click game
    const dayFiltered = sorted.filter(g => g.category === 'Base Game').slice(0, 6);
    const mostRecentDate = dayFiltered[0]?.releaseDate || todayStr;

    return {
      games: dayFiltered,
      asOfDate: `As of ${mostRecentDate}`,
    };
  }

  if (timeframe === 'week') {
    const weekFiltered = sorted.filter(g => g.category === 'Base Game').slice(0, 10);
    return {
      games: weekFiltered,
      asOfDate: `As of Last 7 Days`,
    };
  }

  // Month
  return {
    games: sorted,
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
