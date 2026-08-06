export type CatalogEventSource = 'events_for_gamers' | 'igdb';

export interface CatalogEventLink {
  url: string;
  label?: string;
  networkType?: number;
}

export interface CatalogEventVenue {
  name?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface CatalogEvent {
  id: string;
  sources: CatalogEventSource[];
  sourceIds: Partial<Record<CatalogEventSource, string>>;
  name: string;
  slug?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  timeZone?: string;
  allDay?: boolean;
  categories: string[];
  venue?: CatalogEventVenue;
  logoUrl?: string;
  liveStreamUrl?: string;
  links: CatalogEventLink[];
  gameIds: number[];
}

export interface EventsCatalogManifest {
  schemaVersion: 2;
  generatedAt: string;
  source: 'events_for_gamers+igdb';
  eventCount: number;
  sourceCounts: {
    eventsForGamers: number;
    igdb: number;
    merged: number;
  };
  events: CatalogEvent[];
}
