import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import type { DealPrice, DealsDataset, GameDeal } from '../src/types/deals';
import { buildCompactRankSignals, calculateDealPopularity } from '../src/utils/catalogRanking';

interface CatalogEntry {
  id: number | string;
  sourceId?: number;
  name: string;
  coverUrl?: string;
  externalIds?: Record<string, string | undefined>;
  gameType?: string;
  defaultVisible?: boolean;
}
interface CatalogGameInfo { gameId: number; gameTitle: string; coverUrl?: string; popularityScore: number }
interface StoreLookup { source: string; ids: Map<string, CatalogGameInfo[]> }
interface ApiPrice { amount: number; currency: string }
interface OverviewItem {
  id: string;
  current: null | {
    shop: { id: number; name: string }; price: ApiPrice; regular: ApiPrice;
    cut: number; url: string; voucher?: string | null;
  };
  lowest: null | { price: ApiPrice };
}

function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.trim().match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

function readJson(file: string): unknown {
  const bytes = fs.readFileSync(file);
  return JSON.parse((file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes).toString('utf8'));
}

/** Read the importer envelope, legacy arrays, and raw or compressed full catalogs. */
export function loadCatalogExternalIds(directory: string): StoreLookup[] {
  let files: string[];
  const browserManifest = path.join(directory, 'browser_catalog_manifest.json');
  const rawManifest = path.join(directory, 'game_index_manifest.json');
  if (fs.existsSync(browserManifest)) {
    const manifest = readJson(browserManifest) as { fullCatalog: { chunks: { file: string }[] } };
    files = manifest.fullCatalog.chunks.map(chunk => path.join(directory, chunk.file));
  } else if (fs.existsSync(rawManifest)) {
    const manifest = readJson(rawManifest) as { chunks?: { file: string }[] };
    files = manifest.chunks?.length
      ? manifest.chunks.map(chunk => path.join(directory, path.basename(chunk.file)))
      : [path.join(directory, 'igdb_index.json')];
  } else {
    files = [path.join(directory, 'igdb_index.json')];
  }
  const stores = new Map<string, Map<string, CatalogGameInfo[]>>();
  for (const file of files) {
    const data = readJson(file) as CatalogEntry[] | { records: CatalogEntry[] };
    const records = Array.isArray(data) ? data : data.records;
    if (!Array.isArray(records)) throw new Error(`Invalid catalog records in ${file}`);
    for (const record of records) {
      const gameId = record.sourceId ?? Number(String(record.id).replace(/^igdb[:_]/, ''));
      if (!Number.isSafeInteger(gameId) || gameId <= 0) continue;
      for (const source of ['steam', 'gog', 'epic']) {
        const value = record.externalIds?.[source];
        if (!value) continue;
        const rawId = String(value).trim();
        if (!rawId) continue;
        // Steam's lookup expects app/123, not steam/123. Other shops use their native IDs.
        const shopGameId = source === 'steam' && /^\d+$/.test(rawId) ? `app/${rawId}` : rawId;
        const ids = stores.get(source) ?? new Map<string, CatalogGameInfo[]>();
        const games = ids.get(shopGameId) ?? [];
        if (!games.some(game => game.gameId === gameId)) {
          games.push({ gameId, gameTitle: record.name, coverUrl: record.coverUrl,
            popularityScore: calculateDealPopularity({ ...record, rank: buildCompactRankSignals(record) }),
          });
        }
        ids.set(shopGameId, games);
        stores.set(source, ids);
      }
    }
  }
  if (!stores.size) throw new Error(`No supported storefront IDs found in ${directory}`);
  return [...stores].map(([source, ids]) => ({ source, ids }));
}

function normalizePrice(price: ApiPrice): DealPrice {
  if (!price || !Number.isFinite(price.amount) || price.amount < 0 || !price.currency) {
    throw new Error('Invalid ITAD price');
  }
  return { ...price, amountFormatted: new Intl.NumberFormat('en-US', {
    style: 'currency', currency: price.currency,
  }).format(price.amount) };
}

