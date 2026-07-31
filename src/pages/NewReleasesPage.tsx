import React, { useState, useEffect } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { fetchDirectGameDbReleases } from '../services/gameDbService';
import { GameItem } from '../types/game';
import { Loader2, Globe, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

type TimeFrame = 'day' | 'week' | 'month';

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day');
  const [liveGames, setLiveGames] = useState<GameItem[]>([]);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamically query GameDB CDN and capture 'As of X date' timestamp
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchDirectGameDbReleases(timeframe).then(result => {
      if (isMounted) {
        setLiveGames(result.games);
        setAsOfDate(result.asOfDate);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar: Title + 'As of X date' Timestamp Badge + Timeframe Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">New Releases</h1>
            {asOfDate && (
              <Badge variant="indigo" className="gap-1 font-mono text-[11px] py-1 px-2.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                {asOfDate}
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <Globe className="w-3 h-3 text-cyan-400" />
            Live GameDB CDN Query • {loading ? 'Fetching API...' : `${liveGames.length} Games Found`}
          </span>
        </div>

        {/* Clean Timeframe Toggle Selector (Day | Week | Month) */}
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

      {/* Loading Spinner */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Querying LizardByte GameDB CDN for {timeframe.toUpperCase()} releases...
          </span>
        </div>
      )}

      {/* Rendered Live GameDB Results Grid */}
      {!loading && (
        <GameListGrid
          games={liveGames}
          showRankNumbers={false}
        />
      )}
    </div>
  );
};
