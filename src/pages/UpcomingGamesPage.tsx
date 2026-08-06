import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Flame, Search, X } from 'lucide-react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import {
  convertReleaseRecordToCompactRecord,
  getUpcomingGames,
} from '../services/releaseCatalogService';
import { CompactGameLookupRecord } from '../types/catalog';

export const UpcomingGamesPage: React.FC = () => {
  const [upcomingGames, setUpcomingGames] = useState<CompactGameLookupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredUpcomingGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return upcomingGames;
    return upcomingGames.filter(game => game.name.toLowerCase().includes(query));
  }, [upcomingGames, searchQuery]);

  const upcomingHeaderContent = (
    <>
      <div className="flex items-center gap-1 bg-[#EFE8D8]/45 px-3 py-2">
        <button type="button" className="flex items-center gap-2 rounded-xl border border-[#C5A059] bg-[#0B2B3C] px-3.5 py-2 text-xs font-bold text-white shadow-xs">
          <Flame className="h-4 w-4 text-[#C5A059]" />
          <span>All Upcoming</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">{upcomingGames.length}</span>
        </button>
      </div>
    </>
  );

  const upcomingSearchContent = (
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8C6D37]" />
          <input
            type="text"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search upcoming games by title..."
            className="w-full rounded-xl border border-[#D9C8A9] bg-white py-2.5 pl-10 pr-9 text-xs font-semibold text-[#0C1D2D] shadow-xs focus:border-[#C5A059] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 text-[#718294] hover:text-[#0C1D2D]" aria-label="Clear upcoming search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
  );

  const upcomingNoticeContent = loadError ? (
    <div role="alert" className="themed-panel flex items-center gap-2 rounded-2xl border border-amber-600/40 p-4 text-sm text-[var(--text-secondary)]">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <span>Upcoming releases could not be loaded: {loadError}</span>
    </div>
  ) : null;

  return (
    <div className="animate-in fade-in duration-300">
      <GameListGrid
        collectionKey={`upcoming:${searchQuery.trim().toLowerCase()}`}
        headerContent={upcomingHeaderContent}
        searchContent={upcomingSearchContent}
        noticeContent={upcomingNoticeContent}
        games={filteredUpcomingGames}
        isLoading={isLoading}
      />
    </div>
  );
};
