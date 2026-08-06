import fs from 'node:fs';

let passed = 0;
let failed = 0;
const assert = (condition: boolean, name: string) => condition ? (passed++, console.log(`  PASS: ${name}`)) : (failed++, console.error(`  FAIL: ${name}`));

console.log('Running About Page Tests...');
const page = fs.readFileSync(new URL('../src/pages/AboutPage.tsx', import.meta.url), 'utf8');
const sidebar = fs.readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert(app.includes('path="about"'), 'About page is routed');
assert(sidebar.indexOf('to="/about"') < sidebar.indexOf('to="/settings"'), 'About appears immediately above Settings');
assert(page.includes('https://discord.gg/9vGY6kQTd'), 'About includes the requested Discord invitation');
assert(page.includes('https://bsky.app/profile/playatlas.bsky.social') && page.includes('@playatlas.bsky.social'), 'About includes the official Bluesky profile and handle');
assert(page.includes('https://x.com/PlayAtlasX') && page.includes('@PlayAtlasX'), 'About includes the official X profile and handle');
assert(page.includes('https://www.youtube.com/@PlayAtlasOfficial'), 'About includes the official YouTube profile');
assert(page.includes('https://www.reddit.com/user/PlayAtlasOfficial/') && page.includes('u/PlayAtlasOfficial'), 'About includes the official Reddit profile and handle');
assert(page.includes('Events for Gamers with IGDB enrichment'), 'About credits the merged event providers');
assert(page.includes('IGDB is operated by Twitch'), 'About credits the catalog provider');
assert(page.includes('respective owners'), 'About includes a general trademark ownership notice');
assert(page.includes('Play Atlas™'), 'About identifies Play Atlas with a trademark symbol');
assert(!page.includes('©'), 'About does not claim copyright ownership for Play Atlas branding');
assert(page.includes('Built as the gaming organizer I wanted, when none were seemingly available. If you want something done right...'), 'About includes the requested creator statement');
assert(page.includes('— LukieSeven'), 'About includes the creator sign-off');

console.log(`About Page results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
