import React, { useState, useMemo } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { getMainstreamReleases } from '../services/mainstreamGames';

type TimeFrame = 'day' | 'week' | 'month';

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day'); // Defaults strictly to Day

  // Fetch verified mainstream releases by timeframe
  const filteredGames = useMemo(() => {
    return getMainstreamReleases(timeframe);
  }, [timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Simple Minimalist Top Bar: Title + Day/Week/Month Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">New Releases</h1>
          <span className="text-[10px] font-mono text-indigo-400">Verified Mainstream Hit Releases</span>
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

      {/* Game List Grid directly rendering verified mainstream games */}
      <GameListGrid
        games={filteredGames}
        showRankNumbers={false}
      />
    </div>
  );
};
