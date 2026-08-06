import fs from 'node:fs';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, name: string) => {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.error(`  FAIL: ${name}`); }
};

console.log('Running Home Catalog Widget Tests...');
const source = fs.readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');

assert(source.includes('getNewReleases(10)'), 'New Releases widget loads ten recent releases');
assert(source.includes('getUpcomingGames(10)'), 'MUG widget independently loads ten upcoming games');
assert(source.includes("'upcoming' | 'events'"), 'MUG is a first-class system Home widget');
assert(source.includes("visible: ['featured', 'upcoming', 'releases', 'deals', 'events']"), 'fresh Home layouts include MUG by default');
assert(source.includes('getEventsCatalog()'), 'Events widget loads the published Events JSON service');
assert(source.includes('upcomingEvents.map'), 'Events widget renders future event records');
assert(source.includes("if (source === 'system:releases') return recentReleases"), 'New Releases settings resolve only the recent feed');
assert(source.includes("if (source === 'system:upcoming' || source === 'system:featured') return upcomingGames"), 'MUG and Featured settings resolve the upcoming feed');

console.log(`Home Catalog Widget results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
