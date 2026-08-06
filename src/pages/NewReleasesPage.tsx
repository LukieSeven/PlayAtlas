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

  // Visible games state provided by GameListGrid (incremental batch rendering)
  const [visibleGames, setVisibleGames] = useState<CompactGameLookupRecord[]>([]);

  // Track attempted hydration record IDs to prevent infinite hydration loops
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());

  // Stale async response protection ref
  const activeSearchQueryRef = useRef<string>('');

  // Modal selection state (stores full compact record for instant snapshot rendering)
  const [selectedGame, setSelectedGame] = useState<CompactGameLookupRecord | null>(null);

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

  const isSearchActive = searchQuery.trim().length >= 2;

  // Stable callback handler for GameListGrid visible games changes
  const handleVisibleGamesChange = useCallback((vis: CompactGameLookupRecord[]) => {
    setVisibleGames(vis);
  }, []);

  // Targeted async hydration of currently VISIBLE games batch only
  useEffect(() => {
    if (visibleGames.length === 0) return;

    let isCurrent = true;
    const currentQuery = searchQuery.trim();

    // Filter to visible records whose hydration has not yet been attempted
    const recordsToHydrate = visibleGames.filter(
      r => (!r.coverUrl || r.coverUrl.includes('nocover')) && !attemptedHydrationIdsRef.current.has(r.id)
    );

    if (recordsToHydrate.length === 0) return;

    // Mark as attempted to prevent infinite hydration loops for coverless titles
    recordsToHydrate.forEach(r => attemptedHydrationIdsRef.current.add(r.id));

    hydrateCompactRecordsBatch(recordsToHydrate)
      .then(hydratedBatch => {
        if (!isCurrent) return;
        if (isSearchActive && activeSearchQueryRef.current !== currentQuery) return;

        const hydratedMap = new Map(hydratedBatch.map(h => [h.id, h]));

        const updateCollection = (prev: CompactGameLookupRecord[]) => {
          let hasChange = false;
          const next = prev.map(r => {
            const hydrated = hydratedMap.get(r.id);
            if (!hydrated) return r;

            const isIdentical =
              r.coverUrl === hydrated.coverUrl &&
              r.rating === hydrated.rating &&
              r.developer === hydrated.developer &&
              JSON.stringify(r.genres) === JSON.stringify(hydrated.genres) &&
              JSON.stringify(r.platforms) === JSON.stringify(hydrated.platforms);

            if (isIdentical) return r;

            hasChange = true;
            return hydrated;
          });

          return hasChange ? next : prev;
        };

        if (isSearchActive) {
          setSearchResults(prev => updateCollection(prev));
        } else {
          setReleaseGames(prev => updateCollection(prev));
        }
      })
      .catch(err => {
        console.warn('Non-critical batch hydration warning:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [visibleGames, isSearchActive, searchQuery]);

  const { dateStr: userTodayDate, timezone: userTimezone } = getDynamicLocalDate();

  const activeGamesList = isSearchActive ? searchResults : releaseGames;
  const collectionKey = isSearchActive
    ? `search:${searchQuery.trim().toLowerCase()}`
    : `release:${viewType}:${timeframe}`;

  const releaseHeaderContent = (
      <>
      {/* Top Banner Header: Solid Parchment Surface */}
      <div className="bg-[#EFE8D8]/45 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max relative z-10">
          {/* Header Title & Date Meta */}
          <div className="hidden">
            <span className="flex items-center gap-1 bg-[#ece4d0] px-2.5 py-1 rounded-xl font-bold border border-[#c8b584]">
              <Clock className="w-3.5 h-3.5 text-[var(--primary-action)]" />
              {userTodayDate} · {userTimezone}
            </span>
            <span className="bg-[#ece4d0] px-2.5 py-1 rounded-xl font-bold border border-[#c8b584]">
              {isSearchActive ? `${totalSearchMatches.toLocaleString()} results` : loadingRelease ? 'Loading…' : `${releaseGames.length} games`}
            </span>
          </div>

          {/* Timeframe & View Mode Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* View Mode Selector (First Releases vs Platform Releases) */}
            <div className="flex items-center gap-1 rounded-xl border border-[#C8B584] bg-white/45 p-0.5" role="group" aria-label="Release basis">
              <span className="px-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#6F5B39]">Release basis</span>
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
            <div className="flex items-center gap-1 rounded-xl border border-[#C8B584] bg-white/45 p-0.5" role="group" aria-label="Release window">
              <span className="px-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#6F5B39]">Time window</span>
              <button
                onClick={() => setTimeframe('day')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'day'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeframe('week')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'week'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  timeframe === 'month'
                    ? 'bg-[var(--primary-action)] text-white shadow-md'
                    : 'text-[#0f2b48] hover:bg-white/50'
                }`}
              >
                This Month
              </button>
            </div>
          </div>
        </div>
      </div>

      </>
  );

  const releaseSearchContent = (
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#475569] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search full 370,000+ catalog across all platforms and release windows..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#0f2b48] border border-[#c8b584] placeholder:text-[#64748b] focus:ring-2 focus:ring-[var(--focus-ring)] transition-all shadow-inner"
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
  );

  const releaseNoticeContent = (
    <>

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

    </>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Always Rendered Filter & Card Grid Surface (GameListGrid) */}
      <GameListGrid
        headerContent={releaseHeaderContent}
        searchContent={releaseSearchContent}
        noticeContent={releaseNoticeContent}
        collectionKey={collectionKey}
        games={activeGamesList}
        isLoading={isSearchActive ? isSearching : loadingRelease}
        onSelectGame={(rec: CompactGameLookupRecord) => setSelectedGame(rec)}
        onVisibleGamesChange={handleVisibleGamesChange}
      />

      <GameDetailModal
        selectedGame={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
};
