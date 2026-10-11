import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadCatalogExternalIds, writeDealsFeed } from '../scripts/fetch-deals';

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
    }, lowest: { price: { amount: 0, currency: 'USD' } } }], bundles: [] };
  }
  return new Response(JSON.stringify(response), { status: 200 });
};

try {
  write('igdb_index.json', { records: [record] });
  assert.equal(loadCatalogExternalIds(directory)[0].ids.get('app/220')![0].gameId, 101);
  const dataset = await writeDealsFeed(directory, outputFile, 'test-key', request);
  assert.equal(dataset.totalDeals, 1); // UUID shared across stores is queried once.
  assert.equal(dataset.deals[0].storeId, '61');
  assert.equal(dataset.deals[0].currentPrice.amountFormatted, '$0.00');
  assert.equal(dataset.deals[0].historyLowPrice?.amount, 0);
  assert.equal(dataset.deals[0].isHistoricalLow, true);
  assert.equal(requests.length, 5);
  const previous = fs.readFileSync(outputFile, 'utf8');
  for (const status of [401, 404]) {
    await assert.rejects(writeDealsFeed(directory, outputFile, 'test-key', async () => new Response('', { status })));
    assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);
  }
  await assert.rejects(writeDealsFeed(directory, outputFile, '', request), /ITAD_API_KEY/);
  assert.equal(fs.readFileSync(outputFile, 'utf8'), previous);
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
  console.log('Deals ingestion regression checks passed.');
} finally {
  // Delete only this test's unique temporary directory.
  fs.rmSync(directory, { recursive: true, force: true });
}
