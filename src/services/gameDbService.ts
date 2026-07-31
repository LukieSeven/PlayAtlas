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

// Strictly Verified 2025 - 2026 Recent Releases (No old ports/re-releases)
const STRICT_NEW_RELEASE_IDS = [
  '279304', // Monster Hunter Wilds (Feb 2025)
  '291983', // Sid Meier's Civilization VII (Feb 2025)
  '290888', // Kingdom Come: Deliverance II (Feb 2025)
  '136005', // Avowed (Feb 2025)
  '204382', // Assassin's Creed Shadows (Mar 2025)
  '291980', // Atomfall (Mar 2025)
  '317172', // Split Fiction (2025)
  '248914', // Helldivers 2 (Late 2024/2025)
];

// Strictly Major Upcoming Future Releases IGDB IDs
const UPCOMING_GAME_IDS = [
  '119171', // Grand Theft Auto VI (2026)
  '119253', // Metroid Prime 4: Beyond (2025/2026)
  '290890', // Doom: The Dark Ages (2025)
  '317173', // Ghost of Yōtei (2025)
  '227843', // Death Stranding 2: On the Beach (2025)
  '227845', // Judas (2025)
];

export async function fetchNewReleases(): Promise<GameItem[]> {
  const results = await Promise.all(STRICT_NEW_RELEASE_IDS.map(id => fetchGameDetails(id)));
  return results
    .filter((item): item is GameItem => item !== null)
    .filter(item => {
      const year = new Date(item.releaseDate).getFullYear();
      return !isNaN(year) && year >= 2025; // Strictly 2025 and 2026 releases
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
