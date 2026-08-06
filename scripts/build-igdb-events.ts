import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogEvent, CatalogEventLink, EventsCatalogManifest } from '../src/types/events';

const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;
const outputDir = path.resolve(process.env.PLAY_ATLAS_EVENTS_OUTPUT_DIR || 'public/data/events');
const eventsForGamersEndpoint = 'https://www.eventsforgamers.com/wp-json/tribe/events/v1/events';
const eventsForGamersIcs = 'https://calendar.google.com/calendar/ical/eventsforgamers%40gmail.com/public/basic.ics';

const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
};

const decodeHtml = (value: string): string => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim();

const utcDateTime = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.trim().replace(' ', 'T');
  const parsed = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
};

const allDayDateTime = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00.000Z` : undefined;
};

const uniqueLinks = (links: CatalogEventLink[]): CatalogEventLink[] => {
  const seen = new Set<string>();
  return links.filter(link => safeUrl(link.url) && !seen.has(link.url) && seen.add(link.url));
};

export function normalizeIgdbEvent(raw: any): CatalogEvent | null {
  if (!Number.isSafeInteger(raw?.id) || typeof raw?.name !== 'string' || !raw.name.trim() || !Number.isFinite(raw?.start_time)) return null;
  const logoId = raw.event_logo?.image_id;
  return {
    id: `igdb:${raw.id}`,
    sources: ['igdb'],
    sourceIds: { igdb: String(raw.id) },
    name: raw.name.trim(),
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
    startTime: new Date(raw.start_time * 1000).toISOString(),
    endTime: Number.isFinite(raw.end_time) ? new Date(raw.end_time * 1000).toISOString() : undefined,
    timeZone: typeof raw.time_zone === 'string' ? raw.time_zone : undefined,
    allDay: false,
    categories: [],
    logoUrl: logoId ? `https://images.igdb.com/igdb/image/upload/t_logo_med/${logoId}.png` : undefined,
    liveStreamUrl: safeUrl(raw.live_stream_url),
    links: (Array.isArray(raw.event_networks) ? raw.event_networks : [])
      .map((link: any) => ({ url: safeUrl(link?.url), networkType: Number.isSafeInteger(link?.network_type) ? link.network_type : undefined }))
      .filter((link: any): link is CatalogEventLink => Boolean(link.url)),
    gameIds: (Array.isArray(raw.games) ? raw.games : [])
      .map((game: any) => typeof game === 'number' ? game : game?.id)
      .filter((id: unknown): id is number => Number.isSafeInteger(id)),
  };
}

export function normalizeEventsForGamersEvent(raw: any): CatalogEvent | null {
  if (!Number.isSafeInteger(raw?.id) || typeof raw?.title !== 'string') return null;
  const allDay = raw.all_day === true;
  const startTime = allDay ? allDayDateTime(raw.start_date) : utcDateTime(raw.utc_start_date || raw.start_date);
  if (!startTime) return null;
  const endTime = allDay ? allDayDateTime(raw.end_date) : utcDateTime(raw.utc_end_date || raw.end_date);
  const eventPage = safeUrl(raw.url);
  const officialWebsite = safeUrl(raw.website);
  const imageUrl = safeUrl(raw.image?.sizes?.medium?.url || raw.image?.url);
  const venue = raw.venue && typeof raw.venue === 'object' ? {
    name: typeof raw.venue.venue === 'string' ? decodeHtml(raw.venue.venue) : undefined,
    city: typeof raw.venue.city === 'string' ? decodeHtml(raw.venue.city) : undefined,
    region: typeof (raw.venue.stateprovince || raw.venue.state) === 'string' ? decodeHtml(raw.venue.stateprovince || raw.venue.state) : undefined,
    country: typeof raw.venue.country === 'string' ? decodeHtml(raw.venue.country) : undefined,
    latitude: Number.isFinite(raw.venue.geo_lat) ? raw.venue.geo_lat : undefined,
    longitude: Number.isFinite(raw.venue.geo_lng) ? raw.venue.geo_lng : undefined,
  } : undefined;
  return {
    id: `events_for_gamers:${raw.id}`,
    sources: ['events_for_gamers'],
    sourceIds: { events_for_gamers: String(raw.id) },
    name: decodeHtml(raw.title),
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    description: typeof (raw.excerpt || raw.description) === 'string' ? decodeHtml(raw.excerpt || raw.description) : undefined,
    startTime,
    endTime,
    timeZone: typeof raw.timezone === 'string' ? raw.timezone : undefined,
    allDay,
    categories: (Array.isArray(raw.categories) ? raw.categories : [])
      .map((category: any) => typeof category?.name === 'string' ? decodeHtml(category.name) : '')
      .filter(Boolean),
    venue,
    logoUrl: imageUrl,
    links: uniqueLinks([
      ...(officialWebsite ? [{ url: officialWebsite, label: 'Official website' }] : []),
      ...(eventPage ? [{ url: eventPage, label: 'Events for Gamers' }] : []),
    ]),
    gameIds: [],
  };
}

