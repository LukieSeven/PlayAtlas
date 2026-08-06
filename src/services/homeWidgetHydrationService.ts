import { CompactGameLookupRecord } from '../types/catalog';
import { hydrateCompactRecordsBatch } from './catalogDetailService';
import { fetchMasterBrowserManifest, resolveCompactRecordByGameId } from './tokenSearchService';

const authoritativeHomeCache = new Map<string, CompactGameLookupRecord>();

export async function hydrateHomeWidgetGames(
  records: CompactGameLookupRecord[],
): Promise<CompactGameLookupRecord[]> {
  if (records.length === 0) return [];

  // Plugin-owned negative IDs are already complete local fixtures.
  if (records.every(record => record.id < 0)) return records;

  const productionRecords = records.filter(record => record.id > 0);
  if (productionRecords.length === 0) return records;

  const manifest = await fetchMasterBrowserManifest();
  const buildId = manifest.catalogBuildId || manifest.generatedAt || 'v1';

  const authoritative = await Promise.all(records.map(async record => {
    if (record.id <= 0) return record;
    const key = `${buildId}:${record.id}`;
    const cached = authoritativeHomeCache.get(key);
    if (cached) return cached;

    const resolved = await resolveCompactRecordByGameId(record.id);
    const candidate = resolved ? { ...record, ...resolved } : record;
    authoritativeHomeCache.set(key, candidate);
    return candidate;
  }));

  const hydrated = await hydrateCompactRecordsBatch(authoritative);
  hydrated.forEach(record => {
    if (record.id > 0) authoritativeHomeCache.set(`${buildId}:${record.id}`, record);
  });
  return hydrated;
}
