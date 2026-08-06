import { CompactGameLookupRecord } from './catalog';

export type UserListKind = 'regular' | 'tier';
export type TierRank = string;

export interface UserListTier {
  id: string;
  label: string;
}

export interface UserListEntry {
  game: CompactGameLookupRecord;
  tier?: TierRank;
  addedAt: string;
}

export interface UserGameList {
  id: string;
  name: string;
  kind: UserListKind;
  entries: UserListEntry[];
  tiers?: UserListTier[];
  createdAt: string;
  updatedAt: string;
}