function createItadApi(apiKey: string, request: typeof fetch) {
  apiKey = apiKey.trim();
  if (!apiKey) throw new Error('ITAD_API_KEY is required (legacy ITAD_SECRET is also accepted).');
  const headers = { 'Content-Type': 'application/json', 'ITAD-API-Key': apiKey };
  async function api(endpoint: string, body?: string): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await request(`https://api.isthereanydeal.com${endpoint}`, {
          method: body === undefined ? 'GET' : 'POST', headers, body,
          signal: AbortSignal.timeout(30_000),
        });
      } catch {
        if (attempt === 2) throw new Error(`ITAD ${endpoint} failed after three network/timeout attempts.`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        const delay = Number.isFinite(seconds) ? seconds * 1000
          : retryAfter && Number.isFinite(Date.parse(retryAfter)) ? Math.max(0, Date.parse(retryAfter) - Date.now())
          : 2000 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) {
        const hint = response.status === 401 || response.status === 403
          ? ' Check that ITAD_SECRET contains an active API key with pricing access.' : '';
        throw new Error(`ITAD ${endpoint} failed: HTTP ${response.status}.${hint}`);
      }
      return response.json();
    }
    throw new Error(`ITAD ${endpoint} retries exhausted`);
  }
  return api;
}

/** Validate pricing access without downloading or building a catalog. */
export async function checkPricingAccess(apiKey: string, request: typeof fetch = fetch): Promise<void> {
  const api = createItadApi(apiKey, request);
  // A public example UUID; it need not have a current price to validate endpoint access.
  const result = await api('/games/overview/v2?country=US', JSON.stringify(['018d937e-f835-710c-b95b-928e277b187e'])) as { prices: OverviewItem[] };
  if (!Array.isArray(result?.prices)) throw new Error('Invalid ITAD overview response');
}

