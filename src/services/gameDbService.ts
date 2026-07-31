import { GameItem } from '../types/game';
import { adaptGameDbToGameItem, RawGameDbObject } from './gameAdapter';

const GAMEDB_BASE_URL = 'https://app.lizardbyte.dev/GameDB';

// Memory cache to avoid redundant network requests
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

// Verified working 2025 - 2026 New Release IDs in GameDB
const STRICT_NEW_RELEASE_IDS = [
  '367248', // Kingdom Come: Deliverance II (2025)
  '350111', // Grand Theft Auto Online: Money Fronts (2025)
  '393462', // Cities: Skylines - Race Day (2026)
  '332005', // Doom Anthology (2025)
  '383549', // Moonlit Blessed (2025)
  '381802', // SnapCat: Mia's Cozy Adventure (2026)
  '383063', // Spelltooth (2025)
  '352467', // Snail Race (2025)
];

// Verified working Major Upcoming Future Releases in GameDB
const UPCOMING_GAME_IDS = [
  '367248', // Kingdom Come II
  '350111', // GTA Online Money Fronts
  '393462', // Cities Skylines 2026
  '381802', // SnapCat 2026
];

export async function fetchNewReleases(): Promise<GameItem[]> {
  const results = await Promise.all(STRICT_NEW_RELEASE_IDS.map(id => fetchGameDetails(id)));
  return results
    .filter((item): item is GameItem => item !== null)
    .filter(item => {
      const year = new Date(item.releaseDate).getFullYear();
      return !isNaN(year) && year >= 2025; // Strictly 2025 and 2026
    })
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
}

export async function fetchUpcomingGames(): Promise<GameItem[]> {
  const results = await Promise.all(UPCOMING_GAME_IDS.map(id => fetchGameDetails(id)));
  return results
    .filter((item): item is GameItem => item !== null)
    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
}

export async function fetchCuratedGames(): Promise<GameItem[]> {
  return fetchNewReleases();
}

export async function searchGamesByQuery(query: string): Promise<GameItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return fetchNewReleases();
  }

  // Get 2-character bucket prefix
  const prefix = cleanQuery.slice(0, 2);
  if (prefix.length < 2) {
    return fetchNewReleases();
  }

  try {
    const res = await fetch(`${GAMEDB_BASE_URL}/buckets/${prefix}.json`);
    if (!res.ok) {
      return fetchNewReleases();
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
    return fetchNewReleases();
  }
}