const normalizedIdentity = (name: string): string => decodeHtml(name)
  .toLowerCase()
  .replace(/\b20\d{2}\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const mergeMatch = (foundation: CatalogEvent, enrichment: CatalogEvent): boolean => {
  if (normalizedIdentity(foundation.name) !== normalizedIdentity(enrichment.name)) return false;
  return Math.abs(new Date(foundation.startTime).getTime() - new Date(enrichment.startTime).getTime()) <= 48 * 60 * 60 * 1000;
};

export function mergeEventSources(eventsForGamers: CatalogEvent[], igdb: CatalogEvent[]): CatalogEvent[] {
  const merged = eventsForGamers.map(event => ({ ...event, sources: [...event.sources], sourceIds: { ...event.sourceIds }, links: [...event.links], gameIds: [...event.gameIds] }));
  for (const igdbEvent of igdb) {
    const match = merged.find(event => mergeMatch(event, igdbEvent));
    if (!match) {
      merged.push(igdbEvent);
      continue;
    }
    match.sources = Array.from(new Set([...match.sources, 'igdb']));
    match.sourceIds.igdb = igdbEvent.sourceIds.igdb;
    match.gameIds = Array.from(new Set([...match.gameIds, ...igdbEvent.gameIds]));
    match.links = uniqueLinks([...match.links, ...igdbEvent.links]);
    match.liveStreamUrl ||= igdbEvent.liveStreamUrl;
    match.logoUrl ||= igdbEvent.logoUrl;
    match.description ||= igdbEvent.description;
  }
  return merged.sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id));
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'PlayAtlas-Events-Importer/1.0' }, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

async function fetchEventsForGamersRest(startYear: number, endYear: number): Promise<CatalogEvent[]> {
  const events: CatalogEvent[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const params = new URLSearchParams({ start_date: `${startYear}-01-01`, end_date: `${endYear}-12-31`, per_page: '50', page: String(page) });
    const response = await fetchWithRetry(`${eventsForGamersEndpoint}?${params}`);
    const payload = await response.json() as any;
    if (!Array.isArray(payload.events)) throw new Error('Events for Gamers REST response did not contain an events array.');
    events.push(...payload.events.map(normalizeEventsForGamersEvent).filter((event: CatalogEvent | null): event is CatalogEvent => event !== null));
    totalPages = Number.isSafeInteger(payload.total_pages) ? payload.total_pages : 1;
    page++;
  } while (page <= totalPages);
  return events;
}

const readIcsField = (block: string[], field: string): { params: string; value: string } | undefined => {
  const line = block.find(entry => entry.startsWith(`${field}:`) || entry.startsWith(`${field};`));
  if (!line) return undefined;
  const separator = line.indexOf(':');
  return { params: line.slice(field.length, separator), value: line.slice(separator + 1) };
};

