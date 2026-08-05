import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { CountdownCard } from '../components/widgets/CountdownCard';
import { GameListGrid } from '../components/widgets/GameListGrid';
import {
  convertReleaseRecordToCompactRecord,
  getUpcomingGames,
} from '../services/releaseCatalogService';
import { CompactGameLookupRecord } from '../types/catalog';
import { AlertTriangle, Flame } from 'lucide-react';

export const UpcomingGamesPage: React.FC = () => {
  const [upcomingGames, setUpcomingGames] = useState<CompactGameLookupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);

    getUpcomingGames(30)
      .then(partition => {
        if (!isMounted) return;
        setUpcomingGames(partition.items.map(item => convertReleaseRecordToCompactRecord(item.record)));
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        console.error('Failed to load IGDB upcoming releases:', error);
        setUpcomingGames([]);
        setLoadError(error instanceof Error ? error.message : 'Failed to load upcoming releases.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="UPCOMING GAMES"
        title="Major Upcoming Release Spotlights"
        subtitle="Track anticipated future game launches, countdown timers, and release schedules."
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-white">Featured Release Spotlight</h2>
        </div>
        <CountdownCard />
      </section>

      {loadError && (
        <div role="alert" className="themed-panel p-4 rounded-2xl border border-amber-600/40 text-sm text-[var(--text-secondary)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Upcoming releases could not be loaded: {loadError}</span>
        </div>
      )}

      <GameListGrid
        title="Anticipated Future Releases"
        description="Filter upcoming game announcements by genre, developer, and release year."
        badge="UPCOMING SPOTLIGHT"
        games={upcomingGames}
        isLoading={isLoading}
      />
    </div>
  );
};
