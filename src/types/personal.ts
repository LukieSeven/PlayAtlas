export interface PersistedEntity {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type PlatformFamilyKey =
  | 'pc'
  | 'playstation'
  | 'xbox'
  | 'nintendo'
  | 'mobile'
  | 'vr'
  | 'handheld'
  | 'arcade'
  | 'legacy';

export type OwnershipType =
  | 'physical'
  | 'digital'
  | 'subscription'
  | 'borrowed'
  | 'previously_owned';

export type PhysicalCondition =
  | 'sealed'
  | 'complete_in_box'
  | 'loose'
  | 'damaged';

export interface GameOwnership {
  platformId: number;
  ownershipType: OwnershipType;
  condition?: PhysicalCondition;
  storefrontOrProvider?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
}

export type PlayStatus =
  | 'unplayed'
  | 'playing'
  | 'completed'
  | 'dropped';

export type InterestStatus =
  | 'wanted'
  | 'wishlist'
  | 'not_interested'
  | 'avoid';

export interface PlaySessionRecord {
  sessionId: string;
  startDate: string;
  endDate?: string;
  platformId?: number;
  notes?: string;
}

export interface CompletionRecord {
  completionId: string;
  completedDate: string;
  platformId?: number;
  completionType:
    | 'main_story'
    | 'main_plus_extra'
    | 'completionist_100'
    | 'speedrun';
  playtimeHours?: number;
  personalRating?: number;
  reviewNotes?: string;
}

export interface PersonalGameRecord extends PersistedEntity {
  gameId: string; // e.g. "igdb_1234" or "1234"
  numericId: number;

  ownerships: GameOwnership[];

  currentPlayStatus?: PlayStatus;
  interestStatus?: InterestStatus;

  userRating?: number;
  userNotes?: string;
  customTags: string[];
  preferredPlatformId?: number;

  playSessions: PlaySessionRecord[];
  completionHistory: CompletionRecord[];

  inBacklogQueue: boolean;
  backlogPriority?: number;

  catalogSnapshot?: {
    name: string;
    coverUrl?: string;
    releaseYear?: number;
  };
}
