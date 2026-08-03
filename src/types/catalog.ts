export interface CompactGameLookupRecord {
  id: number;
  name: string;
  year?: number | null;
  gameType?: string | null;
  defaultVisible?: boolean;
  chunk?: number;
}
