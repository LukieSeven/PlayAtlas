import {
  normalizeSearchQuery,
  tokenizeTitle,
  getTokenBucketKey,
} from '../utils/browserCatalogUtils';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { openIndexedDB } from './indexDbStorage';
import { CompactGameLookupRecord } from '../types/catalog';
import { calculateCatalogImportance } from '../utils/catalogRanking';
import { getDevelopmentCatalogPlugin } from './developmentCatalogPlugin';

export type { CompactGameLookupRecord };

export interface TokenManifestLookupFile {
  file: string;
  firstId: number;
  lastId: number;
  recordCount: number;
  compressedByteSize: number;
  uncompressedByteSize: number;
  sha256: string;
  compression: 'gzip';
}

export interface TokenManifestBucket {
  key: string;
  file: string;
  tokenCount: number;
  postingCount: number;
  compressedByteSize: number;
  uncompressedByteSize: number;
  sha256: string;
  compression: 'gzip';
}

export interface TokenManifest {
  schemaVersion: number;
  generatedAt: string;
  gameCount: number;
  uniqueTokenCount: number;
  lookupFiles: TokenManifestLookupFile[];
  tokenBuckets: TokenManifestBucket[];
  chunkFiles: Record<number, string>;
}

export interface MasterBrowserManifest {
  source: string;
  schemaVersion: number;
  catalogBuildId?: string;
  generatedAt: string;
  catalogRecordCount: number;
  fullCatalogCompressedBytes: number;
  fullCatalogUncompressedBytes: number;
  searchManifest: string;
  releaseManifest: string;
  platformsMetadata: string;
  fullCatalog: {
    chunkCount: number;
    chunks: Array<{
      file: string;
      recordCount: number;
      firstSourceId: number;
      lastSourceId: number;
      compressedByteSize: number;
      uncompressedByteSize: number;
      sha256: string;
      compression: 'gzip';
    }>;
  };
}

export interface SearchPerformanceReport {
  query: string;
  tokenBucketsDownloaded: number;
  postingListIdCount: number;
  lookupFilesRequired: number;
  totalLookupBytesRequired: number;
  numberResultsRanked: number;
  timeToFirst20Ms: number;
  totalColdSearchDownloadBytes: number;
  cachedRepeatDownloadBytes: number;
}

export interface ProgressiveSearchOptions {
  offset?: number;
  limit?: number;
}

export interface ProgressiveSearchResult {
  results: CompactGameLookupRecord[];
  totalMatchingResults: number;
  hasMore: boolean;
  nextOffset: number;
  report: SearchPerformanceReport;
  source?: 'catalog' | 'development_plugin';
}

const cachedTokenBuckets = new Map<string, Record<string, number[]>>();
const cachedLookupFiles = new Map<string, CompactGameLookupRecord[]>();

// Cached ranked search sessions by normalized query
const searchSessionCacheMap = new Map<string, CompactGameLookupRecord[]>();

let masterManifestCache: MasterBrowserManifest | null = null;
let tokenManifestCache: TokenManifest | null = null;
let currentCatalogBuildId: string | null = null;

/**
 * Fetch Master Browser Catalog Manifest (cache: 'no-store') and clear stale caches on build ID change
 */
export async function fetchMasterBrowserManifest(): Promise<MasterBrowserManifest> {
  if (masterManifestCache) return masterManifestCache;

  const manifestUrl = getBasePathAwareUrl('data/browser_catalog_manifest.json');
  const res = await fetch(manifestUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch master browser catalog manifest (${res.status}): ${res.statusText}`);
  }

  masterManifestCache = await res.json();
  const buildId = masterManifestCache?.catalogBuildId || masterManifestCache?.generatedAt || 'v1';

  if (currentCatalogBuildId && currentCatalogBuildId !== buildId) {
    console.log(`🔄 Catalog Build ID changed (${currentCatalogBuildId} -> ${buildId}). Evicting stale search & chunk caches...`);
    cachedTokenBuckets.clear();
    cachedLookupFiles.clear();
    searchSessionCacheMap.clear();
    tokenManifestCache = null;

    try {
      const db = await openIndexedDB();
      const tx = db.transaction('full_chunks', 'readwrite');
      tx.objectStore('full_chunks').clear();
    } catch {
      // Non-critical cache purge error
    }
  }

  currentCatalogBuildId = buildId;
  return masterManifestCache!;
}

/**
 * Fetch Token Search Manifest (Base-Path Aware)
 */
export async function fetchTokenManifest(): Promise<TokenManifest> {
  if (tokenManifestCache) return tokenManifestCache;

  const master = await fetchMasterBrowserManifest();
  const buildIdParam = master.catalogBuildId ? `?v=${encodeURIComponent(master.catalogBuildId)}` : '';
  const searchManifestRel = master.searchManifest || 'search/token_manifest.json';
  const manifestUrl = `${getBasePathAwareUrl(`data/${searchManifestRel}`)}${buildIdParam}`;

  const res = await fetch(manifestUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch token search manifest (${res.status}): ${res.statusText}`);
  }

  tokenManifestCache = await res.json();
  return tokenManifestCache!;
}

