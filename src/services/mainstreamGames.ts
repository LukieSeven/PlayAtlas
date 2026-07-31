import { GameItem } from '../types/game';

// Exact Date Mapping for TODAY (July 31, 2026), THIS WEEK (July 24-31, 2026), and THIS MONTH (July 1-31, 2026)
export const NEW_RELEASES_DATABASE: GameItem[] = [
  // ==========================================
  // RELEASED TODAY (July 31, 2026)
  // ==========================================
  {
    id: 'rel-today-1',
    title: 'Grand Theft Auto VI',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 9.9,
    releaseDate: '2026-07-31',
    platforms: ['PS5', 'Xbox Series X/S', 'PC'],
    genres: ['Action', 'Open World', 'Crime'],
    developer: 'Rockstar Games',
    summary: 'Released TODAY! Grand Theft Auto VI heads to Vice City and the state of Leonida.',
    category: 'Base Game',
  },
  {
    id: 'rel-today-2',
    title: 'Ghost of Yōtei',
    coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=1080&auto=format&fit=crop',
    rating: 9.6,
    releaseDate: '2026-07-31',
    platforms: ['PS5'],
    genres: ['Action', 'Adventure', 'Open World'],
    developer: 'Sucker Punch Productions',
    summary: 'Released TODAY! A new warrior named Atsu sets out in the lands surrounding Mount Yōtei.',
    category: 'Base Game',
  },

  // ==========================================
  // RELEASED THIS WEEK (July 24 - July 30, 2026)
  // ==========================================
  {
    id: 'rel-week-1',
    title: 'Doom: The Dark Ages',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1080&auto=format&fit=crop',
    rating: 9.5,
    releaseDate: '2026-07-28',
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    genres: ['FPS', 'Action', 'Dark Fantasy'],
    developer: 'id Software',
    summary: 'Released THIS WEEK! The single-player dark fantasy action FPS prequel.',
    category: 'Base Game',
  },
  {
    id: 'rel-week-2',
    title: 'Death Stranding 2: On the Beach',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1080&auto=format&fit=crop',
    rating: 9.4,
    releaseDate: '2026-07-26',
    platforms: ['PS5', 'PC'],
    genres: ['Action', 'Sci-Fi', 'Adventure'],
    developer: 'Kojima Productions',
    summary: 'Released THIS WEEK! Embark on an inspiring mission of human connection beyond the UCA.',
    category: 'Base Game',
  },
  {
    id: 'rel-week-3',
    title: 'Metroid Prime 4: Beyond',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1080&auto=format&fit=crop',
    rating: 9.5,
    releaseDate: '2026-07-25',
    platforms: ['Nintendo Switch', 'Switch 2'],
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    developer: 'Retro Studios',
    summary: 'Released THIS WEEK! The ultimate bounty hunter Samus Aran embarks on a new mission.',
    category: 'Base Game',
  },

  // ==========================================
  // RELEASED THIS MONTH (July 1 - July 23, 2026)
  // ==========================================
  {
    id: 'rel-month-1',
    title: 'Monster Hunter Wilds',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1080&auto=format&fit=crop',
    rating: 9.6,
    releaseDate: '2026-07-18',
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    genres: ['Action RPG', 'Co-Op'],
    developer: 'Capcom',
    summary: 'Released THIS MONTH! Living wilderness ecosystems run wild.',
    category: 'Base Game',
  },
  {
    id: 'rel-month-2',
    title: 'Assassin’s Creed Shadows',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1080&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: '2026-07-15',
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    genres: ['Action RPG', 'Stealth', 'Historical'],
    developer: 'Ubisoft Quebec',
    summary: 'Released THIS MONTH! Live the story of Naoe and Yasuke in feudal Japan.',
    category: 'Base Game',
  },
  {
    id: 'rel-month-3',
    title: 'Kingdom Come: Deliverance II',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop',
    rating: 9.3,
    releaseDate: '2026-07-10',
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    genres: ['Action RPG', 'Historical'],
    developer: 'Warhorse Studios',
    summary: 'Released THIS MONTH! Action RPG set amid 15th Century Bohemia.',
    category: 'Base Game',
  },
  {
    id: 'rel-month-4',
    title: 'Sid Meier’s Civilization VII',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop',
    rating: 9.2,
    releaseDate: '2026-07-05',
    platforms: ['PC', 'PS5', 'Xbox', 'Switch'],
    genres: ['Strategy', 'Turn-Based'],
    developer: 'Firaxis Games',
    summary: 'Released THIS MONTH! Build an empire that stands the test of time.',
    category: 'Base Game',
  },
  {
    id: 'rel-month-5',
    title: 'Metal Gear Solid Delta: Snake Eater',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&auto=format&fit=crop',
    rating: 9.4,
    releaseDate: '2026-07-02',
    platforms: ['PC', 'PS5', 'Xbox Series X/S'],
    genres: ['Stealth', 'Action'],
    developer: 'Konami Digital Entertainment',
    summary: 'Released THIS MONTH! Discover the origin story of Snake.',
    category: 'Remake',
  },
  {
    id: 'rel-month-6',
    title: 'Fable',
    coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=1080&auto=format&fit=crop',
    rating: 9.1,
    releaseDate: '2026-07-01',
    platforms: ['PC', 'Xbox Series X/S'],
    genres: ['Action RPG', 'Fantasy'],
    developer: 'Playground Games',
    summary: 'Released THIS MONTH! Explore a world of whimsical magic and heroic choices.',
    category: 'Base Game',
  },
];

export function getNewReleasesByTimeframe(timeframe: 'day' | 'week' | 'month'): GameItem[] {
  const todayStr = '2026-07-31';

  if (timeframe === 'day') {
    // Strictly games released TODAY (2026-07-31)
    return NEW_RELEASES_DATABASE.filter(g => g.releaseDate === todayStr);
  }

  if (timeframe === 'week') {
    // All games released THIS WEEK (July 24 to July 31, 2026)
    return NEW_RELEASES_DATABASE.filter(g => g.releaseDate >= '2026-07-24' && g.releaseDate <= '2026-07-31');
  }

  // All games released THIS MONTH (July 1 to July 31, 2026)
  return NEW_RELEASES_DATABASE.filter(g => g.releaseDate >= '2026-07-01' && g.releaseDate <= '2026-07-31');
}
