import { GameItem } from '../types/game';

export interface RawGameDbObject {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  aggregated_rating?: number;
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

export function adaptGameDbToGameItem(raw: RawGameDbObject): GameItem {
  // Format Cover Image URL to HD Big Cover
  let coverUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop';
  if (raw.cover?.url) {
    const rawUrl = raw.cover.url.startsWith('//') ? `https:${raw.cover.url}` : raw.cover.url;
    coverUrl = rawUrl.replace('t_thumb', 't_cover_big');
  }

  // Format Banner Image URL
  let bannerUrl = coverUrl;
  if (raw.screenshots && raw.screenshots.length > 0) {
    const shotUrl = raw.screenshots[0].url.startsWith('//') ? `https:${raw.screenshots[0].url}` : raw.screenshots[0].url;
    bannerUrl = shotUrl.replace('t_thumb', 't_1080p');
  }

  // Format Developer Name
  let developer = 'Game Studio';
  if (raw.involved_companies && raw.involved_companies.length > 0) {
    const devCompany = raw.involved_companies.find(c => c.developer && c.company?.name);
    if (devCompany && devCompany.company) {
      developer = devCompany.company.name;
    } else if (raw.involved_companies[0].company?.name) {
      developer = raw.involved_companies[0].company.name;
    }
  }

  // Format Rating to 0.0 - 10.0 scale
  const rawRating = raw.rating || raw.aggregated_rating || 85;
  const rating = parseFloat((rawRating / 10).toFixed(1));

  // Format Genres
  const genres = raw.genres ? raw.genres.map(g => g.name) : ['Action', 'RPG'];

  // Format Platforms
  const platforms = raw.platforms
    ? raw.platforms.map(p => p.abbreviation || p.name)
    : ['PC', 'PS5', 'Xbox'];

  // Format Release Date
  let releaseDate = '2024-01-01';
  if (raw.release_dates && raw.release_dates.length > 0) {
    const firstDate = raw.release_dates[0];
    if (firstDate.human) {
      releaseDate = firstDate.human;
    } else if (firstDate.date) {
      releaseDate = new Date(firstDate.date * 1000).toISOString().split('T')[0];
    } else if (firstDate.y) {
      releaseDate = `${firstDate.y}-01-01`;
    }
  }

  return {
    id: String(raw.id),
    title: raw.name,
    coverUrl,
    bannerUrl,
    rating,
    releaseDate,
    platforms,
    genres,
    developer,
    summary: raw.summary || raw.storyline || 'No detailed summary available for this title.',
  };
}
