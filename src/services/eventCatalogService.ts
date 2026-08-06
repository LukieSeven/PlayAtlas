import { getBasePathAwareUrl } from './catalogDataSource';
import type { CatalogEvent, EventsCatalogManifest } from '../types/events';

interface LegacyCatalogEvent extends Omit<CatalogEvent, 'id' | 'sources' | 'sourceIds' | 'categories'> {
  id: number;
}

interface LegacyEventsCatalogManifest {
  schemaVersion: 1;
  events: LegacyCatalogEvent[];
}

let cachedEvents: CatalogEvent[] | null = null;

export const getEventDetailPath = (eventId: string): string => `/events/${encodeURIComponent(eventId)}`;

export async function getEventsCatalog(): Promise<CatalogEvent[]> {
  if (cachedEvents) return cachedEvents;
  const url = getBasePathAwareUrl('data/events/events.json');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load events catalog: HTTP ${response.status}`);
  const manifest = await response.json() as EventsCatalogManifest | LegacyEventsCatalogManifest;
  if (![1, 2].includes(manifest.schemaVersion) || !Array.isArray(manifest.events)) {
    throw new Error('Events catalog uses an unsupported schema.');
  }
  const normalizedEvents: CatalogEvent[] = manifest.schemaVersion === 1
    ? manifest.events.map(event => ({
        ...event,
        id: `igdb:${event.id}`,
        sources: ['igdb'],
        sourceIds: { igdb: String(event.id) },
        categories: [],
      }))
    : manifest.events;
  cachedEvents = normalizedEvents
    .filter(event => typeof event.id === 'string' && event.id && event.name && event.startTime)
    .sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id));
  return cachedEvents;
}

export function eventsWithinRange(events: CatalogEvent[], start: Date, end: Date): CatalogEvent[] {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return events.filter(event => {
    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = event.endTime ? new Date(event.endTime).getTime() : eventStart;
    return Number.isFinite(eventStart) && eventEnd >= startTime && eventStart <= endTime;
  });
}

export function getEventsForMonth(events: CatalogEvent[], year: number, month: number): CatalogEvent[] {
  return eventsWithinRange(events, new Date(year, month - 1, 1), new Date(year, month, 1, 0, 0, 0, -1));
}
