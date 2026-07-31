import React, { useState, useEffect } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { fetchDirectGameDbReleases } from '../services/gameDbService';
import { GameItem } from '../types/game';
import { Loader2, Globe, Clock, CalendarX } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

type TimeFrame = 'day' | 'week' | 'month';

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day');
  const [liveGames, setLiveGames] = useState<GameItem[]>([]);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamically query GameDB CDN with strict 07/30/26 & 07/31/26 enforcement
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
      {/* Top Bar: Title + Timestamp Badge + Timeframe Toggles */}
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
            Strict Release Date Filter • {loading ? 'Fetching...' : `${liveGames.length} Games Found`}
          </span>
        </div>

        {/* Timeframe Toggle Buttons (Day | Week | Month) */}
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
            Applying strict date check for {timeframe.toUpperCase()} releases...
          </span>
        </div>
      )}

      {/* Zero Matching Games Message */}
      {!loading && liveGames.length === 0 && (
        <Card glass className="p-12 text-center space-y-3 border-amber-500/20">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <CalendarX className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">0 games released on 07/30/2026 or 07/31/2026</h4>
            <p className="text-xs text-slate-400 mt-1">
              No games in GameDB have a release date of today (07/31/26) or yesterday (07/30/26).
            </p>
          </div>
        </Card>
      )}

      {/* Rendered Live GameDB Results Grid */}
      {!loading && liveGames.length > 0 && (
        <GameListGrid
          games={liveGames}
          showRankNumbers={false}
        />
      )}
    </div>
  );
};
