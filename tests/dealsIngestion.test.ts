import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { checkPricingAccess, loadCatalogExternalIds, writeDealsFeed } from '../scripts/fetch-deals';
import { enrichDealsRanking } from '../scripts/enrich-deals-ranking';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'play-atlas-deals-'));
const record = { id: 'igdb:101', sourceId: 101, name: 'Test Game', externalIds: { steam: '220', gog: '123', epic: 'test-game' } };
const catalogFile = path.join(directory, 'igdb_index.json');
const outputFile = path.join(directory, 'deals.json');
const write = (file: string, data: unknown) => fs.writeFileSync(path.join(directory, file), JSON.stringify(data));
let requests: string[] = [];
const request: typeof fetch = async (input, options) => {
  const url = String(input);
  requests.push(url);
  const body = options?.body ? JSON.parse(String(options.body)) : null;
  let response: unknown;
  if (url.endsWith('/service/shops/map/v1')) {
    response = [{ id: 61, title: 'Steam' }, { id: 35, title: 'GOG' }, { id: 16, title: 'Epic Game Store' }];
  } else if (url.includes('/lookup/id/shop/61/v1')) {
    assert.deepEqual(body, ['app/220']);
    response = { 'app/220': 'uuid-101' };
  } else if (url.includes('/lookup/id/shop/35/v1')) {
    assert.deepEqual(body, ['123']);
    response = { '123': 'uuid-101' };
  } else if (url.includes('/lookup/id/shop/16/v1')) {
    assert.deepEqual(body, ['test-game']);
    response = { 'test-game': 'uuid-101' };
  } else {
    assert.ok(url.endsWith('/games/overview/v2?country=US'));
    assert.deepEqual(body, ['uuid-101']);
    response = { prices: [{ id: 'uuid-101', current: {
      shop: { id: 61, name: 'Steam' }, price: { amount: 0, currency: 'USD' },
      regular: { amount: 20, currency: 'USD' }, cut: 100, voucher: null,
      url: 'https://store.steampowered.com/app/220',
      timestamp: '2026-01-01T00:00:00Z', expiry: new Date(Date.now() + 60_000).toISOString(),
    }, lowest: { price: { amount: 0, currency: 'USD' } } }], bundles: [] };
  }
  return new Response(JSON.stringify(response), { status: 200 });
};

