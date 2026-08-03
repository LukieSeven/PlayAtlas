export interface GameDetailRecord {
  id: number;
  name: string;
  coverUrl?: string;
  releaseYear?: number;
  summary?: string;
  rating?: number;
  platforms?: string[];
  genres?: string[];
  developer?: string;
  gameType?: string;
}
