export interface NormalizedScore {
  ratingValue: number | null; // 0 to 10 scale
  displayString: string;
  sourceLabel?: string;
  isUnrated: boolean;
}

export function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0;
}

export function normalizeScore(
  value: unknown,
  originalScale: 10 | 100 = 100,
  source?: string
): NormalizedScore {
  if (!isValidScore(value) || value <= 0) {
    return {
      ratingValue: null,
      displayString: 'Not Rated',
      sourceLabel: source,
      isUnrated: true,
    };
  }

  // If 100-point scale (e.g. 87/100), convert to 8.7/10
  let scaled = originalScale === 100 ? value / 10 : value;
  scaled = Math.max(0, Math.min(10, scaled));

  // Round to 1 decimal place
  const rounded = Math.round(scaled * 10) / 10;

  return {
    ratingValue: rounded,
    displayString: `${rounded.toFixed(1)} / 10`,
    sourceLabel: source,
    isUnrated: false,
  };
}

export function normalizeExternalGameScore(gameRecord: unknown): NormalizedScore {
  if (!gameRecord || typeof gameRecord !== 'object') {
    return { ratingValue: null, displayString: 'Not Rated', isUnrated: true };
  }

  const rec = gameRecord as Record<string, unknown>;

  // Check potential rating fields from IGDB or catalog
  const ratingCandidates = [
    { val: rec.totalRating, scale: 100, label: 'IGDB Total Rating' },
    { val: rec.aggregatedRating, scale: 100, label: 'Critics Score' },
    { val: rec.rating, scale: 100, label: 'User Rating' },
  ];

  for (const candidate of ratingCandidates) {
    if (isValidScore(candidate.val) && candidate.val > 0) {
      return normalizeScore(candidate.val, candidate.scale as 10 | 100, candidate.label);
    }
  }

  return {
    ratingValue: null,
    displayString: 'Not Rated',
    isUnrated: true,
  };
}

export function normalizePersonalScore(value: unknown): NormalizedScore {
  if (!isValidScore(value) || value < 0) {
    return {
      ratingValue: null,
      displayString: 'Not Rated',
      sourceLabel: 'Personal Rating',
      isUnrated: true,
    };
  }

  const rounded = Math.round(Math.max(0, Math.min(10, value)) * 10) / 10;
  return {
    ratingValue: rounded,
    displayString: `${rounded.toFixed(1)} ★`,
    sourceLabel: 'Personal Rating',
    isUnrated: false,
  };
}

export function formatScore(score: NormalizedScore): string {
  return score.displayString;
}