try {
  write('igdb_index.json', { records: [record] });
  assert.equal(loadCatalogExternalIds(directory)[0].ids.get('app/220')![0].gameId, 101);
  const dataset = await writeDealsFeed(directory, outputFile, 'test-key', request);
  assert.equal(dataset.totalDeals, 1); // UUID shared across stores is queried once.
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'deals-preview.json'), 'utf8')).totalDeals, 1);
  assert.equal(dataset.deals[0].storeId, '61');
  assert.equal(dataset.deals[0].currentPrice.amountFormatted, '$0.00');
  assert.equal(dataset.deals[0].historyLowPrice?.amount, 0);
  assert.equal(dataset.deals[0].isHistoricalLow, true);
  assert.equal(dataset.deals[0].sourceUpdatedAt, '2026-01-01T00:00:00Z');
  assert.ok(Date.parse(dataset.deals[0].expiresAt!) > Date.now());
  assert.equal(requests.length, 6);
  const previous = fs.readFileSync(outputFile, 'utf8');
  for (const state of ['expired', 'full-price', 'removed']) {
    const replaced = await writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
      const response = await request(input, options);
      if (!String(input).includes('/games/overview/')) return response;
      const body = await response.json();
      if (state === 'expired') body.prices[0].current.expiry = new Date(Date.now() - 1).toISOString();
      if (state === 'full-price') { body.prices[0].current.cut = 0; body.prices[0].current.price = body.prices[0].current.regular; }
      if (state === 'removed') body.prices[0].current = null;
      return new Response(JSON.stringify(body));
    });
    assert.equal(replaced.totalDeals, 0, `${state} offer is removed on refresh`);
    assert.equal(JSON.parse(fs.readFileSync(outputFile, 'utf8')).deals.length, 0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'deals-preview.json'), 'utf8')).deals.length, 0);
  }
  fs.writeFileSync(outputFile, previous);
  for (const status of [401, 404]) {
    await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', async () => new Response('', { status })));
    assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);
  }
  await assert.rejects(writeDealsFeed(directory, outputFile, '', request), /ITAD_API_KEY/);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);

  write('igdb_index.json', { records: [record, {
    ...record, id: 'igdb:102', sourceId: 102, externalIds: { steam: '221' },
  }] });
  const omittedPriceRequest: typeof fetch = async (input, options) => {
    if (String(input).includes('/lookup/id/shop/61/')) {
      return new Response(JSON.stringify({ 'app/220': 'uuid-101', 'app/221': 'uuid-missing' }));
    }
    if (String(input).includes('/games/overview/')) {
      // An otherwise valid overview omits the unavailable game completely.
      return request(input, { ...options, body: JSON.stringify(['uuid-101']) });
    }
    return request(input, options);
  };
  const partialDataset = await writeDealsFeed(directory, outputFile, 'test-key', omittedPriceRequest);
  assert.equal(partialDataset.totalDeals, 1);
  assert.equal(partialDataset.deals[0].gameId, 101);
  const partialFeed = fs.readFileSync(outputFile, 'utf8');
  await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
    if (String(input).includes('/games/overview/')) return new Response(JSON.stringify({ prices: [] }));
    return omittedPriceRequest(input, options);
  }), /no usable deals/);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), partialFeed);
  fs.writeFileSync(outputFile, previous);
  write('igdb_index.json', { records: [record] });
  await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
    if (String(input).includes('/games/overview/')) return new Response(JSON.stringify([]));
    return request(input, options);
  }), /overview/);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);

  write('igdb_index.json', [record]);
  assert.equal(loadCatalogExternalIds(directory).length, 3);
  write('igdb_index.json', { records: [] });
  await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', request), /storefront IDs/);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);
  fs.writeFileSync(catalogFile, JSON.stringify({ records: [record] }));
  write('game_index_manifest.json', { chunks: [{ file: 'data/game_index_1.json' }] });
  write('game_index_1.json', [record]);
  assert.equal(loadCatalogExternalIds(directory)[0].ids.size, 1);
  fs.mkdirSync(path.join(directory, 'chunks'));
  fs.writeFileSync(path.join(directory, 'chunks/game_index_1.json.gz'), zlib.gzipSync(JSON.stringify([record])));
  write('browser_catalog_manifest.json', { fullCatalog: { chunks: [{ file: 'chunks/game_index_1.json.gz' }] } });
  requests = [];
  assert.equal((await writeDealsFeed(directory, outputFile, 'test-key', request)).totalDeals, 1);

  await checkPricingAccess('test-key', async () => new Response(JSON.stringify({ prices: [] })));
  await assert.rejects(checkPricingAccess('', request), /ITAD_API_KEY/);
  await assert.rejects(checkPricingAccess('test-key', async () => new Response('', { status: 403 })), /active API key/);
  await assert.rejects(checkPricingAccess('test-key', async () => new Response('{}')), /overview/);

  assert.equal((await writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
    if (String(input).includes('/lookup/id/shop/35/')) return new Response('{}');
    return request(input, options);
  })).totalDeals, 1);

  for (const temporaryFailure of ['network', 'rate-limit', 'server']) {
    let attempts = 0;
    const result = await writeDealsFeed(directory, outputFile, '  test-key  ', async (input, options) => {
      assert.equal((options!.headers as Record<string, string>)['ITAD-API-Key'], 'test-key');
      if (String(input).endsWith('/service/shops/map/v1') && attempts++ === 0) {
        if (temporaryFailure === 'network') throw new TypeError('fetch failed');
        return new Response('', { status: temporaryFailure === 'rate-limit' ? 429 : 503, headers: { 'Retry-After': '0' } });
      }
      return request(input, options);
    });
    assert.equal(result.totalDeals, 1);
    assert.equal(attempts, 2);
  }

  let lookupCalls = 0;
  const existing = fs.readFileSync(outputFile, 'utf8');
  await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
    if (String(input).includes('/lookup/')) lookupCalls++;
    if (String(input).includes('/games/overview/')) return new Response('', { status: 403 });
    return request(input, options);
  }), /active API key/);
  assert.equal(lookupCalls, 1);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), existing);

  const largeCatalog = Array.from({ length: 205 }, (_, index) => ({
    ...record, id: `igdb:${index + 1}`, sourceId: index + 1, externalIds: { steam: String(index + 1) },
  }));
  fs.writeFileSync(path.join(directory, 'chunks/game_index_1.json.gz'), zlib.gzipSync(JSON.stringify(largeCatalog)));
  const priceBatchSizes: number[] = [];
  const lookupBatchSizes: number[] = [];
  const noCurrentPrices = await writeDealsFeed(directory, outputFile, 'test-key', async (input, options) => {
    const url = String(input);
    const body: string[] = options?.body ? JSON.parse(String(options.body)) : [];
    if (url.includes('/lookup/')) {
      lookupBatchSizes.push(body.length);
      return new Response(JSON.stringify(Object.fromEntries(body.map(id => [id, `uuid-${id}`]))));
    }
    if (url.includes('/games/overview/')) {
      priceBatchSizes.push(body.length);
      return new Response(JSON.stringify({ prices: body.map(id => ({ id, current: null, lowest: null })) }));
    }
    return request(input, options);
  });
  assert.equal(noCurrentPrices.totalDeals, 0);
  assert.deepEqual(lookupBatchSizes, [100, 100, 5]);
  assert.deepEqual(priceBatchSizes, [1, 100, 100, 5]);
  fs.mkdirSync(path.join(directory, 'search'));
  write('search/token_manifest.json', { lookupFiles: [{ file: 'search/games.json.gz' }] });
  fs.writeFileSync(path.join(directory, 'search/games.json.gz'), zlib.gzipSync(JSON.stringify([
    { id: 101, gameType: 'main_game', defaultVisible: true, rank: { totalRatingCount: 5000, userRatingCount: 5000, totalRating: 9, hypeCount: 100 } },
  ])));
  write('browser_catalog_manifest.json', { searchManifest: 'search/token_manifest.json', fullCatalog: { chunks: [{ file: 'chunks/game_index_1.json.gz' }] } });
  const rankedDataset = JSON.parse(previous);
  rankedDataset.deals.push({ ...rankedDataset.deals[0], gameId: 202 });
  rankedDataset.totalDeals = 2;
  write('deals.json', rankedDataset);
  enrichDealsRanking(directory);
  const enriched = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  assert.ok(enriched.deals[0].popularityScore > 50);
  assert.equal(enriched.deals[1].popularityScore, 0);
  assert.equal(enriched.deals[0].currentPrice.amount, rankedDataset.deals[0].currentPrice.amount);
  assert.equal(enriched.generatedAt, rankedDataset.generatedAt);
  const preview = JSON.parse(fs.readFileSync(path.join(directory, 'deals-preview.json'), 'utf8'));
  assert.equal(preview.totalDeals, 2);
  assert.equal(preview.deals[0].gameId, 101);
  console.log('Deals ingestion regression checks passed.');
} finally {
  // Delete only this test's unique temporary directory.
  fs.rmSync(directory, { recursive: true, force: true });
}
