import {
  normalizeSearchQuery,
  tokenizeTitle,
  getTokenBucketKey,
} from '../utils/browserCatalogUtils';
import { fetchAndDecompressJson } from '../utils/decompression';
import { getBasePathAwareUrl } from './catalogDataSource';
import { CompactGameLookupRecord } from '../../scripts/build-browser-catalog';

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
let tokenManifestCache: TokenManifest | null = null;

/**
 * Fetch Token Search Manifest (Base-Path Aware)
 */
export async function fetchTokenManifest(): Promise<TokenManifest> {
  if (tokenManifestCache) return tokenManifestCache;

  const manifestUrl = getBasePathAwareUrl('data/search/token_manifest.json');
  const res = await fetch(manifestUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch token search manifest (${res.status}): ${res.statusText}`);
  }

  tokenManifestCache = await res.json();
  return tokenManifestCache!;
}

/**
 * Fetch & Decompress Token Bucket File (.json.gz, Base-Path Aware)
 */
export async function fetchTokenBucket(hexKey: string): Promise<Record<string, number[]>> {
  if (cachedTokenBuckets.has(hexKey)) {
    return cachedTokenBuckets.get(hexKey)!;
  }

  const manifest = await fetchTokenManifest();
  const bucketInfo = manifest.tokenBuckets.find(b => b.key === hexKey);
  const relPath = bucketInfo ? bucketInfo.file : `search/tokens/tokens_${hexKey}.json.gz`;

  const bucketUrl = getBasePathAwareUrl(`data/${relPath}`);
  const bucketObj = await fetchAndDecompressJson<Record<string, number[]>>(
    bucketUrl,
    bucketInfo?.sha256
  );

  cachedTokenBuckets.set(hexKey, bucketObj);
  return bucketObj;
}

/**
 * Fetch & Decompress Compact Game Lookup File (.json.gz, Base-Path Aware)
 */
export async function fetchLookupFile(relPath: string): Promise<CompactGameLookupRecord[]> {
  if (cachedLookupFiles.has(relPath)) {
    return cachedLookupFiles.get(relPath)!;
  }

  const manifest = await fetchTokenManifest();
  const lookupInfo = manifest.lookupFiles.find(l => l.file === relPath);

  const fileUrl = getBasePathAwareUrl(`data/${relPath}`);
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
 * Progressive Batching Search Execution Engine
 */
export async function executeProgressiveTokenSearch(
  queryStr: string,
  targetResultCount: number = 20
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
  const requiredBucketKeys = Array.from(new Set(tokens.map(t => getTokenBucketKey(t))));

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

  // 2. Aggregate & Intersect matching game IDs
  const matchingGameIdsSet = new Set<number>();
  const idMatchCountMap = new Map<number, number>();

  for (const ids of postingsMap.values()) {
    for (const id of ids) {
      matchingGameIdsSet.add(id);
      idMatchCountMap.set(id, (idMatchCountMap.get(id) || 0) + 1);
    }
  }

  const allMatchingIds = Array.from(matchingGameIdsSet);
  const postingListIdCount = allMatchingIds.length;

  let candidateIds = allMatchingIds;
  if (candidateIds.length > 5000) {
    candidateIds.sort((a, b) => (idMatchCountMap.get(b) || 0) - (idMatchCountMap.get(a) || 0));
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

    if (loadedLookupRecords.length >= Math.max(targetResultCount * 3, 60)) {
      break;
    }
  }

  // 5. Rank Loaded Results
  const rankedResults: Array<{ record: CompactGameLookupRecord; score: number }> = [];

  for (const r of loadedLookupRecords) {
    const normTitle = normalizeSearchQuery(r.name);
    let score = 0;

    if (normTitle === normQuery) score += 10000;
    else if (normTitle.startsWith(normQuery)) score += 5000;

    const matchCount = idMatchCountMap.get(r.id) || 1;
    if (matchCount === tokens.length) score += 2000;

    score += matchCount * 100;

    const pos = normTitle.indexOf(tokens[0]);
    if (pos >= 0) score += Math.max(0, 100 - pos);

    if (r.defaultVisible) score += 50;

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
