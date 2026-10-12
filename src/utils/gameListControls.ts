import { CompactGameLookupRecord } from '../types/catalog';
import { getPlatformFamilyForCatalogValue } from '../services/platformTaxonomyService';
import { normalizeGameTypeCategory } from './gameTypeUtils';

export type CatalogSortMode = 'relevance' | 'name' | 'yearAsc' | 'yearDesc' | 'popularity' | 'rating';

export function matchesCatalogPlatformFamily(
  game: CompactGameLookupRecord,
  selectedFamily: string,
  allowUnknown = true,
): boolean {
  if (selectedFamily === 'all') return true;
  // Compact search records receive platform metadata during visible-record
  // hydration. Keep unknown records eligible so the filter cannot prevent the
  // hydration required to determine whether they match.
  if (!game.platforms || game.platforms.length === 0) return allowUnknown;
  return (game.platforms || []).some(
    platform => getPlatformFamilyForCatalogValue(platform) === selectedFamily,
  );
}

export function matchesCatalogFormat(
  game: CompactGameLookupRecord,
  selectedCategory: string,
): boolean {
  if (selectedCategory === 'all') return true;

  const category = normalizeGameTypeCategory(game.gameType || undefined, game.name);
  switch (selectedCategory) {
    case 'main_game':
      return ['main_game', 'remake', 'remaster', 'expanded_game', 'port'].includes(category);
    case 'dlc_addon':
      return category === 'dlc_addon';
    case 'pack':
      return ['pack', 'expansion', 'standalone_expansion', 'bundle'].includes(category);
    case 'mod':
      return category === 'mod' || category === 'community_modification';
    default:
      return category === selectedCategory;
  }
}

export function sortCatalogGames(
  games: CompactGameLookupRecord[],
  sortBy: CatalogSortMode,
): CompactGameLookupRecord[] {
  const list = [...games];
  switch (sortBy) {
    case 'popularity':
      return list.sort((a, b) => (b.catalogImportance ?? 0) - (a.catalogImportance ?? 0) || a.name.localeCompare(b.name));
    case 'rating':
      return list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'yearAsc':
      return list.sort((a, b) => (a.year || Infinity) - (b.year || Infinity) || a.name.localeCompare(b.name));
    case 'yearDesc':
      return list.sort((a, b) => (b.year || -Infinity) - (a.year || -Infinity) || a.name.localeCompare(b.name));
    case 'relevance':
    default:
      return list;
  }
}
