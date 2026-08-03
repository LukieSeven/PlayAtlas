export function normalizeSearchQuery(q: string | null | undefined): string {
  if (!q || typeof q !== 'string') return '';
  return q
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip unicode diacritics
    .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric and spaces
    .replace(/\s+/g, ' '); // Normalize multiple spaces
}

export function getSearchBucketKey(normalizedName: string): string {
  if (!normalizedName || normalizedName.length === 0) return 'other';
  const firstChar = normalizedName.charAt(0);
  if (/[0-9]/.test(firstChar)) return '0-9';
  if (/[a-z]/.test(firstChar)) return firstChar;
  return 'other';
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

export function buildCoverThumbnailUrl(imageId: string | null | undefined): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_small/${imageId.trim()}.jpg`;
}

export function buildCoverUrl(imageId: string | null | undefined, size: string = 't_cover_big'): string | null {
  if (!imageId || typeof imageId !== 'string' || !imageId.trim()) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId.trim()}.jpg`;
}
