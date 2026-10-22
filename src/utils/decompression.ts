import type { LoadingProgress } from '../types/loadingProgress';

/**
 * Fetch a .json.gz file, validate SHA-256 hash, and decompress using native DecompressionStream('gzip').
 * Retries once with cache: 'reload' on fetch failure or hash mismatch to bypass stale CDN/browser caches.
 */
export async function fetchAndDecompressJson<T>(
  url: string,
  expectedSha256?: string,
  onProgress?: (progress: LoadingProgress) => void,
): Promise<T> {
  try {
    return await doFetchAndDecompress<T>(url, expectedSha256, { cache: 'default' }, onProgress);
  } catch (err: any) {
    console.warn(`Initial fetch or hash validation failed for ${url}. Retrying once with cache: 'reload'...`, err?.message);
    return await doFetchAndDecompress<T>(url, expectedSha256, { cache: 'reload' }, onProgress);
  }
}

async function doFetchAndDecompress<T>(
  url: string,
  expectedSha256?: string,
  init?: RequestInit,
  onProgress?: (progress: LoadingProgress) => void,
): Promise<T> {
  onProgress?.({ phase: 'download', loaded: 0 });
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Failed to fetch compressed resource ${url} (HTTP ${res.status})`);
  }

  let arrayBuffer: ArrayBuffer;
  if (onProgress && res.body) {
    // Content-Length may refer to transport-compressed bytes, while fetch
    // exposes decoded bytes. Only report a percentage when they are comparable.
    const size = res.headers.get('Content-Encoding') ? 0 : Number(res.headers.get('Content-Length'));
    const total = size > 0 && Number.isFinite(size) ? size : undefined;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    let lastReport = 0;
    onProgress({ phase: 'download', loaded, total });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      if (Date.now() - lastReport >= 100) { onProgress({ phase: 'download', loaded, total }); lastReport = Date.now(); }
    }
    onProgress({ phase: 'download', loaded, total });
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    arrayBuffer = joined.buffer;
  } else arrayBuffer = await res.arrayBuffer();

  // Validate SHA-256 hash if provided
  if (expectedSha256) {
    onProgress?.({ phase: 'verify' });
    let hashHex: string;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      throw new Error('This browser requires Web Crypto support to verify catalog files. Use HTTPS or localhost.');
    }

    if (hashHex.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(`SHA-256 hash mismatch for ${url}! Expected: ${expectedSha256}, Actual: ${hashHex}`);
    }
  }

  let jsonText: string;

  if (typeof DecompressionStream !== 'undefined') {
    onProgress?.({ phase: 'unpack' });
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(arrayBuffer).body!.pipeThrough(ds);
    jsonText = await new Response(decompressedStream).text();
  } else {
    throw new Error('This browser requires DecompressionStream support to read the catalog. Please use a current browser.');
  }

  onProgress?.({ phase: 'index' });
  return JSON.parse(jsonText) as T;
}
