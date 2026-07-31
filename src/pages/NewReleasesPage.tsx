import React, { useState, useEffect } from 'react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { queryGameIndex, QueryResult, getUserLocalDate } from '../services/gameIndexQueryService';
import { IndexDiagnosticsPanel } from '../components/widgets/IndexDiagnosticsPanel';
import { Loader2, Database, Clock, Sparkles, Layers } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

type TimeFrame = 'day' | 'week' | 'month';
type ReleaseViewMode = 'first_release' | 'platform_release';

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('day');
  const [viewType, setViewType] = useState<ReleaseViewMode>('first_release'); // Mode 1 vs Mode 2
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Query Local IndexedDB Catalog without scanning GameDB during browser use
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    queryGameIndex({
      viewType,
      timeframe,
    }).then(result => {
      if (isMounted) {
        setQueryResult(result);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [timeframe, viewType]);

  const { dateStr: userTodayDate, timezone: userTimezone } = getUserLocalDate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar: Title + View Mode Selector + Timeframe Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">New Releases</h1>
            <Badge variant="indigo" className="gap-1 font-mono text-[11px] py-1 px-2.5">
              <Database className="w-3 h-3 text-cyan-400" />
              IndexedDB Catalog
            </Badge>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            User Local Date: {userTodayDate} ({userTimezone}) • {loading ? 'Querying Index...' : `${queryResult?.games.length || 0} Games Found`}
          </span>
        </div>

        {/* Controls: Dual View Modes (First Release vs Platform Specific) & Timeframe Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Dual View Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewType('first_release')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewType === 'first_release'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="First-Ever Game Release View"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>First Releases</span>
            </button>
            <button
              onClick={() => setViewType('platform_release')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                viewType === 'platform_release'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Platform-Specific Release View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Platform Releases</span>
            </button>
          </div>

          {/* Timeframe Toggle Buttons (Day | Week | Month) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                timeframe === 'day'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
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
      </div>

      {/* Index Diagnostics Display Panel */}
      <IndexDiagnosticsPanel
        manifest={queryResult?.manifest || null}
        diagnostics={queryResult?.diagnostics || null}
        userTimezone={userTimezone}
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Querying IndexedDB catalog for {viewType === 'first_release' ? 'first-ever' : 'platform-specific'} {timeframe.toUpperCase()} releases...
          </span>
        </div>
      )}

      {/* Zero Matching Games Message */}
      {!loading && queryResult && queryResult.games.length === 0 && (
        <Card glass className="p-12 text-center space-y-3 border-amber-500/20">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">0 games matching selected release criteria</h4>
            <p className="text-xs text-slate-400 mt-1">
              No games in the IndexedDB catalog match your selected date ({userTodayDate}) and view mode.
            </p>
          </div>
        </Card>
      )}

      {/* Rendered Games Grid */}
      {!loading && queryResult && queryResult.games.length > 0 && (
        <GameListGrid
          games={queryResult.games}
          showRankNumbers={false}
        />
      )}
    </div>
  );
};