const parseIcsDate = (field?: { params: string; value: string }): { iso?: string; allDay: boolean; timeZone?: string } => {
  if (!field) return { allDay: false };
  const allDay = field.params.includes('VALUE=DATE') || /^\d{8}$/.test(field.value);
  const timeZone = field.params.match(/TZID=([^;:]+)/)?.[1];
  if (allDay) return { iso: `${field.value.slice(0, 4)}-${field.value.slice(4, 6)}-${field.value.slice(6, 8)}T12:00:00.000Z`, allDay, timeZone };
  const match = field.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return { allDay, timeZone };
  const [, year, month, day, hour, minute, second, zulu] = match;
  return { iso: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${zulu || 'Z'}`).toISOString(), allDay, timeZone };
};

export function normalizeEventsForGamersIcs(ics: string, startYear: number, endYear: number): CatalogEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] | null = null;
  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') current = [];
    else if (line === 'END:VEVENT' && current) { blocks.push(current); current = null; }
    else current?.push(line);
  }
  return blocks.map(block => {
    const uid = readIcsField(block, 'UID')?.value;
    const summary = readIcsField(block, 'SUMMARY')?.value;
    const start = parseIcsDate(readIcsField(block, 'DTSTART'));
    const end = parseIcsDate(readIcsField(block, 'DTEND'));
    if (!uid || !summary || !start.iso) return null;
    const year = new Date(start.iso).getUTCFullYear();
    if (year < startYear || year > endYear) return null;
    const url = safeUrl(readIcsField(block, 'URL')?.value);
    const location = decodeHtml((readIcsField(block, 'LOCATION')?.value || '').replace(/\\,/g, ','));
    return {
      id: `events_for_gamers_ics:${uid}`,
      sources: ['events_for_gamers'],
      sourceIds: { events_for_gamers: uid },
      name: decodeHtml(summary.replace(/\\,/g, ',')),
      description: decodeHtml((readIcsField(block, 'DESCRIPTION')?.value || '').replace(/\\n/g, ' ')),
      startTime: start.iso,
      endTime: end.iso,
      timeZone: start.timeZone,
      allDay: start.allDay,
      categories: [],
      venue: location ? { name: location } : undefined,
      links: url ? [{ url, label: 'Event website' }] : [],
      gameIds: [],
    } satisfies CatalogEvent;
  }).filter((event): event is CatalogEvent => event !== null);
}

async function fetchEventsForGamers(startYear: number, endYear: number): Promise<CatalogEvent[]> {
  try {
    const events = await fetchEventsForGamersRest(startYear, endYear);
    if (events.length === 0) throw new Error('Events for Gamers REST API returned no publishable events.');
    return events;
  } catch (restError) {
    console.warn(`Events for Gamers REST import failed; using public iCalendar fallback: ${restError}`);
    const response = await fetch(eventsForGamersIcs, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`Events for Gamers iCalendar request failed: HTTP ${response.status}`);
    return normalizeEventsForGamersIcs(await response.text(), startYear, endYear);
  }
}

async function fetchIgdbEvents(startYear: number): Promise<CatalogEvent[]> {
  if (!clientId || !clientSecret) {
    console.warn('IGDB credentials unavailable; publishing Events for Gamers without IGDB enrichment.');
    return [];
  }
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`, { method: 'POST' });
  if (!tokenResponse.ok) throw new Error(`Twitch authentication failed: HTTP ${tokenResponse.status}`);
  const { access_token: token } = await tokenResponse.json() as { access_token?: string };
  if (!token) throw new Error('Twitch authentication returned no access token.');
  const earliest = Math.floor(Date.UTC(startYear, 0, 1) / 1000);
  const headers = { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain', Accept: 'application/json' };
  const countResponse = await fetch('https://api.igdb.com/v4/events/count', { method: 'POST', headers, body: `where start_time >= ${earliest};` });
  if (!countResponse.ok) throw new Error(`IGDB events count request failed: HTTP ${countResponse.status} ${await countResponse.text()}`);
  const { count = 0 } = await countResponse.json() as { count?: number };
  const rawEvents: any[] = [];
  for (let offset = 0; offset < count; offset += 500) {
    const response = await fetch('https://api.igdb.com/v4/events', { method: 'POST', headers, body: `fields id,name,slug,description,start_time,end_time,time_zone,live_stream_url,event_logo.image_id,event_networks.url,event_networks.network_type,games; where start_time >= ${earliest}; sort start_time asc; limit 500; offset ${offset};` });
    if (!response.ok) throw new Error(`IGDB events request failed at offset ${offset}: HTTP ${response.status} ${await response.text()}`);
    rawEvents.push(...await response.json() as any[]);
  }
  return rawEvents.map(normalizeIgdbEvent).filter((event): event is CatalogEvent => event !== null);
}

async function run() {
  const currentYear = new Date().getUTCFullYear();
  const [eventsForGamersResult, igdbResult] = await Promise.allSettled([
    fetchEventsForGamers(currentYear, currentYear + 1),
    fetchIgdbEvents(currentYear),
  ]);
  const eventsForGamers = eventsForGamersResult.status === 'fulfilled' ? eventsForGamersResult.value : [];
  const igdb = igdbResult.status === 'fulfilled' ? igdbResult.value : [];
  if (eventsForGamersResult.status === 'rejected') console.warn(`Events for Gamers sources failed: ${eventsForGamersResult.reason}`);
  if (igdbResult.status === 'rejected') console.warn(`IGDB event enrichment failed: ${igdbResult.reason}`);
  if (eventsForGamers.length === 0 && igdb.length === 0) throw new Error('No event source returned publishable events.');
  const events = mergeEventSources(eventsForGamers, igdb);
  const mergedCount = events.filter(event => event.sources.length > 1).length;
  const manifest: EventsCatalogManifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source: 'events_for_gamers+igdb',
    eventCount: events.length,
    sourceCounts: { eventsForGamers: eventsForGamers.length, igdb: igdb.length, merged: mergedCount },
    events,
  };
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'events.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Published ${events.length} events (${eventsForGamers.length} Events for Gamers, ${igdb.length} IGDB, ${mergedCount} enriched matches) to ${path.join(outputDir, 'events.json')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) run().catch(error => { console.error(error); process.exitCode = 1; });
