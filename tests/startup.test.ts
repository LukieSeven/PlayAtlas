import assert from 'node:assert/strict';
import { startupTasks, prepareStartup } from '../src/services/startupService';

assert.equal(startupTasks('/settings').length, 1);
assert.equal(startupTasks('/my-games').length, 1);
assert.equal(startupTasks('/search')[1].label, 'Preparing catalog search');
assert.equal(startupTasks('/discounts')[1].label, 'Loading current deals');
assert.equal(startupTasks('/upcoming')[1].label, 'Discovering upcoming games');
assert.equal(startupTasks('/')[1].optional, true);
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ schemaVersion: 2, visible: [] }) } });
  assert.equal(startupTasks('/').length, 1);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ schemaVersion: 2, visible: ['deals'] }) } });
  assert.equal(startupTasks('/')[1].label, 'Loading deal highlights');
} finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); }
const ready: number[] = [];
await prepareStartup([{ label: 'Required', load: async () => {} }, { label: 'Optional', optional: true, load: async () => { throw new Error('Unavailable feed'); } }], index => ready.push(index));
assert.deepEqual(ready.sort(), [0, 1]);
await assert.rejects(() => prepareStartup([{ label: 'Required', load: async () => { throw new Error('Offline'); } }], () => {}));
let release!: () => void;
let finished = false;
const held = new Promise<void>(resolve => { release = resolve; });
const pending = prepareStartup([{ label: 'Held download', load: () => held }], () => {}).then(() => { finished = true; });
await Promise.resolve();
assert.equal(finished, false);
release(); await pending;
assert.equal(finished, true);
console.log('Startup tests: 12 passed, 0 failed.');
