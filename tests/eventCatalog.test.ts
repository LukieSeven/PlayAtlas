import { normalizeIgdbEvent } from '../scripts/build-igdb-events';
import { eventsWithinRange, getEventsForMonth } from '../src/services/eventCatalogService';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, name: string) => { if (condition) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } };

console.log('Running IGDB Events Catalog Tests...');
const event = normalizeIgdbEvent({
  id: 42, name: 'Atlas Showcase', slug: 'atlas-showcase', description: 'New games',
  start_time: 1786122000, end_time: 1786129200, time_zone: 'America/New_York',
  event_logo: { image_id: 'logo42' }, live_stream_url: 'https://example.com/live',
  event_networks: [{ url: 'https://example.com/event', network_type: 1 }, { url: 'javascript:bad' }],
  games: [10, { id: 20 }],
});
assert(event?.id === 42, 'normalization preserves authoritative IGDB event ID');
assert(event?.gameIds.join(',') === '10,20', 'normalization retains linked IGDB game IDs');
assert(event?.links.length === 1, 'normalization rejects unsafe event links');
assert(event?.logoUrl?.includes('logo42'), 'normalization builds the official IGDB image URL');
assert(normalizeIgdbEvent({ id: 1, name: 'Undated' }) === null, 'events without a start time are omitted');

const catalog = [event!];
assert(eventsWithinRange(catalog, new Date('2026-08-01T00:00:00Z'), new Date('2026-08-31T23:59:59Z')).length === 1, 'range filtering includes overlapping events');
assert(getEventsForMonth(catalog, 2026, 8).length === 1, 'calendar month filtering includes the event in its local month');
assert(getEventsForMonth(catalog, 2026, 9).length === 0, 'calendar month filtering excludes other months');

console.log(`IGDB Events results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
