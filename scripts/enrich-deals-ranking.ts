import { buildCatalogFacets } from './build-catalog-facets';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { calculateDealPopularity } from '../src/utils/catalogRanking';
import type { CompactGameLookupRecord } from '../src/types/catalog';
import type { DealsDataset } from '../src/types/deals';
import { writeDealsPreview } from './deals-preview';

/** Add ranks to existing prices without calling ITAD or reimporting IGDB. */
export function enrichDealsRanking(directory: string): void {
  const read = (file: string) => {
    const bytes = fs.readFileSync(path.join(directory, file));
    return JSON.parse((file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes).toString('utf8'));
  };
  const master = read('browser_catalog_manifest.json');
  const manifest = read(master.searchManifest || 'search/token_manifest.json');
  const scores = new Map<number, number>();
  for (const lookup of manifest.lookupFiles) {
    const records: CompactGameLookupRecord[] = read(lookup.file);
    for (const record of records) scores.set(record.id, calculateDealPopularity(record));
  }
  buildCatalogFacets(directory);
  const dataset: DealsDataset = read('deals.json');
  for (const deal of dataset.deals) deal.popularityScore = scores.get(deal.gameId) ?? 0;
  const output = path.join(directory, 'deals.json');
  fs.writeFileSync(`${output}.tmp`, JSON.stringify(dataset));
  fs.renameSync(`${output}.tmp`, output);
  writeDealsPreview(directory, dataset);
  console.log(`Enriched popularity for ${dataset.deals.length} existing prices.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { enrichDealsRanking(process.argv[2] || 'public/data'); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