/**
 * Fetch & Decompress Token Bucket File (.json.gz, Base-Path Aware with Version Query Parameter)
 */
export async function fetchTokenBucket(hexKey: string): Promise<Record<string, number[]>> {
  if (cachedTokenBuckets.has(hexKey)) {
    return cachedTokenBuckets.get(hexKey)!;
  }

  const master = await fetchMasterBrowserManifest();
  const manifest = await fetchTokenManifest();
  const bucketInfo = manifest.tokenBuckets.find(b => b.key === hexKey);
  const relPath = bucketInfo ? bucketInfo.file : `search/tokens/tokens_${hexKey}.json.gz`;

  const buildIdParam = master.catalogBuildId ? `?v=${encodeURIComponent(master.catalogBuildId)}` : '';
  const bucketUrl = `${getBasePathAwareUrl(`data/${relPath}`)}${buildIdParam}`;

  const bucketObj = await fetchAndDecompressJson<Record<string, number[]>>(
    bucketUrl,
    bucketInfo?.sha256
  );

  cachedTokenBuckets.set(hexKey, bucketObj);
  return bucketObj;
}

/**
 * Fetch & Decompress Compact Game Lookup File (.json.gz, Base-Path Aware with Version Query Parameter)
 */
export async function fetchLookupFile(relPath: string): Promise<CompactGameLookupRecord[]> {
  if (cachedLookupFiles.has(relPath)) {
    return cachedLookupFiles.get(relPath)!;
  }

  const master = await fetchMasterBrowserManifest();
  const manifest = await fetchTokenManifest();
  const lookupInfo = manifest.lookupFiles.find(l => l.file === relPath);

  const buildIdParam = master.catalogBuildId ? `?v=${encodeURIComponent(master.catalogBuildId)}` : '';
  const fileUrl = `${getBasePathAwareUrl(`data/${relPath}`)}${buildIdParam}`;

  const records = await fetchAndDecompressJson<CompactGameLookupRecord[]>(
    fileUrl,
    lookupInfo?.sha256
  );

  cachedLookupFiles.set(relPath, records);
  return records;
}

/**
 * Find candidate compact lookup file for a specific IGDB source ID
 */
export function findLookupFileForId(id: number, lookupFiles: TokenManifestLookupFile[]): TokenManifestLookupFile | null {
  for (const info of lookupFiles) {
    if (id >= info.firstId && id <= info.lastId) {
      return info;
    }
  }
  return null;
}

/**
 * Locates the authoritative compact browser-catalog entry for a numeric game ID
 * using existing lookup index files without loading all catalog records into memory.
 */
export async function resolveCompactRecordByGameId(
  numericId: number
): Promise<CompactGameLookupRecord | null> {
  if (!numericId || typeof numericId !== 'number' || numericId <= 0 || isNaN(numericId)) {
    return null;
  }

  try {
    const manifest = await fetchTokenManifest();
    const lookupInfo = findLookupFileForId(numericId, manifest.lookupFiles);
    if (!lookupInfo) return null;

    const records = await fetchLookupFile(lookupInfo.file);
    const match = records.find(r => r.id === numericId);
    return match || null;
  } catch (err) {
    console.warn(`Failed to resolve compact record for game ID ${numericId}:`, err);
    return null;
  }
}

/** Samples one compact catalog record without downloading the full catalog. */
export async function sampleRandomCatalogGame(random: () => number = Math.random): Promise<CompactGameLookupRecord | null> {
  const developmentPlugin = await getDevelopmentCatalogPlugin();
  if (developmentPlugin) return developmentPlugin.sampleRandom(random());

  const manifest = await fetchTokenManifest();
  const totalRecords = manifest.lookupFiles.reduce((sum, file) => sum + file.recordCount, 0);
  if (totalRecords === 0) return null;

  let target = Math.floor(random() * totalRecords);
  const selectedFile = manifest.lookupFiles.find(file => {
    if (target < file.recordCount) return true;
    target -= file.recordCount;
    return false;
  }) || manifest.lookupFiles[manifest.lookupFiles.length - 1];

  const records = await fetchLookupFile(selectedFile.file);
  return records[Math.min(target, records.length - 1)] || null;
}

