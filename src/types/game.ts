export interface GameItem {
  id: string;
  title: string;
  coverUrl: string;
  bannerUrl?: string;
  rating: number; // 0.0 - 10.0
  releaseDate: string; // ISO date string or formatted
  platforms: string[];
  genres: string[];
  developer: string;
  summary: string;
  isUpcoming?: boolean;
}

export interface GameList {
  id: string;
  title: string;
  description: string;
  category: 'ranked' | 'tier' | 'collection' | 'backlog';
  author: {
    name: string;
    avatar: string;
    handle: string;
  };
  gameCount: number;
  likesCount: number;
  updatedAt: string;
  isPublic: boolean;
  shareUrl?: string;
  games: GameItem[];
}

export interface ReleaseCountdown {
  gameTitle: string;
  subtitle: string;
  targetDate: string; // ISO String
  coverUrl: string;
  bannerUrl: string;
  developer: string;
  platform: string[];
  preorderLink?: string;
}

export interface HomeWidgetConfig {
  id: string;
  title: string;
  type: 'spotlight_countdown' | 'top_ten_list' | 'custom_list' | 'sortable_grid' | 'backlog_preview';
  enabled: boolean;
  order: number;
}