export async function ingestDeals(
  catalogDirectory: string, apiKey: string, request: typeof fetch = fetch,
): Promise<DealsDataset> {
  const api = createItadApi(apiKey, request);
  const stores = loadCatalogExternalIds(catalogDirectory);
  const shops = await api('/service/shops/map/v1') as { id: number; title: string }[];
  if (!Array.isArray(shops)) throw new Error('Invalid ITAD shop map');
  const matchedGames = new Map<string, Map<number, CatalogGameInfo>>();
  let priceAccessChecked = false;
  let omittedLookups = 0;
  for (const store of stores) {
    const expected = store.source === 'epic' ? ['epic game store', 'epic games store'] : [store.source];
    const shop = shops.find(item => expected.includes(item.title.toLowerCase()));
    if (!shop) throw new Error(`ITAD shop map is missing ${store.source}`);
    const ids = [...store.ids.keys()];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      const lookup = await api(`/lookup/id/shop/${shop.id}/v1`, JSON.stringify(batch)) as Record<string, string | null>;
      if (!lookup || Array.isArray(lookup) || typeof lookup !== 'object') throw new Error('Invalid ITAD lookup response');
      for (const shopGameId of batch) {
        if (!(shopGameId in lookup)) { omittedLookups++; continue; }
        const itadId = lookup[shopGameId];
        if (!itadId) continue;
        if (typeof itadId !== 'string') throw new Error('Invalid ITAD game ID');
        const games = matchedGames.get(itadId) ?? new Map<number, CatalogGameInfo>();
        for (const game of store.ids.get(shopGameId)!) games.set(game.gameId, game);
        matchedGames.set(itadId, games);
      }
      // Catch invalid pricing credentials before spending minutes on the full lookup pass.
      if (!priceAccessChecked && matchedGames.size) {
        const probe = await api('/games/overview/v2?country=US', JSON.stringify([matchedGames.keys().next().value])) as { prices: OverviewItem[] };
        if (!Array.isArray(probe?.prices)) throw new Error('Invalid ITAD overview response');
        priceAccessChecked = true;
      }
    }
  }
  if (omittedLookups) console.warn(`Skipped ${omittedLookups} storefront IDs omitted by ITAD lookup.`);
  console.log(`ITAD lookup matched ${matchedGames.size} unique games. Fetching prices...`);
  if (!matchedGames.size) throw new Error('ITAD lookup matched no catalog games; preserving existing feed.');
  const deals: GameDeal[] = [];
  let omittedPrices = 0;
  const updatedAt = new Date().toISOString();
  const ids = [...matchedGames.keys()];
  for (let offset = 0; offset < ids.length; offset += 100) {
    if (offset % 5000 === 0) console.log(`ITAD price progress: ${offset}/${ids.length} games`);
    const batch = ids.slice(offset, offset + 100);
    const overview = await api('/games/overview/v2?country=US', JSON.stringify(batch)) as { prices: OverviewItem[] };
    if (!Array.isArray(overview?.prices)) throw new Error('Invalid ITAD overview response');
    for (const id of batch) {
      const item = overview.prices.find(price => price.id === id);
      if (!item) {
        omittedPrices++;
        continue;
      }
      if (item.current === null) continue;
      const current = item.current;
      if (!current?.shop?.name || !Number.isInteger(current.shop.id) || !Number.isFinite(current.cut)) {
        throw new Error('Invalid ITAD current deal');
      }
      const currentPrice = normalizePrice(current.price);
      const regularPrice = normalizePrice(current.regular);
      const historyLowPrice = item.lowest ? normalizePrice(item.lowest.price) : undefined;
      for (const game of matchedGames.get(id)!.values()) {
        deals.push({ ...game, itadId: id, storeId: String(current.shop.id), storeName: current.shop.name,
          regularPrice, currentPrice, cut: current.cut, url: current.url,
          isHistoricalLow: Boolean(historyLowPrice && historyLowPrice.currency === currentPrice.currency
            && currentPrice.amount <= historyLowPrice.amount),
          historyLowPrice, voucher: current.voucher ?? null, updatedAt });
      }
    }
  }
  if (omittedPrices) {
    console.warn(`ITAD returned no price entry for ${omittedPrices} matched games; skipped those games.`);
    if (!deals.length) throw new Error('ITAD omitted price entries and returned no usable deals; preserving existing feed.');
  }
  return { schemaVersion: 1, generatedAt: updatedAt, totalDeals: deals.length, deals };
}

export async function writeDealsFeed(catalogDirectory: string, outputFile: string, apiKey: string, request: typeof fetch = fetch) {
  // Only publish a completely successful run; failures never replace the previous dataset.
  const dataset = await ingestDeals(catalogDirectory, apiKey, request);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const temporaryFile = `${outputFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(dataset));
  fs.renameSync(temporaryFile, outputFile);
  return dataset;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadEnvFile();
  const apiKey = process.env.ITAD_API_KEY || process.env.ITAD_SECRET || '';
  const catalogDirectory = process.env.PLAY_ATLAS_DEALS_CATALOG_DIR
    || ['generated/browser-catalog-rebuilt', 'generated/browser-catalog-test', 'generated/igdb-full-test', 'public/data']
      .find(directory => fs.existsSync(directory))!;
  const outputFile = path.join(process.env.PLAY_ATLAS_DEALS_OUTPUT_DIR || 'public/data', 'deals.json');
  const operation = process.argv.includes('--check-access')
    ? checkPricingAccess(apiKey).then(() => console.log('ITAD pricing access verified.'))
    : writeDealsFeed(catalogDirectory, outputFile, apiKey)
      .then(dataset => console.log(`Published ${dataset.totalDeals} deals to ${outputFile}`));
  operation
    .catch(error => { console.error('[ITAD ingestion failed]', error.message); process.exitCode = 1; });
}
