import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildCompactRankSignals, calculateCatalogImportance } from '../src/utils/catalogRanking';
import type { CompactGameLookupRecord } from '../src/types/catalog';

export function mapCatalogFacetRecord(record: any, chunk: number): CompactGameLookupRecord {
  const names = (items: any[]) => [...new Set((items ?? []).map(item => typeof item === 'string' ? item : item?.name).filter(Boolean))] as string[];
  const rank = buildCompactRankSignals(record);
  const game: CompactGameLookupRecord = {
    id: record.sourceId ?? Number(String(record.id).replace(/^igdb[:_]/, '')), name: record.name,
    gameType: record.gameType, defaultVisible: record.defaultVisible, chunk,
    year: record.firstReleaseDate ? Number(record.firstReleaseDate.slice(0, 4)) : null,
    coverUrl: record.coverUrl, genres: names(record.genres), platforms: names(record.platforms),
    developers: names((record.companies ?? []).filter((company: any) => company.developer)),
    publishers: names((record.companies ?? []).filter((company: any) => company.publisher)),
    franchises: names([...(record.franchises ?? []), ...(record.collections ?? [])]), alternativeNames: names(record.alternativeNames),
    rating: rank.totalRating ?? rank.userRating ?? rank.criticRating, rank,
  };
  game.developer = game.developers?.[0];
  game.catalogImportance = calculateCatalogImportance(game);
  delete game.rank;
  return game;
}

export function buildCatalogFacets(directory: string, suppliedRecords?: CompactGameLookupRecord[]): void {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'browser_catalog_manifest.json'), 'utf8'));
  const records = suppliedRecords ?? manifest.fullCatalog.chunks.flatMap((chunk: { file: string }, index: number) => {
    const bytes = fs.readFileSync(path.join(directory, chunk.file));
    const data = JSON.parse((chunk.file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes).toString('utf8'));
    return data.map((record: unknown) => mapCatalogFacetRecord(record, Number(path.basename(chunk.file).match(/_(\d+)\.json/)?.[1]) || index + 1));
  });
  records.sort((a: CompactGameLookupRecord, b: CompactGameLookupRecord) => (b.catalogImportance ?? 0) - (a.catalogImportance ?? 0) || a.name.localeCompare(b.name) || a.id - b.id);
  const output = path.join(directory, 'catalog-facets.json.gz');
  fs.writeFileSync(`${output}.tmp`, zlib.gzipSync(JSON.stringify({ schemaVersion: 1, catalogBuildId: manifest.catalogBuildId, records }), { level: 9 }));
  fs.renameSync(`${output}.tmp`, output);
  console.log(`Generated filter metadata for ${records.length} catalog games.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildCatalogFacets(process.argv[2] || 'public/data');
