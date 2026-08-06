import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogEvent, EventsCatalogManifest } from '../src/types/events';

const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;
const outputDir = path.resolve(process.env.PLAY_ATLAS_EVENTS_OUTPUT_DIR || 'public/data/events');

const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
};

export function normalizeIgdbEvent(raw: any): CatalogEvent | null {
  if (!Number.isSafeInteger(raw?.id) || typeof raw?.name !== 'string' || !raw.name.trim() || !Number.isFinite(raw?.start_time)) return null;
  const logoId = raw.event_logo?.image_id;
  return {
    id: raw.id,
    name: raw.name.trim(),
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
    startTime: new Date(raw.start_time * 1000).toISOString(),
    endTime: Number.isFinite(raw.end_time) ? new Date(raw.end_time * 1000).toISOString() : undefined,
    timeZone: typeof raw.time_zone === 'string' ? raw.time_zone : undefined,
    logoUrl: logoId ? `https://images.igdb.com/igdb/image/upload/t_logo_med/${logoId}.png` : undefined,
    liveStreamUrl: safeUrl(raw.live_stream_url),
    links: (Array.isArray(raw.event_networks) ? raw.event_networks : [])
      .map((link: any) => ({ url: safeUrl(link?.url), networkType: Number.isSafeInteger(link?.network_type) ? link.network_type : undefined }))
      .filter((link: any) => Boolean(link.url)),
    gameIds: (Array.isArray(raw.games) ? raw.games : [])
      .map((game: any) => typeof game === 'number' ? game : game?.id)
      .filter((id: unknown): id is number => Number.isSafeInteger(id)),
  };
}

async function run() {
  if (!clientId || !clientSecret) throw new Error('Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET.');
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`, { method: 'POST' });
  if (!tokenResponse.ok) throw new Error(`Twitch authentication failed: HTTP ${tokenResponse.status}`);
  const { access_token: token } = await tokenResponse.json() as { access_token?: string };
  if (!token) throw new Error('Twitch authentication returned no access token.');

  const earliest = Math.floor(Date.now() / 1000) - 31 * 86_400;
  const response = await fetch('https://api.igdb.com/v4/events', {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain', Accept: 'application/json' },
    body: `fields id,name,slug,description,start_time,end_time,time_zone,live_stream_url,event_logo.image_id,event_networks.url,event_networks.network_type,games; where start_time >= ${earliest}; sort start_time asc; limit 500;`,
  });
  if (!response.ok) throw new Error(`IGDB events request failed: HTTP ${response.status} ${await response.text()}`);
  const events = ((await response.json()) as any[]).map(normalizeIgdbEvent).filter((event): event is CatalogEvent => event !== null);
  const manifest: EventsCatalogManifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'igdb', eventCount: events.length, events };
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'events.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Published ${events.length} IGDB events to ${path.join(outputDir, 'events.json')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) run().catch(error => { console.error(error); process.exitCode = 1; });
