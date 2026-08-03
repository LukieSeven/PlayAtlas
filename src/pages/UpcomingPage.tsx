import React, { useState, useEffect } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { getUpcomingGames, ReleaseFeedPartition } from '../services/releaseCatalogService';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { CompactGameLookupRecord } from '../types/catalog';

export const UpcomingPage: React.FC = () => {
  const [data, setData] = useState<ReleaseFeedPartition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<CompactGameLookupRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getUpcomingGames(30)
      .then((partition: ReleaseFeedPartition) => {
        if (isMounted) {
          setData(partition);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch upcoming games:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header Banner */}
      <div className="themed-panel p-6 md:p-8 rounded-3xl border border-[var(--panel-border)] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-color)] uppercase font-bold">
            <CalendarDays className="w-4 h-4" />
            <span>Future Radar</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold themed-heading">Upcoming Releases</h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-2xl">
            Track upcoming video game launches, announced release dates, and scheduled future debuts.
          </p>
        </div>
      </div>

      {/* Upcoming Games Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-color)]" />
          <span>Loading upcoming releases feed...</span>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="themed-panel p-12 text-center rounded-3xl text-xs font-mono text-[var(--text-muted)]">
          No upcoming games currently scheduled in the feed.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.items.map((item: any) => (
            <GameCard
              key={item.record.id}
              game={item.record}
              onSelect={(rec: CompactGameLookupRecord) => setSelectedGame(rec)}
            />
          ))}
        </div>
      )}

      <GameDetailModal
        selectedGame={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
};
