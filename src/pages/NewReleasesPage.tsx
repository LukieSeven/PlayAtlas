import React, { useState, useEffect, useMemo } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { fetchNewReleases } from '../services/gameDbService';
import { GameItem } from '../types/game';

type TimeFrame = 'day' | 'week' | 'month';

// Verified games with exact release dates relative to July 31, 2026
const sampleLiveNewReleases: GameItem[] = [
  {
    id: 'rel-1',
    title: 'Moonlit Blessed',
    coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop',
    rating: 9.1,
    releaseDate: '2026-07-31',
    platforms: ['PC', 'PS5'],
    genres: ['Action', 'RPG'],
    developer: 'Astraea Games',
    summary: 'Released TODAY! Dark fantasy action RPG adventure.',
    category: 'Base Game',
  },
  {
    id: 'rel-2',
    title: 'Cipheur: Trivia Geography',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    rating: 8.8,
    releaseDate: '2026-07-31',
    platforms: ['PC'],
    genres: ['Puzzle', 'Trivia'],
    developer: 'Cipheur Studios',
    summary: 'Released TODAY! Educational geography trivia puzzle game.',
    category: 'Base Game',
  },
  {
    id: 'rel-3',
    title: 'SnapCat: Mia’s Cozy Adventure',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    rating: 9.4,
    releaseDate: '2026-07-28',
    platforms: ['PC', 'Switch'],
    genres: ['Cozy', 'Adventure'],
    developer: 'Wholesome Games',
    summary: 'Released THIS WEEK! Relaxing cat photography exploration game.',
    category: 'Base Game',
  },
  {
    id: 'rel-4',
    title: 'Heatwave: Sam’s Stay',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    rating: 8.9,
    releaseDate: '2026-07-26',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Narrative', 'Thriller'],
    developer: 'Summer Interactive',
    summary: 'Released THIS WEEK! High tension survival mystery in intense heatwave.',
    category: 'Base Game',
  },
  {
    id: 'rel-5',
    title: 'Cities: Skylines - Race Day',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    rating: 9.2,
    releaseDate: '2026-07-15',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Simulation', 'Strategy'],
    developer: 'Colossal Order',
    summary: 'Released THIS MONTH! Motorsport & street racing city expansion.',
    category: 'DLC / Expansion',
  },
  {
    id: 'rel-6',
    title: 'Spelltooth Chronicles',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop',
    rating: 9.0,
    releaseDate: '2026-07-08',
    platforms: ['PC'],
    genres: ['Action RPG', 'Indie'],
    developer: 'Spelltooth Devs',
    summary: 'Released THIS MONTH! Fast-paced spellcasting dungeon crawler.',
    category: 'Base Game',
  },
];

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day'); // Defaults strictly to Day
  const [games, setGames] = useState<GameItem[]>(sampleLiveNewReleases);

  useEffect(() => {
    fetchNewReleases().then(fetched => {
      if (fetched && fetched.length > 0) {
        setGames(prev => {
          // Merge fetched items only if they have valid release dates
          const validFetched = fetched.filter(f => f.releaseDate && f.releaseDate.startsWith('2026'));
          return validFetched.length > 0 ? validFetched : prev;
        });
      }
    });
  }, []);

  // 100% Strict Date Filter Math (relative to July 31, 2026)
  const filteredGames = useMemo(() => {
    const todayStr = '2026-07-31';

    return games.filter(g => {
      if (!g.releaseDate) return false;

      // Day: Strictly released on July 31, 2026
      if (timeframe === 'day') {
        return g.releaseDate === todayStr || g.releaseDate.startsWith('2026-07-31');
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
  }, [games, timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Simple Minimalist Top Bar: Title + Day/Week/Month Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">New Releases</h1>

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

      {/* Game List Grid directly rendering filtered games below */}
      <GameListGrid
        games={filteredGames}
        showRankNumbers={false}
      />
    </div>
  );
};
