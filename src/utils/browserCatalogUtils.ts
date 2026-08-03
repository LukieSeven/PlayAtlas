import crypto from 'crypto';

export function normalizeSearchQuery(q: string | null | undefined): string {
  if (!q || typeof q !== 'string') return '';
  return q
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip unicode diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Tokenize title into searchable words.
 * Discards 1-character alphabetic tokens (e.g. 'a', 's'), but retains numeric tokens (e.g. '2', '3', '7').
 */
export function tokenizeTitle(title: string | null | undefined): string[] {
  const normalized = normalizeSearchQuery(title);
  if (!normalized) return [];

  const rawTokens = normalized.split(' ');
  const validTokens: string[] = [];
  const seen = new Set<string>();

  for (const token of rawTokens) {
    if (!token) continue;
    // Discard single alphabetic letters
    if (/^[a-z]$/.test(token)) continue;

    if (!seen.has(token)) {
      seen.add(token);
      validTokens.push(token);
    }
  }

  return validTokens;
}

/**
 * Get 2-character hex bucket key (00 to ff) for a token using SHA-256
 */
export function getTokenBucketKey(token: string): string {
  const clean = token.trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  return hash.slice(0, 2); // 256 buckets from 00 to ff
}

export function getReleaseYearKey(firstReleaseDate: string | null | undefined): string {
  if (!firstReleaseDate || typeof firstReleaseDate !== 'string') return 'undated';
  const match = firstReleaseDate.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year >= 1970 && year <= 2035) return String(year);
  }
  return 'undated';
}

export function getReleaseMonthKey(firstReleaseDate: string | null | undefined): string {
  if (!firstReleaseDate || typeof firstReleaseDate !== 'string') return 'partial';
  const match = firstReleaseDate.match(/^\d{4}-(\d{2})/);
  if (match) {
    const month = match[1];
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) return month;
  }
  return 'partial';
}

export function buildCoverThumbnailUrl(imageId: string | null | undefined): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId.trim()}.jpg`;
}

export function buildCoverUrl(imageId: string | null | undefined, size: string = 't_cover_big'): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId.trim()}.jpg`;
}
