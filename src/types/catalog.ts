export interface CompactRankSignals {
  userRating?: number;
  userRatingCount?: number;
  criticRating?: number;
  criticRatingCount?: number;
  totalRating?: number;
  totalRatingCount?: number;
  hypeCount?: number;
  metadataConfidence?: number;
  platformCount?: number;
  externalProductCount?: number;
  websiteCount?: number;
  hasFranchise?: boolean;
  hasCollection?: boolean;
  hasParentGame?: boolean;
  isVersion?: boolean;
}

export interface CompactGameLookupRecord {
  id: number;
  name: string;
  year?: number | null;
  gameType?: string | null;
  defaultVisible?: boolean;
  chunk?: number;
  coverUrl?: string | null;
  rating?: number;
  genres?: string[];
  platforms?: string[];
  developer?: string;
  alternativeNames?: string[];
  rank?: CompactRankSignals;
}
