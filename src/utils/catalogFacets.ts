import type { CompactGameLookupRecord } from '../types/catalog';
import type { PersonalGameRecord } from '../types/personal';
import { normalizeSearchQuery } from './browserCatalogUtils';

export interface GameFilters { genre: string; platform: string; developer: string; publisher: string; franchise: string; gameType: string; ownership: string }
export const emptyGameFilters: GameFilters = { genre: '', platform: '', developer: '', publisher: '', franchise: '', gameType: '', ownership: '' };
export const hasGameFilters = (filters: GameFilters) => Object.values(filters).some(Boolean);

export function matchesGameFilters(game: CompactGameLookupRecord, filters: GameFilters, personal?: PersonalGameRecord): boolean {
  const includes = (values: string[] | undefined, query: string) => !query || (values ?? []).some(value => normalizeSearchQuery(value).includes(normalizeSearchQuery(query)));
  if (!includes(game.genres, filters.genre) || !includes(game.platforms, filters.platform)
    || !includes(game.developers ?? (game.developer ? [game.developer] : []), filters.developer)
    || !includes(game.publishers, filters.publisher) || !includes(game.franchises, filters.franchise)) return false;
  if (filters.gameType && game.gameType !== filters.gameType) return false;
  const ownerships = personal?.ownerships ?? [];
  if (filters.ownership === 'owned' && !ownerships.length) return false;
  if (filters.ownership === 'unowned' && ownerships.length) return false;
  if (filters.ownership && !['owned', 'unowned'].includes(filters.ownership)
    && !ownerships.some(ownership => ownership.ownershipType === filters.ownership)) return false;
  return true;
}

export function matchesCatalogQuery(game: CompactGameLookupRecord, query: string): boolean {
  const tokens = normalizeSearchQuery(query).split(' ').filter(Boolean);
  return [game.name, ...(game.alternativeNames ?? [])].some(title => {
    const normalized = normalizeSearchQuery(title);
    return tokens.every(token => normalized.includes(token));
  });
}
