import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pageSource = fs.readFileSync(path.join(__dirname, '../src/pages/NewReleasesPage.tsx'), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS: ${description}`);
  } else {
    failed += 1;
    console.error(`  FAIL: ${description}`);
  }
}

console.log('Running New Releases range regression tests...');
assert(pageSource.includes("useState<TimeFrame>('day')"), 'New Releases defaults to Today');
assert(pageSource.includes('timeframe,'), 'selected timeframe is passed directly to the release catalog query');
assert(!pageSource.includes("timeframe === 'day' ? 'past_30_days'"), 'Today is not incorrectly expanded to the past 30 days');
assert(pageSource.includes("setTimeframe('day')"), 'Today control selects the exact-day bucket');
assert(pageSource.includes("setTimeframe('week')"), 'This Week control selects the rolling seven-day bucket');
assert(pageSource.includes("setTimeframe('month')"), 'This Month control selects the month-to-date bucket');
assert(pageSource.includes('viewType,'), 'release-basis toggle participates in rebuilding the catalog bucket');

console.log(`New Releases results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
