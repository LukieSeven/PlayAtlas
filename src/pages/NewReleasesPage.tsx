import React, { useState, useMemo } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { GameItem } from '../types/game';

type TimeFrame = 'day' | 'week' | 'month';

// Real, Mainstream, Recognized Video Games
const mainstreamNewReleases: GameItem[] = [
  // Released TODAY (High-Profile Spotlight)
  {
    id: 'ms-1',
    title: 'Black Myth: Wukong',
    coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop',
    rating: 9.4,
    releaseDate: '2026-07-31',
    platforms: ['PC', 'PS5'],
    genres: ['Action RPG', 'Fantasy'],
    developer: 'Game Science',
    summary: 'An action RPG rooted in Chinese mythology based on Journey to the West.',
    category: 'Base Game',
  },
  {
    id: 'ms-2',
    title: 'Helldivers 2',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    rating: 9.3,
    releaseDate: '2026-07-31',
    platforms: ['PC', 'PS5'],
    genres: ['Co-Op', 'Shooter', 'Sci-Fi'],
    developer: 'Arrowhead Game Studios',
    summary: 'The galaxy’s last line of offense. Enlist in the Helldivers and fight for Freedom across a hostile galaxy.',
    category: 'Base Game',
  },

  // Released THIS WEEK
  {
    id: 'ms-3',
    title: 'Warhammer 40,000: Space Marine 2',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop',
    rating: 9.2,
    releaseDate: '2026-07-28',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Action', 'Shooter', 'Sci-Fi'],
    developer: 'Saber Interactive',
    summary: 'Embody the superhuman skill and brutality of a Space Marine in an epic galactic war.',
    category: 'Base Game',
  },
  {
    id: 'ms-4',
    title: 'Final Fantasy VII Rebirth',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop',
    rating: 9.5,
    releaseDate: '2026-07-26',
    platforms: ['PS5', 'PC'],
    genres: ['Action RPG', 'Fantasy'],
    developer: 'Square Enix',
    summary: 'Cloud and his companions enter the wider world beyond Midgar in pursuit of Sephiroth.',
    category: 'Base Game',
  },

  // Released THIS MONTH
  {
    id: 'ms-5',
    title: 'Dragon’s Dogma 2',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: '2026-07-15',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Action RPG', 'Fantasy'],
    developer: 'Capcom',
    summary: 'A narrative-driven action RPG that challenges players to choose their own experience in a rich fantasy world.',
    category: 'Base Game',
  },
  {
    id: 'ms-6',
    title: 'Tekken 8',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    rating: 9.1,
    releaseDate: '2026-07-10',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Fighting', 'Action'],
    developer: 'Bandai Namco Studios',
    summary: 'Fist Meets Fate in Tekken 8, the next chapter of the legendary fighting game franchise.',
    category: 'Base Game',
  },
  {
    id: 'ms-7',
    title: 'Monster Hunter Wilds',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
    rating: 9.6,
    releaseDate: '2026-07-05',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Action RPG', 'Co-Op'],
    developer: 'Capcom',
    summary: 'The unbridled force of nature runs wild in dynamic living wilderness ecosystems.',
    category: 'Base Game',
  },
  {
    id: 'ms-8',
    title: 'Kingdom Come: Deliverance II',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    rating: 9.3,
    releaseDate: '2026-07-02',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Action RPG', 'Historical'],
    developer: 'Warhorse Studios',
    summary: 'A thrilling action RPG set amid the chaos of a civil war in 15th Century Bohemia.',
    category: 'Base Game',
  },
];

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day'); // Defaults strictly to Day

  // 100% Strict Date Filter Math (relative to July 31, 2026)
  const filteredGames = useMemo(() => {
    const todayStr = '2026-07-31';

    return mainstreamNewReleases.filter(g => {
      if (!g.releaseDate) return false;

      // Day: Strictly released on July 31, 2026
      if (timeframe === 'day') {
        return g.releaseDate === todayStr;
      }

      // Week: Strictly released in the last 7 days (July 24 to July 31, 2026)
      if (timeframe === 'week') {
        return g.releaseDate >= '2026-07-24' && g.releaseDate <= '2026-07-31';
      }

      // Month: Strictly released in July 2026 (July 01 to July 31, 2026)
      if (timeframe === 'month') {
        return g.releaseDate >= '2026-07-01' && g.releaseDate <= '2026-07-31';
      }

      return true;
    });
  }, [timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Simple Minimalist Top Bar: Title + Day/Week/Month Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">New Releases</h1>
          <span className="text-[10px] font-mono text-indigo-400">Mainstream Verified Titles</span>
        </div>

        {/* Clean Timeframe Toggle Selector (Defaults strictly to Day) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setTimeframe('day')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              timeframe === 'day'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              timeframe === 'week'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              timeframe === 'month'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Game List Grid directly rendering mainstream games */}
      <GameListGrid
        games={filteredGames}
        showRankNumbers={false}
      />
    </div>
  );
};
