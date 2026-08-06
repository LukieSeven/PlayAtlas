import { CompactGameLookupRecord } from '../types/catalog';
import { TierRank, UserGameList, UserListKind, UserListTier } from '../types/userList';

const STORAGE_KEY = 'playatlas_user_lists_v1';
export const MAX_TIER_ROWS = 12;
export const DEFAULT_TIER_ROWS: UserListTier[] = ['S', 'A', 'B', 'C', 'D', 'F'].map(label => ({ id: label, label }));

export function normalizeUserList(list: UserGameList): UserGameList {
  if (list.kind !== 'tier') return list;
  const tiers = Array.isArray(list.tiers) && list.tiers.length > 0
    ? list.tiers.slice(0, MAX_TIER_ROWS).map(tier => ({ id: String(tier.id), label: String(tier.label || 'Tier').slice(0, 30) }))
    : DEFAULT_TIER_ROWS.map(tier => ({ ...tier }));
  return { ...list, tiers };
}

export function loadUserLists(): UserGameList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeUserList) : [];
  } catch (error) {
    console.warn('Failed to load saved Play Atlas lists:', error);
    return [];
  }
}

export function saveUserLists(lists: UserGameList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function createUserList(name: string, kind: UserListKind): UserGameList {
  const timestamp = new Date().toISOString();
  return {
    id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || (kind === 'tier' ? 'Untitled Tier List' : 'Untitled List'),
    kind,
    entries: [],
    tiers: kind === 'tier' ? DEFAULT_TIER_ROWS.map(tier => ({ ...tier })) : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addGameToUserList(
  list: UserGameList,
  game: CompactGameLookupRecord,
  tier?: TierRank,
): UserGameList {
  const existingIndex = list.entries.findIndex(entry => entry.game.id === game.id);
  if (existingIndex >= 0) {
    if (list.kind !== 'tier' || list.entries[existingIndex].tier === tier) return list;
    return {
      ...list,
      entries: list.entries.map((entry, index) => index === existingIndex ? { ...entry, tier: tier || list.tiers?.[0]?.id || 'S' } : entry),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    ...list,
    entries: [...list.entries, { game, tier: list.kind === 'tier' ? tier || list.tiers?.[0]?.id || 'S' : undefined, addedAt: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  };
}

export function removeGameFromUserList(list: UserGameList, gameId: number): UserGameList {
  return {
    ...list,
    entries: list.entries.filter(entry => entry.game.id !== gameId),
    updatedAt: new Date().toISOString(),
  };
}