function stripLeadingArticle(str: string): string {
  return str.replace(/^(the|a|an)\s+/i, '').trim();
}

/**
 * Game-type numerical priority mapping for deterministic ranking
 */
export function getGameTypePriority(gameType?: string | null): number {
  if (!gameType) return 1;
  const gt = gameType.toLowerCase();
  if (gt === 'main_game') return 10;
  if (gt === 'remake') return 9;
  if (gt === 'remaster') return 8;
  if (gt === 'expanded_game') return 7;
  if (gt === 'standalone_expansion') return 6;
  if (gt === 'port') return 5;
  if (gt === 'expansion') return 4;
  if (gt === 'dlc_addon') return 3;
  if (gt === 'bundle' || gt === 'pack') return 2;
  return 1;
}

/**
 * Compares two records deterministically using lexical relevance bands,
 * durable catalog importance, and stable legacy fallbacks:
 * 1. Exact normalized title
 * 2. Exact title ignoring leading 'The', 'A', 'An'
 * 3. Complete phrase appears in a primary or alternative title
 * 4. Query tokens appear in title order
 * 5. Catalog importance signals
 * 6. Default visibility and game-type priority
 * 7. Title distance, release year, title, and numeric ID
 */
export function compareRecordsDeterministic(
  a: CompactGameLookupRecord,
  b: CompactGameLookupRecord,
  normQuery: string,
  tokens: string[]
): number {
  const normalizedTitles = (record: CompactGameLookupRecord): string[] => [
    normalizeSearchQuery(record.name),
    ...(record.alternativeNames || []).map(normalizeSearchQuery),
  ].filter(Boolean);
  const titlesA = normalizedTitles(a);
  const titlesB = normalizedTitles(b);
  const normTitleA = titlesA[0];
  const normTitleB = titlesB[0];

  const strippedQuery = stripLeadingArticle(normQuery);

  // Tier 1: Exact normalized title
  const exactA = titlesA.some(title => title === normQuery);
  const exactB = titlesB.some(title => title === normQuery);
  if (exactA !== exactB) return exactA ? -1 : 1;

  // Tier 2: Exact title ignoring leading article
  const articleA = titlesA.some(title => stripLeadingArticle(title) === strippedQuery);
  const articleB = titlesB.some(title => stripLeadingArticle(title) === strippedQuery);
  if (articleA !== articleB) return articleA ? -1 : 1;

  // Phrase position is deliberately not a separate tier. Otherwise a low-value
  // derivative title beginning with the query can outrank a stronger published game.
  const phraseA = titlesA.some(title => title.includes(normQuery));
  const phraseB = titlesB.some(title => title.includes(normQuery));
  if (phraseA !== phraseB) return phraseA ? -1 : 1;

  // Tier 5: Query tokens appear in title order
  const inOrderTokens = (normTitle: string) => {
    let lastPos = -1;
    for (const t of tokens) {
      const pos = normTitle.indexOf(t);
      if (pos === -1 || pos < lastPos) return false;
      lastPos = pos;
    }
    return true;
  };
  const orderA = titlesA.some(inOrderTokens);
  const orderB = titlesB.some(inOrderTokens);
  if (orderA !== orderB) return orderA ? -1 : 1;

  // Rank durable importance inside the same lexical relevance band.
  const importanceA = calculateCatalogImportance(a);
  const importanceB = calculateCatalogImportance(b);
  if (importanceA !== importanceB) return importanceB - importanceA;

  // Backward-compatible fallbacks for legacy compact records without signals.
  if (a.defaultVisible !== b.defaultVisible) return a.defaultVisible ? -1 : 1;

  // Tier 7: Game-type priority
  const prioA = getGameTypePriority(a.gameType);
  const prioB = getGameTypePriority(b.gameType);
  if (prioA !== prioB) return prioB - prioA;

  // Tier 8: Shorter title distance from query
  const distA = Math.abs(normTitleA.length - normQuery.length);
  const distB = Math.abs(normTitleB.length - normQuery.length);
  if (distA !== distB) return distA - distB;

  // Tier 9: Release year descending
  const yearA = a.year || 0;
  const yearB = b.year || 0;
  if (yearA !== yearB) return yearB - yearA;

  // Tier 10: Alphabetical normalized title
  const alphaComp = normTitleA.localeCompare(normTitleB);
  if (alphaComp !== 0) return alphaComp;

  // Tier 11: Numeric IGDB ID as final stable tie-breaker
  return a.id - b.id;
}

