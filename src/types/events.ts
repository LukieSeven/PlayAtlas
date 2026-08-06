export interface CatalogEventLink {
  url: string;
  networkType?: number;
}

export interface CatalogEvent {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  timeZone?: string;
  logoUrl?: string;
  liveStreamUrl?: string;
  links: CatalogEventLink[];
  gameIds: number[];
}

export interface EventsCatalogManifest {
  schemaVersion: 1;
  generatedAt: string;
  source: 'igdb';
  eventCount: number;
  events: CatalogEvent[];
}
