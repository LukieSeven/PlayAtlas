import { mergeEventSources, normalizeEventsForGamersEvent, normalizeEventsForGamersIcs, normalizeIgdbEvent } from '../scripts/build-igdb-events';
import { eventsWithinRange, getEventDetailPath, getEventsForMonth } from '../src/services/eventCatalogService';
import fs from 'node:fs';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, name: string) => { if (condition) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } };

console.log('Running Merged Events Catalog Tests...');
const igdbEvent = normalizeIgdbEvent({
  id: 42, name: 'Atlas Showcase 2026', slug: 'atlas-showcase', description: 'New games',
  start_time: 1786122000, end_time: 1786129200, time_zone: 'America/New_York',
  event_logo: { image_id: 'logo42' }, live_stream_url: 'https://example.com/live',
  event_networks: [{ url: 'https://example.com/event', network_type: 1 }, { url: 'javascript:bad' }],
  games: [10, { id: 20 }],
});
assert(igdbEvent?.id === 'igdb:42', 'IGDB normalization creates a namespaced event ID');
assert(igdbEvent?.gameIds.join(',') === '10,20', 'IGDB normalization retains linked game IDs');
assert(igdbEvent?.links.length === 1, 'IGDB normalization rejects unsafe links');

const foundation = normalizeEventsForGamersEvent({
  id: 20097,
  title: 'Atlas Showcase &#8211; 2026',
  excerpt: '<p>A broad gaming event.</p>',
  all_day: true,
  start_date: '2026-08-07 00:00:00',
  end_date: '2026-08-07 23:59:59',
  timezone: 'America/New_York',
  url: 'https://eventsforgamers.com/event/atlas-showcase/',
  website: 'https://example.com/official',
  categories: [{ name: 'Convention' }, { name: 'Online' }],
  venue: { venue: 'Atlas Hall', city: 'Boston', stateprovince: 'MA', country: 'United States', geo_lat: 42, geo_lng: -71 },
  image: { sizes: { medium: { url: 'https://example.com/banner.jpg' } } },
});
assert(foundation?.id === 'events_for_gamers:20097', 'Events for Gamers normalization creates a namespaced ID');
assert(foundation?.name === 'Atlas Showcase – 2026', 'HTML entities are decoded from event titles');
assert(foundation?.description === 'A broad gaming event.', 'event descriptions are reduced to safe plain text');
assert(foundation?.categories.join(',') === 'Convention,Online', 'event categories are retained');
assert(foundation?.venue?.city === 'Boston', 'structured venue data is retained');
assert(foundation?.allDay === true, 'all-day semantics are retained');

const merged = mergeEventSources([foundation!], [igdbEvent!]);
assert(merged.length === 1, 'matching source records merge instead of duplicating');
assert(merged[0].sources.join(',') === 'events_for_gamers,igdb', 'merged event preserves both source identities');
assert(merged[0].gameIds.join(',') === '10,20', 'IGDB linked games enrich the broad event record');
assert(merged[0].liveStreamUrl === 'https://example.com/live', 'IGDB stream enriches the broad event record');
assert(merged[0].links.length === 3, 'official, source, and IGDB links survive deterministic merging');

const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:atlas-1\nSUMMARY:Fallback Atlas Event\nDTSTART;VALUE=DATE:20260820\nDTEND;VALUE=DATE:20260821\nLOCATION:Atlas Hall\\, Boston\nURL:https://example.com/fallback\nEND:VEVENT\nEND:VCALENDAR`;
const fallback = normalizeEventsForGamersIcs(ics, 2026, 2027);
assert(fallback.length === 1 && fallback[0].allDay === true, 'public iCalendar fallback normalizes dated events');

assert(eventsWithinRange(merged, new Date('2026-08-01T00:00:00Z'), new Date('2026-08-31T23:59:59Z')).length === 1, 'range filtering includes overlapping merged events');
assert(getEventsForMonth(merged, 2026, 8).length === 1, 'calendar month filtering includes the merged event');
assert(getEventDetailPath(merged[0].id).includes('events_for_gamers%3A20097'), 'event detail paths safely encode namespaced IDs');

const importerSource = fs.readFileSync(new URL('../scripts/build-igdb-events.ts', import.meta.url), 'utf8');
const eventsPage = fs.readFileSync(new URL('../src/pages/EventsPage.tsx', import.meta.url), 'utf8');
const calendarPage = fs.readFileSync(new URL('../src/pages/CalendarPage.tsx', import.meta.url), 'utf8');
const homePage = fs.readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert(importerSource.includes('wp-json/tribe/events/v1/events'), 'Events for Gamers REST API is the broad foundation');
assert(importerSource.includes('per_page: \'50\'') && importerSource.includes('total_pages'), 'REST importer paginates all source results');
assert(importerSource.includes('eventsforgamers%40gmail.com/public/basic.ics'), 'public iCalendar is retained as fallback');
assert(importerSource.includes('/v4/events/count'), 'IGDB remains an enrichment source');
assert(importerSource.includes('Promise.allSettled'), 'one source failure does not suppress a healthy event source');
assert(app.includes('path="events/:eventId"'), 'event details have a dedicated application route');
assert(eventsPage.includes('getEventDetailPath(event.id)'), 'Events tab opens Play Atlas event details');
assert(calendarPage.includes('getEventDetailPath(event.id)'), 'Calendar events open Play Atlas event details');
assert(homePage.includes('getEventDetailPath(event.id)'), 'Home Events widget opens Play Atlas event details');

console.log(`Merged Events results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
