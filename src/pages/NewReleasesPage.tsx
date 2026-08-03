import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Layers, Clock, AlertTriangle, RefreshCw, Search, X } from 'lucide-react';
import { queryReleaseCatalog, getDynamicLocalDate } from '../services/releaseCatalogService';
import { executeProgressiveTokenSearch } from '../services/tokenSearchService';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { CompactGameLookupRecord } from '../types/catalog';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { hydrateCompactRecordsBatch } from '../services/catalogDetailService';

type TimeFrame = 'day' | 'week' | 'month';
type ReleaseViewMode = 'first_release' | 'platform_release';

export const NewReleasesPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('month'); // Default to month so page is rich
  const [viewType, setViewType] = useState<ReleaseViewMode>('first_release');
  
  // Release feed state
  const [releaseGames, setReleaseGames] = useState<CompactGameLookupRecord[]>([]);
  const [loadingRelease, setLoadingRelease] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Full Catalog Search state (overrides feed when active)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CompactGameLookupRecord[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [totalSearchMatches, setTotalSearchMatches] = useState<number>(0);

  // Stale async response protection ref
  const activeSearchQueryRef = useRef<string>('');

  // Modal selection
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  // Fetch release catalog partition feed
  const loadReleaseCatalog = useCallback(async () => {
    setLoadingRelease(true);
    setLoadError(null);

    try {
      const res = await queryReleaseCatalog({
        viewType,
        timeframe: timeframe === 'day' ? 'past_30_days' : timeframe === 'week' ? 'past_30_days' : 'new_releases',
      });

      const mapped: CompactGameLookupRecord[] = res.records.map((r: any) => ({
        id: r.sourceId || parseInt(String(r.id).replace(/\D/g, ''), 10) || Math.floor(Math.random() * 100000),
        name: r.name,
        year: r.firstReleaseDate ? parseInt(r.firstReleaseDate.slice(0, 4), 10) : undefined,
        gameType: r.gameType || undefined,
        defaultVisible: r.defaultVisible !== false,
        coverUrl: r.coverUrl || undefined,
        chunk: r.dataChunk ? parseInt(String(r.dataChunk).replace(/\D/g, ''), 10) : undefined,
      }));

      setReleaseGames(mapped);
    } catch (err: any) {
      console.error('Release feed error:', err);
      setLoadError(err?.message || 'Failed to communicate with release catalog partition service.');
      setReleaseGames([]);
    } finally {
      setLoadingRelease(false);
    }
  }, [timeframe, viewType]);

  useEffect(() => {
    loadReleaseCatalog();
  }, [loadReleaseCatalog]);

  // Non-blocking async hydration of displayed RELEASE FEED record batch (max 40 records)
  useEffect(() => {
    if (releaseGames.length === 0 || searchQuery.trim().length >= 2) return;

    let isCurrent = true;
    const batchToHydrate = releaseGames.slice(0, 40);

    const needsHydration = batchToHydrate.some(r => !r.coverUrl || r.coverUrl.includes('nocover'));
    if (!needsHydration) return;

    hydrateCompactRecordsBatch(batchToHydrate)
      .then(hydratedBatch => {
        if (!isCurrent || searchQuery.trim().length >= 2) return;
        setReleaseGames(prev => {
          const hydratedMap = new Map(hydratedBatch.map(h => [h.id, h]));
          return prev.map(r => hydratedMap.get(r.id) || r);
        });
      })
      .catch(err => {
        console.warn('Non-critical release batch hydration warning:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [releaseGames, searchQuery]);

  // Full Catalog Search effect (searches all 370,000+ games independently of release window)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    activeSearchQueryRef.current = trimmed;

    const handler = setTimeout(async () => {
      if (trimmed.length >= 2) {
        setIsSearching(true);
        try {
          const res = await executeProgressiveTokenSearch(trimmed, 40);
          if (activeSearchQueryRef.current === trimmed) {
            setSearchResults(res.results || []);
            setTotalSearchMatches(res.totalMatchingResults || res.results.length);
          }
        } catch (err) {
          console.error('Full catalog search error:', err);
          if (activeSearchQueryRef.current === trimmed) {
            setSearchResults([]);
            setTotalSearchMatches(0);
          }
        } finally {
          if (activeSearchQueryRef.current === trimmed) {
            setIsSearching(false);
          }
        }
      } else {
        setSearchResults([]);
        setTotalSearchMatches(0);
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Non-blocking async hydration of displayed SEARCH record batch (max 40 records)
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2 || searchResults.length === 0) return;

    let isCurrent = true;
    const batchToHydrate = searchResults.slice(0, 40);

    const needsHydration = batchToHydrate.some(r => !r.coverUrl || r.coverUrl.includes('nocover'));
    if (!needsHydration) return;

    hydrateCompactRecordsBatch(batchToHydrate)
      .then(hydratedBatch => {
        if (!isCurrent || activeSearchQueryRef.current !== trimmedQuery) return;

        setSearchResults(prev => {
          const hydratedMap = new Map(hydratedBatch.map(h => [h.id, h]));
          return prev.map(r => hydratedMap.get(r.id) || r);
        });
      })
      .catch(err => {
        console.warn('Non-critical search batch hydration warning:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [searchResults, searchQuery]);

  const { dateStr: userTodayDate, timezone: userTimezone } = getDynamicLocalDate();

  const isSearchActive = searchQuery.trim().length >= 2;
  const activeGamesList = isSearchActive ? searchResults : releaseGames;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header: Solid Parchment Surface */}
      <div className="themed-panel p-6 md:p-8 rounded-3xl border border-[#c8b584] shadow-xl relative overflow-hidden bg-[#fefcf6] text-[#0f2b48]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Header Title & Date Meta */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--primary-action)] font-bold uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Official Release Feed</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold themed-heading text-[#0c1e36]">
              New Releases
            </h1>
            <p className="text-xs text-[#475569] font-medium leading-relaxed">
              Explore recently launched video games across all major platforms. Filter by timeframe or search over 370,000+ titles in the complete Play Atlas catalog.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#0f2b48] pt-1">
              <span className="flex items-center gap-1 bg-[#ece4d0] px-2.5 py-1 rounded-xl font-bold border border-[#c8b584]">
                <Clock className="w-3.5 h-3.5 text-[var(--primary-action)]" />
                Date: {userTodayDate} ({userTimezone})
              </span>
              <span className="bg-[#ece4d0] px-2.5 py-1 rounded-xl font-bold border border-[#c8b584]">
                {isSearchActive
                  ? `${totalSearchMatches.toLocaleString()} Search Results`
                  : loadingRelease
                  ? 'Loading Feed...'
                  : `${releaseGames.length} Feed Games`}
              </span>
            </div>
          </div>

          {/* Timeframe & View Mode Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* View Mode Selector (First Releases vs Platform Releases) */}
            <div className="flex items-center bg-[#ece4d0] p-1 rounded-2xl border border-[#c8b584]">
              <button
                onClick={() => setViewType('first_release')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewType === 'first_release'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
                title="First-Ever Game Release View"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>First Releases</span>
              </button>
              <button
                onClick={() => setViewType('platform_release')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewType === 'platform_release'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
                title="Platform-Specific Release View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Platform Releases</span>
              </button>
            </div>

            {/* Timeframe Toggles (Day | Week | Month) */}
            <div className="flex items-center bg-[#ece4d0] p-1 rounded-2xl border border-[#c8b584]">
              <button
                onClick={() => setTimeframe('day')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'day'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimeframe('week')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'week'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'month'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Catalog Search Bar (Always Visible & Interactive) */}
      <div className="themed-panel p-4 rounded-2xl border border-[#c8b584] shadow-md bg-[#fefcf6]">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#475569] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search full 370,000+ catalog across all platforms and release windows..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-semibold bg-white text-[#0f2b48] border border-[#c8b584] placeholder:text-[#64748b] focus:ring-2 focus:ring-[var(--focus-ring)] transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 text-[#475569] hover:text-[#0f2b48]"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isSearchActive && (
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#0f2b48] px-1 font-bold">
            <span>Showing full catalog search results for "{searchQuery}"</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[var(--primary-action)] hover:underline"
            >
              Clear search & return to release feed
            </button>
          </div>
        )}
      </div>

      {/* Explicit Load Error Panel (Does NOT disguise errors as zero results) */}
      {!isSearchActive && loadError && (
        <div className="themed-panel p-6 rounded-3xl border border-rose-500/40 bg-rose-50/90 text-rose-950 space-y-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-rose-900">Release catalog failed to load</h3>
              <p className="text-xs text-rose-700 font-mono mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            onClick={loadReleaseCatalog}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4 animate-spin-reverse" />
            <span>Retry Loading Feed</span>
          </button>
        </div>
      )}

      {/* Zero Results Notice for Release Feed */}
      {!isSearchActive && !loadingRelease && !loadError && releaseGames.length === 0 && (
        <div className="themed-panel p-8 text-center rounded-3xl border border-[#c8b584] bg-[#fefcf6] space-y-2">
          <Clock className="w-8 h-8 text-amber-600 mx-auto opacity-80" />
          <h3 className="text-base font-bold themed-heading text-[#0c1e36]">
            0 games matching selected release timeframe ({timeframe})
          </h3>
          <p className="text-xs text-[#475569] max-w-md mx-auto font-medium">
            No releases found for the selected {timeframe} window on {userTodayDate}. Switch to <strong>Week</strong> or <strong>Month</strong> view above, or search the full 370,000+ game catalog using the search bar above.
          </p>
        </div>
      )}

      {/* Always Rendered Filter & Card Grid Surface (GameListGrid) */}
      <GameListGrid
        games={activeGamesList}
        isLoading={isSearchActive ? isSearching : loadingRelease}
        onSelectGame={(id: number) => setSelectedGameId(id)}
      />

      <GameDetailModal
        gameId={selectedGameId}
        onClose={() => setSelectedGameId(null)}
      />
    </div>
  );
};
