import fs from 'node:fs';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, name: string) => condition ? (passed++, console.log(`  PASS: ${name}`)) : (failed++, console.error(`  FAIL: ${name}`));

console.log('Running Searchable List View Tests...');
const grid = fs.readFileSync(new URL('../src/components/widgets/GameListGrid.tsx', import.meta.url), 'utf8');
const card = fs.readFileSync(new URL('../src/components/common/GameCard.tsx', import.meta.url), 'utf8');

assert(grid.includes("variant={viewMode === 'list' ? 'list' : 'card'}"), 'shared searchable grid selects compact list presentation');
assert(card.includes("variant?: 'card' | 'list'"), 'game card exposes an explicit list presentation');
assert(card.includes("if (variant === 'list')"), 'list presentation uses dedicated compact row markup');
assert(card.includes('h-20 w-14'), 'list artwork remains thumbnail sized');
assert(card.includes('primaryPlatforms.join'), 'list rows retain platform details');
assert(card.includes('genresDisplay.slice'), 'list rows retain genre details');
assert(card.includes('handleLikeToggle') && card.includes('handleYuckToggle') && card.includes('UniversalActionMenu'), 'list rows retain standard game actions');

console.log(`Searchable List View results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
