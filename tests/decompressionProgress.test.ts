import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { fetchAndDecompressJson } from '../src/utils/decompression';
import type { LoadingProgress } from '../src/types/loadingProgress';

const originalFetch = globalThis.fetch;
const data = { schemaVersion: 1, records: [{ id: 1, name: 'Progress fixture' }] };
const zipped = gzipSync(JSON.stringify(data));
try {
  for (const knownSize of [true, false]) {
    globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) {
      const split = Math.floor(zipped.length / 2);
      controller.enqueue(zipped.subarray(0, split));
      controller.enqueue(zipped.subarray(split));
      controller.close();
    } }), { headers: knownSize ? { 'Content-Length': String(zipped.length) } : {} });
    const updates: LoadingProgress[] = [];
    assert.deepEqual(await fetchAndDecompressJson('https://example.com/catalog.gz', undefined, update => updates.push(update)), data);
    const downloads = updates.filter(update => update.phase === 'download');
    assert.equal(downloads.at(-1)?.loaded, zipped.length);
    assert.equal(downloads.at(-1)?.total, knownSize ? zipped.length : undefined);
    assert.ok(downloads.some(update => update.loaded! > 0 && update.loaded! < zipped.length));
    assert.ok(updates.some(update => update.phase === 'unpack'));
    assert.equal(updates.at(-1)?.phase, 'index');
  }
  globalThis.fetch = async () => new Response(zipped, { headers: { 'Content-Length': '10', 'Content-Encoding': 'gzip' } });
  const encodedUpdates: LoadingProgress[] = [];
  await fetchAndDecompressJson('https://example.com/catalog.gz', undefined, update => encodedUpdates.push(update));
  assert.equal(encodedUpdates.filter(update => update.phase === 'download').at(-1)?.total, undefined, 'transport encoding must not create a false percentage');
} finally { globalThis.fetch = originalFetch; }
console.log('Catalog download progress regression checks passed.');
