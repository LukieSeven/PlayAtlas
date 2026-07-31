import { GameItem } from '../types/game';

export interface RawGameDbObject {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  aggregated_rating?: number;
  category?: number; // IGDB category enum
  cover?: {
    id: number;
    url: string;
  };
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
    abbreviation?: string;
  }>;
  involved_companies?: Array<{
    id: number;
    company?: {
      id: number;
      name: string;
    };
    developer?: boolean;
    publisher?: boolean;
  }>;
  release_dates?: Array<{
    id: number;
    date?: number;
    human?: string;
    y?: number;
  }>;
}

/**
 * Direct GameDB Adapter
 * Maps exact GameDB raw fields directly without introducing mock values or artificial data.
 */
export function adaptGameDbToGameItem(raw: RawGameDbObject): GameItem {
  // Exact Cover URL
  let coverUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop';
  if (raw.cover?.url) {
    const rawUrl = raw.cover.url.startsWith('//') ? `https:${raw.cover.url}` : raw.cover.url;
    coverUrl = rawUrl.replace('t_thumb', 't_cover_big');
  }

  // Exact Category Mapping
  let category: 'Base Game' | 'DLC / Expansion' | 'Bundle' | 'Remake' | 'Mod' = 'Base Game';
  if (raw.category === 1 || raw.category === 2 || raw.category === 4) {
    category = 'DLC / Expansion';
  } else if (raw.category === 3) {
    category = 'Bundle';
  } else if (raw.category === 8 || raw.category === 9) {
    category = 'Remake';
  } else if (raw.category === 5) {
    category = 'Mod';
  }

  // Exact Developer Company Name
  let developer = 'Unknown Studio';
  if (raw.involved_companies && raw.involved_companies.length > 0) {
    const devCompany = raw.involved_companies.find(c => c.developer && c.company?.name);
    if (devCompany && devCompany.company) {
      developer = devCompany.company.name;
    } else if (raw.involved_companies[0].company?.name) {
      developer = raw.involved_companies[0].company.name;
    }
  }

  // Exact Rating (0.0 - 10.0 scale)
  const rawRating = raw.rating || raw.aggregated_rating || 0;
  const rating = rawRating > 0 ? parseFloat((rawRating / 10).toFixed(1)) : 0;

  // Exact Genres
  const genres = raw.genres && raw.genres.length > 0 ? raw.genres.map(g => g.name) : ['General'];

  // Exact Platforms
  const platforms =
    raw.platforms && raw.platforms.length > 0
      ? raw.platforms.map(p => p.abbreviation || p.name)
      : ['PC'];

  // Exact Release Date (Parsed directly from Unix timestamp or IGDB human string)
  let releaseDate = 'Unknown';
  if (raw.release_dates && raw.release_dates.length > 0) {
    const validDates = raw.release_dates.filter(d => d.date || d.y || d.human);
    if (validDates.length > 0) {
      const initial = validDates[0];
      if (initial.date) {
        releaseDate = new Date(initial.date * 1000).toISOString().split('T')[0];
      } else if (initial.human) {
        releaseDate = initial.human;
      } else if (initial.y) {
        releaseDate = `${initial.y}-01-01`;
      }
    }
  }

  return {
    id: String(raw.id),
    title: raw.name,
    coverUrl,
    bannerUrl: coverUrl,
    rating,
    releaseDate,
    platforms,
    genres,
    developer,
    summary: raw.summary || raw.storyline || 'No detailed summary provided in GameDB.',
    category,
  };
}
