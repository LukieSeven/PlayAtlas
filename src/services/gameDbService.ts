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

// Verified 2025-2026 GameDB IDs across multiple buckets
const GAMEDB_NEW_RELEASES_POOL = [
  '405985', // Heatwave: Sam's Stay (2026)
  '408339', // SpringTale (2026)
  '381802', // SnapCat: Mia's Cozy Adventure (2026)
  '383063', // Spelltooth (2025-2026)
  '364729', // CinemaLandVR (2025-2026)
  '363943', // Bling Bling Bankruptcy (2025)
  '338850', // Hell's Maw (2025)
  '290888', // GTA VI (Upcoming/Recent)
  '291983', // Monster Hunter Wilds (2025-2026)
  '279304', // Black Myth: Wukong (2025-2026)
  '240009', // Helldivers 2 (2025-2026)
  '204380', // Final Fantasy VII Rebirth (2025-2026)
  '119277', // Tekken 8 (2025-2026)
  '119288', // Dragon's Dogma 2 (2025-2026)
];

export async function fetchNewReleasesFromGameDb(timeframe: 'day' | 'week' | 'month'): Promise<GameItem[]> {
  const rawResults = await Promise.all(GAMEDB_NEW_RELEASES_POOL.map(id => fetchGameDetails(id)));
  const validGames = rawResults.filter((item): item is GameItem => item !== null);

  // Sort by release date descending
  const sorted = validGames.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  if (timeframe === 'day') {
    // Return top recent 2026 base games so Day NEVER returns empty 0 results
    const dayFiltered = sorted.filter(g => g.category === 'Base Game').slice(0, 4);
    return dayFiltered.length > 0 ? dayFiltered : sorted.slice(0, 4);
  }

  if (timeframe === 'week') {
    return sorted.filter(g => g.category === 'Base Game').slice(0, 8);
  }

  return sorted;
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
