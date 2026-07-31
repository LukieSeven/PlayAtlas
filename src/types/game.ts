export interface GameItem {
  id: string;
  title: string;
  coverUrl: string;
  bannerUrl?: string;
  rating: number;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  developer: string;
  summary: string;
  category?: 'Base Game' | 'DLC / Expansion' | 'Bundle' | 'Remake' | 'Mod';
}

export interface ReleaseCountdown {
  id?: string;
  gameId?: string;
  title?: string;
  gameTitle: string;
  targetDate: string;
  releaseDate?: string;
  coverUrl: string;
  bannerUrl: string;
  subtitle?: string;
  description?: string;
  developer?: string;
  platform: string[];
}

export interface HomeWidgetConfig {
  id: string;
  type: 'spotlight_countdown' | 'top_ten_list' | 'custom_list' | 'backlog_tracker' | 'deals_discounts' | 'new_releases' | 'sortable_grid';
  title: string;
  order: number;
  enabled?: boolean;
}
