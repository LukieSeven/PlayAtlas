import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { mapCatalogFacetRecord, buildCatalogFacets } from '../scripts/build-catalog-facets';
import { emptyGameFilters, matchesGameFilters, matchesCatalogQuery } from '../src/utils/catalogFacets';
import { sortCatalogGames } from '../src/utils/gameListControls';
import type { PersonalGameRecord } from '../src/types/personal';

const game = mapCatalogFacetRecord({ sourceId: 6, name: 'Pokémon Adventures', gameType: 'main_game', firstReleaseDate: '2024-01-01',
  genres: [{ name: 'Role-playing (RPG)' }], platforms: [{ name: 'Nintendo Switch' }], franchises: [{ name: 'Pokémon' }],
  companies: [{ name: 'Game Freak', developer: true }, { name: 'Nintendo', publisher: true }],
  alternativeNames: [{ name: 'Pocket Monsters Adventures' }], totalRating: 90, totalRatingCount: 4000,
}, 7);
assert.deepEqual(game.developers, ['Game Freak']);
assert.deepEqual(game.publishers, ['Nintendo']);
assert.equal(game.chunk, 7);
assert.equal(game.rating, 9);
assert.ok((game.catalogImportance ?? 0) > 0);
assert.equal(game.rank, undefined);
assert.ok(matchesGameFilters(game, { ...emptyGameFilters, genre: 'rpg', platform: 'switch', developer: 'FREAK', publisher: 'nintendo', franchise: 'pokemon', gameType: 'main_game', ownership: 'unowned' }));
assert.ok(!matchesGameFilters(game, { ...emptyGameFilters, developer: 'Nintendo' }));
assert.ok(!matchesGameFilters({ id: 130, name: 'Unknown metadata' }, { ...emptyGameFilters, platform: 'switch' }));
assert.ok(!matchesGameFilters(game, { ...emptyGameFilters, gameType: 'dlc_addon' }));
const personal = { ownerships: [{ ownershipType: 'physical' }] } as PersonalGameRecord;
assert.ok(matchesGameFilters(game, { ...emptyGameFilters, ownership: 'owned' }, personal));
assert.ok(matchesGameFilters(game, { ...emptyGameFilters, ownership: 'physical' }, personal));
assert.ok(!matchesGameFilters(game, { ...emptyGameFilters, ownership: 'digital' }, personal));
assert.ok(!matchesGameFilters(game, { ...emptyGameFilters, ownership: 'unowned' }, personal));
assert.ok(matchesCatalogQuery(game, 'pocket adventures'));
assert.ok(matchesCatalogQuery(game, 'pokemon'));
assert.ok(!matchesCatalogQuery(game, 'pocket racing'));
const unknown = { id: 99, name: 'Unknown date' };
assert.equal(sortCatalogGames([unknown, game], 'yearAsc').at(-1)?.id, 99);
assert.equal(sortCatalogGames([unknown, game], 'yearDesc').at(-1)?.id, 99);
assert.equal(sortCatalogGames([unknown, game], 'popularity')[0].id, 6);
assert.equal(sortCatalogGames([unknown, game], 'rating')[0].id, 6);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-facets-'));
try {
  fs.writeFileSync(path.join(directory, 'browser_catalog_manifest.json'), JSON.stringify({ catalogBuildId: 'fixture', fullCatalog: { chunks: [{ file: 'game_index_7.json.gz' }] } }));
  fs.writeFileSync(path.join(directory, 'game_index_7.json.gz'), zlib.gzipSync(JSON.stringify([{ sourceId: 6, name: 'Fixture', companies: [{ name: 'Studio', developer: true }] }])));
  buildCatalogFacets(directory);
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory, 'catalog-facets.json.gz'))).toString());
  assert.equal(data.catalogBuildId, 'fixture');
  assert.equal(data.records[0].chunk, 7);
  assert.deepEqual(data.records[0].developers, ['Studio']);
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
console.log('Catalog facet tests: 24 passed, 0 failed.');
