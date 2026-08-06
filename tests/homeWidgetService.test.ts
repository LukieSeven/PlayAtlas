const memory = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
};

import {
  createDefaultWidgetConfiguration,
  loadHomeWidgetConfigurations,
  resolveWidgetConfiguration,
  saveHomeWidgetConfigurations,
} from '../src/services/homeWidgetService';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, message: string) => {
  if (condition) { passed++; console.log(`  PASS: ${message}`); }
  else { failed++; console.error(`  FAIL: ${message}`); }
};

console.log('Running Home Widget Service Tests...');

const listDefaults = createDefaultWidgetConfiguration('list:favorites', 'Favorites');
assert(listDefaults.display.presentation === 'list', 'Saved lists default to list presentation');
assert(listDefaults.display.itemLimit === 6, 'Widgets receive a bounded default item count');
assert(createDefaultWidgetConfiguration('releases', 'New Releases').display.itemLimit === 10, 'New Releases defaults to ten items');
assert(createDefaultWidgetConfiguration('upcoming', 'Major Upcoming Games').display.itemLimit === 10, 'Major Upcoming Games defaults to ten items');

const customized = {
  ...listDefaults,
  title: 'My Classics',
  display: { ...listDefaults.display, presentation: 'carousel' as const, itemLimit: 10 },
};
saveHomeWidgetConfigurations({ 'list:favorites': customized });
const loaded = loadHomeWidgetConfigurations();
assert(loaded['list:favorites'].title === 'My Classics', 'Widget title persists');
assert(loaded['list:favorites'].display.presentation === 'carousel', 'Presentation persists independently of content');
assert(loaded['list:favorites'].display.itemLimit === 10, 'Item limit persists');

const partial = resolveWidgetConfiguration({ releases: { title: 'Launches', display: { presentation: 'grid' } as any } }, 'releases', 'New Releases');
assert(partial.display.showArtwork === true, 'Stored settings merge with safe display defaults');
assert(partial.display.presentation === 'grid', 'Stored presentation overrides its default');

memory.set('playatlas_home_widget_configuration_v2', '{broken');
assert(Object.keys(loadHomeWidgetConfigurations()).length === 0, 'Malformed settings fail safely without breaking Home');

console.log(`\nHome Widget Service Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
