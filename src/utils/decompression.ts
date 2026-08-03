/**
 * Fetch a .json.gz file, validate SHA-256 hash, and decompress using native DecompressionStream('gzip').
 * Retries once with cache: 'reload' on fetch failure or hash mismatch to bypass stale CDN/browser caches.
 */
export async function fetchAndDecompressJson<T>(
  url: string,
  expectedSha256?: string
): Promise<T> {
  try {
    return await doFetchAndDecompress<T>(url, expectedSha256, { cache: 'default' });
  } catch (err: any) {
    console.warn(`Initial fetch or hash validation failed for ${url}. Retrying once with cache: 'reload'...`, err?.message);
    return await doFetchAndDecompress<T>(url, expectedSha256, { cache: 'reload' });
  }
}

async function doFetchAndDecompress<T>(
  url: string,
  expectedSha256?: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Failed to fetch compressed resource ${url} (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();

  // Validate SHA-256 hash if provided
  if (expectedSha256) {
    let hashHex = '';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      const nodeCrypto = await import('crypto');
      hashHex = nodeCrypto.createHash('sha256').update(new Uint8Array(arrayBuffer)).digest('hex');
    }

    if (hashHex.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(`SHA-256 hash mismatch for ${url}! Expected: ${expectedSha256}, Actual: ${hashHex}`);
    }
  }

  let jsonText = '';

  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(arrayBuffer).body!.pipeThrough(ds);
    jsonText = await new Response(decompressedStream).text();
  } else {
    try {
      const zlib = await import('zlib');
      const decompressedBuffer = zlib.gunzipSync(Buffer.from(arrayBuffer));
      jsonText = decompressedBuffer.toString('utf-8');
    } catch (err) {
      throw new Error(`Gzip decompression failed for ${url}: ${err}`);
    }
  }

  return JSON.parse(jsonText) as T;
}
