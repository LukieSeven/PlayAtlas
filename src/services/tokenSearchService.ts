import {
  normalizeSearchQuery,
  tokenizeTitle,
  getTokenBucketKey,
} from '../utils/browserCatalogUtils';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { CompactGameLookupRecord } from '../../scripts/build-browser-catalog';
import { openIndexedDB } from './indexDbStorage';

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

const cachedTokenBuckets = new Map<string, Record<string, number[]>>();
const cachedLookupFiles = new Map<string, CompactGameLookupRecord[]>();

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

function stripLeadingArticle(str: string): string {
  return str.replace(/^(the|a|an)\s+/i, '').trim();
}

/**
 * Calculate ranking score according to strict priority order:
 * 1. Exact normalized title
 * 2. Exact title after ignoring leading 'The', 'A', 'An'
 * 3. Full normalized phrase match
 * 4. All query tokens matched in title order
 * 5. Title begins with the query
 * 6. Main/default-visible game
 * 7. Remaining token matches
 */
export function calculateRankScore(
  recordName: string,
  normQuery: string,
  tokens: string[],
  defaultVisible: boolean
): number {
  const normTitle = normalizeSearchQuery(recordName);
  const strippedTitle = stripLeadingArticle(normTitle);
  const strippedQuery = stripLeadingArticle(normQuery);

  let score = 0;

  // 1. Exact normalized title match
  if (normTitle === normQuery) {
    score += 100000;
  }
  // 2. Exact title match after ignoring leading article (The / A / An)
  else if (strippedTitle === strippedQuery) {
    score += 80000;
  }
  // 3. Full normalized phrase match
  else if (normTitle.includes(normQuery)) {
    score += 50000;
  }

  // 4. All query tokens matched in title order
  let inOrder = true;
  let lastPos = -1;
  for (const token of tokens) {
    const pos = normTitle.indexOf(token);
    if (pos === -1 || pos < lastPos) {
      inOrder = false;
      break;
    }
    lastPos = pos;
  }
  if (inOrder) {
    score += 30000;
  }

  // 5. Title begins with the query (or stripped title begins with stripped query)
  if (normTitle.startsWith(normQuery) || (strippedQuery && strippedTitle.startsWith(strippedQuery))) {
    score += 15000;
  }

  // 6. Main / default-visible game
  if (defaultVisible) {
    score += 5000;
  }

  // 7. Tie-breaker: shorter titles rank higher for conciseness
  score += Math.max(0, 1000 - normTitle.length);

  return score;
}

/**
 * Progressive Batching Search Execution Engine with True Multi-Token Posting List Intersection
 */
export async function executeProgressiveTokenSearch(
  queryStr: string,
  targetResultCount: number = 40
): Promise<{
  results: CompactGameLookupRecord[];
  report: SearchPerformanceReport;
}> {
  const startTime = Date.now();
  const tokens = tokenizeTitle(queryStr);
  const normQuery = normalizeSearchQuery(queryStr);

  if (tokens.length === 0) {
    return {
      results: [],
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
      return {
        results: [],
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

  let candidateIds = intersectedIds;
  if (candidateIds.length > 5000) {
    candidateIds = candidateIds.slice(0, 5000);
  }

  // 3. Group Candidate IDs by Lookup File
  const fileToIdsMap = new Map<string, number[]>();
  const fileInfoMap = new Map<string, TokenManifestLookupFile>();

  for (const id of candidateIds) {
    const fileInfo = findLookupFileForId(id, manifest.lookupFiles);
    if (fileInfo) {
      if (!fileToIdsMap.has(fileInfo.file)) {
        fileToIdsMap.set(fileInfo.file, []);
        fileInfoMap.set(fileInfo.file, fileInfo);
      }
      fileToIdsMap.get(fileInfo.file)!.push(id);
    }
  }

  // Sort lookup files by ID density descending
  const sortedFiles = Array.from(fileToIdsMap.keys()).sort(
    (a, b) => (fileToIdsMap.get(b)?.length || 0) - (fileToIdsMap.get(a)?.length || 0)
  );

  // 4. Progressive Batch Loading & Decompression of Compact Lookup Files
  const loadedLookupRecords: CompactGameLookupRecord[] = [];
  let lookupFilesRequired = 0;
  let totalLookupBytesRequired = 0;

  for (const relPath of sortedFiles) {
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

    if (loadedLookupRecords.length >= Math.max(targetResultCount * 3, 120)) {
      break;
    }
  }

  // 5. Rank Loaded Results with Enhanced Priority Order
  const rankedResults: Array<{ record: CompactGameLookupRecord; score: number }> = [];

  for (const r of loadedLookupRecords) {
    const score = calculateRankScore(r.name, normQuery, tokens, r.defaultVisible);
    rankedResults.push({ record: r, score });
  }

  rankedResults.sort((a, b) => b.score - a.score);
  const finalResults = rankedResults.slice(0, targetResultCount).map(item => item.record);

  const timeToFirst20Ms = Date.now() - startTime;
  const totalColdSearchDownloadBytes = totalTokenBytesDownloaded + totalLookupBytesRequired;

  return {
    results: finalResults,
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
