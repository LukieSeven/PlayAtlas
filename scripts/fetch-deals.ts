import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function loadEnvFile() {
  const envPaths = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.local')];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnvFile();

const ITAD_SECRET = process.env.ITAD_SECRET || process.env.ITAD_CLIENT_ID;
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'deals.json');

export interface DealPrice {
  amount: number;
  amountFormatted: string;
  currency: string;
}

export interface GameDeal {
  gameId: number;
  itadId: string;
  storeId: string;
  storeName: string;
  regularPrice: DealPrice;
  currentPrice: DealPrice;
  cut: number;
  url: string;
  isHistoricalLow: boolean;
  historyLowPrice?: DealPrice;
  voucher?: string | null;
  updatedAt: string;
}

export interface DealsDataset {
  schemaVersion: number;
  generatedAt: string;
  totalDeals: number;
  deals: GameDeal[];
}

interface CatalogEntry {
  id: number;
  name: string;
  externalIds?: {
    steam?: string;
    gog?: string;
    epic?: string;
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[ITAD Ingestion] Rate limited (429). Retrying in ${backoffMs}ms...`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
}

/**
 * Load external game IDs from catalog index files
 */
function loadCatalogExternalIds(): Map<string, number> {
  const shopIdToGameId = new Map<string, number>();

  // Check public/data/igdb_index.json
  const indexPath = path.join(process.cwd(), 'public', 'data', 'igdb_index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      const records: CatalogEntry[] = JSON.parse(raw);
      for (const rec of records) {
        if (rec.externalIds) {
          if (rec.externalIds.steam) {
            shopIdToGameId.set(`app/${rec.externalIds.steam}`, rec.id);
          }
          if (rec.externalIds.gog) {
            shopIdToGameId.set(`game/${rec.externalIds.gog}`, rec.id);
          }
        }
      }
    } catch (e) {
      console.warn('[ITAD Ingestion] Warning parsing igdb_index.json:', e);
    }
  }

  return shopIdToGameId;
}

async function main() {
  console.log('----------------------------------------------------');
  console.log('🏷️ IsThereAnyDeal (ITAD) Deals Ingestion Pipeline');
  console.log('----------------------------------------------------');

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!ITAD_SECRET) {
    console.warn('⚠️ ITAD_SECRET / ITAD_CLIENT_ID not found in environment.');
    console.warn('Writing clean empty dataset to public/data/deals.json without fake records.');

    const emptyDataset: DealsDataset = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      totalDeals: 0,
      deals: [],
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emptyDataset, null, 2), 'utf-8');
    console.log(`✅ Empty deals manifest written to ${OUTPUT_FILE}`);
    return;
  }

  const shopIdToGameId = loadCatalogExternalIds();
  console.log(`🔍 Catalog external IDs collected: ${shopIdToGameId.size} mapping entries.`);

  if (shopIdToGameId.size === 0) {
    console.warn('⚠️ No external storefront IDs found in local catalog.');
    const emptyDataset: DealsDataset = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      totalDeals: 0,
      deals: [],
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emptyDataset, null, 2), 'utf-8');
    console.log(`✅ Empty deals manifest written to ${OUTPUT_FILE}`);
    return;
  }

  const shopLookupIds = Array.from(shopIdToGameId.keys());
  const BATCH_SIZE = 100;
  const itadDeals: GameDeal[] = [];

  for (let i = 0; i < shopLookupIds.length; i += BATCH_SIZE) {
    const batchShopIds = shopLookupIds.slice(i, i + BATCH_SIZE);

    try {
      // 1. Lookup ITAD UUIDs via /lookup/id/shop/v2
      const lookupRes = await fetchWithRetry('https://api.isthereanydeal.com/lookup/id/shop/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ITAD-API-Key': ITAD_SECRET,
        },
        body: JSON.stringify(batchShopIds),
      });

      if (!lookupRes.ok) {
        console.warn(`[ITAD Ingestion] Lookup batch failed status ${lookupRes.status}`);
        continue;
      }

      const lookupMap: Record<string, string | null> = await lookupRes.json();
      const validItadIds: { itadId: string; gameId: number }[] = [];

      for (const [shopId, itadId] of Object.entries(lookupMap)) {
        if (itadId && shopIdToGameId.has(shopId)) {
          validItadIds.push({ itadId, gameId: shopIdToGameId.get(shopId)! });
        }
      }

      if (validItadIds.length === 0) continue;

      // 2. Fetch prices & deals via /games/overview/v2
      const pricesRes = await fetchWithRetry('https://api.isthereanydeal.com/games/overview/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ITAD-API-Key': ITAD_SECRET,
        },
        body: JSON.stringify(validItadIds.map(v => v.itadId)),
      });

      if (!pricesRes.ok) {
        console.warn(`[ITAD Ingestion] Overview batch failed status ${pricesRes.status}`);
        continue;
      }

      const overviewData: any[] = await pricesRes.json();

      for (const item of overviewData) {
        const matched = validItadIds.find(v => v.itadId === item.id);
        if (!matched || !item.price) continue;

        const deal: GameDeal = {
          gameId: matched.gameId,
          itadId: item.id,
          storeId: item.price.shop?.id || 'store',
          storeName: item.price.shop?.name || 'Storefront',
          regularPrice: {
            amount: item.price.regular?.amount || 0,
            amountFormatted: item.price.regular?.amountFormatted || `$${item.price.regular?.amount || 0}`,
            currency: item.price.regular?.currency || 'USD',
          },
          currentPrice: {
            amount: item.price.amount || 0,
            amountFormatted: item.price.amountFormatted || `$${item.price.amount || 0}`,
            currency: item.price.currency || 'USD',
          },
          cut: item.price.cut || 0,
          url: item.price.url || '',
          isHistoricalLow: Boolean(item.historyLow?.isLow),
          historyLowPrice: item.historyLow?.amount
            ? {
                amount: item.historyLow.amount,
                amountFormatted: item.historyLow.amountFormatted || `$${item.historyLow.amount}`,
                currency: item.historyLow.currency || 'USD',
              }
            : undefined,
          voucher: item.price.voucher || null,
          updatedAt: new Date().toISOString(),
        };

        itadDeals.push(deal);
      }
    } catch (batchErr) {
      console.warn(`[ITAD Ingestion] Error processing batch ${i}:`, batchErr);
    }
  }

  const dataset: DealsDataset = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalDeals: itadDeals.length,
    deals: itadDeals,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataset), 'utf-8');
  console.log(`====================================================`);
  console.log(`✅ Deals dataset written to ${OUTPUT_FILE}`);
  console.log(`📊 Total Deals Ingested: ${itadDeals.length}`);
  console.log(`====================================================`);
}

main().catch(err => {
  console.error('[ITAD Ingestion Fatal Error]:', err);
  process.exit(1);
});