export function calculateRankScore(
  title: string,
  queryStr: string,
  tokens: string[] = [],
  defaultVisible: boolean = true
): number {
  const normTitle = normalizeSearchQuery(title);
  const normQuery = normalizeSearchQuery(queryStr);
  let score = 0;

  if (normTitle === normQuery) {
    score += 2000;
  } else if (normTitle.startsWith(normQuery) || normTitle.startsWith(`the ${normQuery}`)) {
    score += 1000;
  } else if (normTitle.includes(normQuery)) {
    score += 500;
  }

  const titleTokens = tokenizeTitle(normTitle);
  const queryTokens = tokens.length > 0 ? tokens : tokenizeTitle(normQuery);
  const matchingTokens = queryTokens.filter(t => titleTokens.includes(t));
  score += matchingTokens.length * 100;

  const lengthPenalty = Math.max(0, normTitle.length - normQuery.length);
  score -= lengthPenalty * 2;

  if (defaultVisible) score += 50;
  return score;
}

/**
 * Progressive Batching Search Execution Engine with Deterministic 11-Tier Ranking & Session Caching
 */
export async function executeProgressiveTokenSearch(
  queryStr: string,
  options?: ProgressiveSearchOptions | number
): Promise<ProgressiveSearchResult> {
  const startTime = Date.now();

  let offset = 0;
  let limit = 20;

  if (typeof options === 'number') {
    limit = options;
  } else if (options && typeof options === 'object') {
    if (typeof options.offset === 'number') offset = options.offset;
    if (typeof options.limit === 'number') limit = options.limit;
  }

  const developmentPlugin = await getDevelopmentCatalogPlugin();
  if (developmentPlugin) {
    const previewResults = developmentPlugin.search(queryStr);
    const pageSlice = previewResults.slice(offset, offset + limit);
    return {
      results: pageSlice,
      totalMatchingResults: previewResults.length,
      hasMore: offset + pageSlice.length < previewResults.length,
      nextOffset: offset + pageSlice.length,
      source: 'development_plugin',
      report: {
        query: queryStr,
        tokenBucketsDownloaded: 0,
        postingListIdCount: previewResults.length,
        lookupFilesRequired: 0,
        totalLookupBytesRequired: 0,
        numberResultsRanked: previewResults.length,
        timeToFirst20Ms: Date.now() - startTime,
        totalColdSearchDownloadBytes: 0,
        cachedRepeatDownloadBytes: 0,
      },
    };
  }

  const tokens = tokenizeTitle(queryStr);
  const normQuery = normalizeSearchQuery(queryStr);

  if (tokens.length === 0) {
    return {
      results: [],
      totalMatchingResults: 0,
      hasMore: false,
      nextOffset: 0,
      report: {
        query: queryStr,
        tokenBucketsDownloaded: 0,
        postingListIdCount: 0,
        lookupFilesRequired: 0,
        totalLookupBytesRequired: 0,
        numberResultsRanked: 0,
        timeToFirst20Ms: 0,
        totalColdSearchDownloadBytes: 0,
        cachedRepeatDownloadBytes: 0,
      },
    };
  }

  // --- CHECK SEARCH SESSION CACHE ---
  if (searchSessionCacheMap.has(normQuery)) {
    const fullRankedRecords = searchSessionCacheMap.get(normQuery)!;
    const pageSlice = fullRankedRecords.slice(offset, offset + limit);

    return {
      results: pageSlice,
      totalMatchingResults: fullRankedRecords.length,
      hasMore: offset + pageSlice.length < fullRankedRecords.length,
      nextOffset: offset + pageSlice.length,
      report: {
        query: queryStr,
        tokenBucketsDownloaded: 0,
        postingListIdCount: fullRankedRecords.length,
        lookupFilesRequired: 0,
        totalLookupBytesRequired: 0,
        numberResultsRanked: fullRankedRecords.length,
        timeToFirst20Ms: Date.now() - startTime,
        totalColdSearchDownloadBytes: 0,
        cachedRepeatDownloadBytes: 0,
      },
    };
  }

  const manifest = await fetchTokenManifest();
  const bucketKeys = await Promise.all(tokens.map(t => getTokenBucketKey(t)));
  const requiredBucketKeys = Array.from(new Set(bucketKeys));

  let tokenBucketsDownloaded = 0;
  let totalTokenBytesDownloaded = 0;

  // 1. Load & Decompress Token Buckets
  const postingsMap = new Map<string, number[]>();

  for (const bucketKey of requiredBucketKeys) {
    const isCached = cachedTokenBuckets.has(bucketKey);
    const bucketObj = await fetchTokenBucket(bucketKey);
    if (!isCached) {
      tokenBucketsDownloaded++;
      const bucketInfo = manifest.tokenBuckets.find(b => b.key === bucketKey);
      if (bucketInfo) totalTokenBytesDownloaded += bucketInfo.compressedByteSize;
    }

    for (const t of tokens) {
      if (bucketObj[t]) {
        postingsMap.set(t, bucketObj[t]);
      }
    }
  }

  // 2. TRUE MULTI-TOKEN INTERSECTION
  for (const t of tokens) {
    if (!postingsMap.has(t) || (postingsMap.get(t) || []).length === 0) {
      searchSessionCacheMap.set(normQuery, []);
      return {
        results: [],
        totalMatchingResults: 0,
        hasMore: false,
        nextOffset: 0,
        report: {
          query: queryStr,
          tokenBucketsDownloaded,
          postingListIdCount: 0,
          lookupFilesRequired: 0,
          totalLookupBytesRequired: 0,
          numberResultsRanked: 0,
          timeToFirst20Ms: Date.now() - startTime,
          totalColdSearchDownloadBytes: totalTokenBytesDownloaded,
          cachedRepeatDownloadBytes: 0,
        },
      };
    }
  }

  // Sort posting lists from shortest to longest to optimize set intersection
  const postingLists = tokens.map(t => postingsMap.get(t)!).sort((a, b) => a.length - b.length);

  let intersectedIds = postingLists[0];
  for (let i = 1; i < postingLists.length; i++) {
    const set = new Set(postingLists[i]);
    intersectedIds = intersectedIds.filter(id => set.has(id));
  }

  const postingListIdCount = intersectedIds.length;

  // 3. Group Intersected Candidate IDs by Lookup File
  const fileToIdsMap = new Map<string, number[]>();
  const fileInfoMap = new Map<string, TokenManifestLookupFile>();

  for (const id of intersectedIds) {
    const fileInfo = findLookupFileForId(id, manifest.lookupFiles);
    if (fileInfo) {
      if (!fileToIdsMap.has(fileInfo.file)) {
        fileToIdsMap.set(fileInfo.file, []);
        fileInfoMap.set(fileInfo.file, fileInfo);
      }
      fileToIdsMap.get(fileInfo.file)!.push(id);
    }
  }

  // 4. Batch Loading & Decompression of Compact Lookup Files for ALL intersected matches
  const loadedLookupRecords: CompactGameLookupRecord[] = [];
  let lookupFilesRequired = 0;
  let totalLookupBytesRequired = 0;

  for (const relPath of fileToIdsMap.keys()) {
    const isCached = cachedLookupFiles.has(relPath);
    const fileRecords = await fetchLookupFile(relPath);
    const fileInfo = fileInfoMap.get(relPath);

    if (!isCached) {
      lookupFilesRequired++;
      if (fileInfo) totalLookupBytesRequired += fileInfo.compressedByteSize;
    }

    const idsInFile = new Set(fileToIdsMap.get(relPath)!);
    for (const r of fileRecords) {
      if (idsInFile.has(r.id)) {
        loadedLookupRecords.push(r);
      }
    }
  }

  // 5. Deterministically Rank All Intersected Results using the 11-Tier Ranker
  loadedLookupRecords.sort((a, b) => compareRecordsDeterministic(a, b, normQuery, tokens));

  // Store complete ranked list in session cache
  searchSessionCacheMap.set(normQuery, loadedLookupRecords);

  const pageSlice = loadedLookupRecords.slice(offset, offset + limit);

  const timeToFirst20Ms = Date.now() - startTime;
  const totalColdSearchDownloadBytes = totalTokenBytesDownloaded + totalLookupBytesRequired;

  return {
    results: pageSlice,
    totalMatchingResults: postingListIdCount,
    hasMore: offset + pageSlice.length < loadedLookupRecords.length,
    nextOffset: offset + pageSlice.length,
    report: {
      query: queryStr,
      tokenBucketsDownloaded,
      postingListIdCount,
      lookupFilesRequired,
      totalLookupBytesRequired,
      numberResultsRanked: loadedLookupRecords.length,
      timeToFirst20Ms,
      totalColdSearchDownloadBytes,
      cachedRepeatDownloadBytes: 0,
    },
  };
}
