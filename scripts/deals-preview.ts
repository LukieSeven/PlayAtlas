import fs from 'node:fs';
import path from 'node:path';
import { topPopularDeals } from '../src/utils/dealRanking';
import type { DealsDataset } from '../src/types/deals';

export function writeDealsPreview(directory: string, dataset: DealsDataset): void {
  // Keep a small reserve so an expired highlight can be replaced without
  // downloading the full pricing database. The client still displays ten.
  const deals = topPopularDeals(dataset.deals, 50);
  const file = path.join(directory, 'deals-preview.json');
  fs.writeFileSync(`${file}.tmp`, JSON.stringify({ ...dataset, totalDeals: deals.length, deals }));
  fs.renameSync(`${file}.tmp`, file);
}
