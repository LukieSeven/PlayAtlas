import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  BookmarkPlus,
  RefreshCw,
  Search,
  Loader2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GameItem } from '../../types/game';
import { AdvancedSearchFilter, FilterState } from './AdvancedSearchFilter';
import { executeProgressiveTokenSearch } from '../../services/tokenSearchService';
import { fetchGameDetailsForCompactRecords, normalizeEntityName } from '../../services/catalogDetailService';
import { queryReleaseCatalog } from '../../services/releaseCatalogService';
import { GameDetailModal } from './GameDetailModal';
import { SearchErrorBoundary } from '../common/ErrorBoundary';

interface GameListGridProps {
  title?: string;
  description?: string;
  badge?: string;
  games?: GameItem[];
  showControls?: boolean;
  showRankNumbers?: boolean; // Default false for unranked discovery cards
  onShareClick?: () => void;
}

const initialFilterState: FilterState = {
  searchQuery: '',
  category: 'Main Games', // Defaults strictly to Main Games
  genre: 'all',
  platform: 'all',
  minRating: 0,
  developer: 'all',
  publisher: 'all',
  status: 'all',
  year: 'all',
  gameMode: 'all',
  perspective: 'all',
  theme: 'all',
  sortBy: 'rating',
};

export const GameListGrid: React.FC<GameListGridProps> = ({
  games: initialGames,
  showControls = true,
  showRankNumbers = false, // Unranked discovery cards by default
}) => {
  const [liveGames, setLiveGames] = useState<GameItem[]>(initialGames || []);
  const [loading, setLoading] = useState<boolean>(!initialGames || initialGames.length === 0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTotalCount, setSearchTotalCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'cards' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [selectedGameForModal, setSelectedGameForModal] = useState<{ id: string; title: string } | null>(null);

  // Permanently lock liveGames to initialGames when provided as props
  useEffect(() => {
    if (initialGames) {
      setLiveGames(initialGames);
      setLoading(false);
    }
  }, [initialGames]);

  // Fetch initial releases ONLY if no initialGames prop was provided and searchQuery is empty
  useEffect(() => {
    if ((!initialGames || initialGames.length === 0) && filters.searchQuery.trim().length === 0) {
      let isMounted = true;
      setLoading(true);
      setSearchError(null);

      queryReleaseCatalog({ viewType: 'first_release', timeframe: 'month' })
        .then(data => {
          if (isMounted) {
            setLiveGames(data.games);
            setSearchTotalCount(data.games.length);
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Failed to load initial catalog releases:', err);
          if (isMounted) {
            setSearchError('Failed to load initial catalog.');
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [initialGames, filters.searchQuery]);

  // Handle Live Token Search via Production IGDB Token Catalog
  useEffect(() => {
    const trimmed = filters.searchQuery.trim();

    if (trimmed.length >= 2) {
      let isMounted = true;
      setLoading(true);
      setSearchError(null);

      const timer = setTimeout(() => {
        executeProgressiveTokenSearch(trimmed, 40)
          .then(async ({ results, report }) => {
            if (!isMounted) return;

            setSearchTotalCount(report.postingListIdCount);

            if (results.length === 0) {
              setLiveGames([]);
              setLoading(false);
              return;
            }

            // Batch load full detail records for top compact search results
            const detailItems = await fetchGameDetailsForCompactRecords(results);
            if (isMounted) {
              setLiveGames(detailItems);
              setLoading(false);
            }
          })
          .catch(err => {
            console.error('Production IGDB token search error:', err);
            if (isMounted) {
              setSearchError(`Search error: ${err?.message || 'Failed to execute token search.'}`);
              setLiveGames([]);
              setLoading(false);
            }
          });
      }, 350);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [filters.searchQuery]);

  // Extract unique criteria values for dropdown options - strictly string primitives
  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    liveGames.forEach(g => {
      if (Array.isArray(g.genres)) {
        g.genres.forEach(genre => {
          const name = normalizeEntityName(genre);
          if (name) genresSet.add(name);
        });
      }
    });
    return Array.from(genresSet).sort();
  }, [liveGames]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    liveGames.forEach(g => {
      const year = new Date(g.releaseDate).getFullYear().toString();
      if (!isNaN(parseInt(year, 10))) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [liveGames]);

  const availableDevelopers = useMemo(() => {
    const devsSet = new Set<string>();
    liveGames.forEach(g => {
      const devName = normalizeEntityName(g.developer);
      if (devName) devsSet.add(devName);
    });
    return Array.from(devsSet).sort();
  }, [liveGames]);

  const availablePlatforms = useMemo(() => {
    const platSet = new Set<string>();
    liveGames.forEach(g => {
      if (Array.isArray(g.platforms)) {
        g.platforms.forEach(p => {
          const platName = normalizeEntityName(p);
          if (platName) platSet.add(platName);
        });
      }
    });
    return Array.from(platSet).sort();
  }, [liveGames]);

  // Multi-criteria filtering logic
  const filteredGames = useMemo(() => {
    return liveGames
      .filter(game => {
        // Main Games alignment: includes default-visible types (Base Game & Remake/Remaster)
        // Excludes DLC / Expansion, Bundle, Mod when 'Main Games' filter is selected
        if (filters.category === 'Main Games') {
          if (game.category === 'DLC / Expansion' || game.category === 'Bundle' || game.category === 'Mod') {
            return false;
          }
        } else if (filters.category !== 'All' && filters.category !== 'Main Games') {
          if (game.category !== filters.category) return false;
        }

        // Genre filter
        if (filters.genre !== 'all') {
          const hasGenre = Array.isArray(game.genres) && game.genres.some(g => normalizeEntityName(g) === filters.genre);
          if (!hasGenre) return false;
        }

        // Year filter
        if (filters.year !== 'all') {
          const gameYear = new Date(game.releaseDate).getFullYear().toString();
          if (gameYear !== filters.year) return false;
        }

        // Developer filter
        if (filters.developer !== 'all') {
          if (normalizeEntityName(game.developer) !== filters.developer) return false;
        }

        // Platform filter
        if (filters.platform !== 'all') {
          const hasPlat = Array.isArray(game.platforms) && game.platforms.some(p => normalizeEntityName(p) === filters.platform);
          if (!hasPlat) return false;
        }

        // Min rating filter
        if (filters.minRating > 0 && game.rating < filters.minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'rating') return b.rating - a.rating;
        if (filters.sortBy === 'title') return normalizeEntityName(a.title).localeCompare(normalizeEntityName(b.title));
        if (filters.sortBy === 'date') return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        return 0;
      });
  }, [liveGames, filters]);

  const getCategoryBadgeVariant = (cat?: string) => {
    if (cat === 'DLC / Expansion') return 'purple';
    if (cat === 'Bundle') return 'amber';
    if (cat === 'Remake') return 'cyan';
    return 'indigo';
  };

  const isSearching = filters.searchQuery.trim().length >= 2;

  return (
    <div className="space-y-4">
      {/* 2-Tier Search & Filter Bar */}
      {showControls && (
        <AdvancedSearchFilter
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(initialFilterState)}
          availableGenres={availableGenres}
          availableYears={availableYears}
          availableDevelopers={availableDevelopers}
          availablePlatforms={availablePlatforms}
          totalResults={isSearching ? searchTotalCount : filteredGames.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Result Count Banner when searching */}
      {isSearching && !loading && !searchError && (
        <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex items-center justify-between text-xs font-mono text-slate-300">
          <span>
            Showing <strong className="text-indigo-400 font-extrabold">{Math.min(filteredGames.length, 20)}</strong> of{' '}
            <strong className="text-cyan-400 font-extrabold">{searchTotalCount.toLocaleString()}</strong> matching games
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Production IGDB Search</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">Searching production IGDB token catalog (.json.gz)...</span>
        </div>
      )}

      {/* Search Error State */}
      {!loading && searchError && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono space-y-2">
          <div className="font-bold text-sm">❌ Search Exception</div>
          <div>{searchError}</div>
        </div>
      )}

      {/* Empty State when no games match search filters */}
      {!loading && !searchError && filteredGames.length === 0 && (
        <Card glass className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">No games match your search criteria</h4>
            <p className="text-xs text-slate-400 mt-1">Try searching for a different title or resetting your filters.</p>
          </div>
          <Button variant="glow" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => setFilters(initialFilterState)}>
            Reset All Filters
          </Button>
        </Card>
      )}

      {/* Error-Bounded Search Result Cards */}
      {!loading && !searchError && filteredGames.length > 0 && (
        <SearchErrorBoundary onReset={() => setFilters(initialFilterState)}>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredGames.slice(0, 20).map((game, index) => {
                const safeTitle = typeof game.title === 'string' ? game.title : normalizeEntityName(game.title, 'Untitled Game');
                const safeDeveloper = typeof game.developer === 'string' ? game.developer : normalizeEntityName(game.developer, 'Unknown Developer');
                const safeSummary = typeof game.summary === 'string' ? game.summary : 'No summary available.';
                const safeGenres = Array.isArray(game.genres)
                  ? game.genres.map(g => normalizeEntityName(g)).filter(Boolean)
                  : ['Action'];

                return (
                  <Card
                    key={game.id}
                    interactive
                    glass
                    onClick={() => setSelectedGameForModal({ id: game.id, title: safeTitle })}
                    className="group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                        <img
                          src={game.coverUrl}
                          alt={safeTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Rank Badge ONLY shown if explicitly enabled */}
                        {showRankNumbers && (
                          <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-amber-400">
                            #{index + 1}
                          </div>
                        )}

                        {/* Category Type Badge */}
                        <div className="absolute bottom-2 left-2">
                          <Badge variant={getCategoryBadgeVariant(game.category)}>
                            {game.category || 'Base Game'}
                          </Badge>
                        </div>

                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-xs font-bold text-emerald-400">
                          <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                          <span>{game.rating}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-400 mb-1">
                        <span className="truncate max-w-[120px]">{safeDeveloper}</span>
                        <span className="text-slate-500 font-mono">{new Date(game.releaseDate).getFullYear() || '2026'}</span>
                      </div>

                      <h4 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {safeTitle}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{safeSummary}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {safeGenres.slice(0, 2).map((g, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {g}
                          </span>
                        ))}
                      </div>
                      <button className="text-slate-400 hover:text-indigo-400 transition-colors" title="Bookmark">
                        <BookmarkPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGames.slice(0, 20).map((game, index) => {
                const safeTitle = typeof game.title === 'string' ? game.title : normalizeEntityName(game.title, 'Untitled Game');
                const safeDeveloper = typeof game.developer === 'string' ? game.developer : normalizeEntityName(game.developer, 'Unknown Developer');
                const safeSummary = typeof game.summary === 'string' ? game.summary : 'No summary available.';

                return (
                  <Card
                    key={game.id}
                    interactive
                    glass
                    onClick={() => setSelectedGameForModal({ id: game.id, title: safeTitle })}
                    className="flex flex-col sm:flex-row gap-4 p-4 cursor-pointer"
                  >
                    <div className="shrink-0 relative w-full sm:w-36 aspect-[3/4] rounded-xl overflow-hidden">
                      <img src={game.coverUrl} alt={safeTitle} className="w-full h-full object-cover" />
                      {showRankNumbers && (
                        <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-amber-400">
                          #{index + 1}
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <Badge variant={getCategoryBadgeVariant(game.category)}>
                          {game.category || 'Base Game'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{safeDeveloper}</span>
                          <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                            <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                            <span>{game.rating}</span>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-white mt-1">{safeTitle}</h4>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{safeSummary}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          {game.releaseDate}
                        </span>
                        <Button variant="ghost" size="sm">Details</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {filteredGames.slice(0, 20).map((game, index) => {
                const safeTitle = typeof game.title === 'string' ? game.title : normalizeEntityName(game.title, 'Untitled Game');
                const safeDeveloper = typeof game.developer === 'string' ? game.developer : normalizeEntityName(game.developer, 'Unknown Developer');
                const safeGenres = Array.isArray(game.genres)
                  ? game.genres.map(g => normalizeEntityName(g)).filter(Boolean)
                  : ['Action'];
                const safePlatforms = Array.isArray(game.platforms)
                  ? game.platforms.map(p => normalizeEntityName(p)).filter(Boolean)
                  : ['PC'];

                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGameForModal({ id: game.id, title: safeTitle })}
                    className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between hover:border-indigo-500/40 transition-colors gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {showRankNumbers && (
                        <span className="w-6 font-mono font-bold text-indigo-400 text-sm">#{index + 1}</span>
                      )}
                      <img src={game.coverUrl} alt={safeTitle} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{safeTitle}</h4>
                          <Badge variant={getCategoryBadgeVariant(game.category)}>
                            {game.category || 'Base Game'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{safeDeveloper} • {safeGenres.join(', ')} • {safePlatforms.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                        <Star className="w-3.5 h-3.5 fill-emerald-400" />
                        <span>{game.rating}</span>
                      </div>
                      <Button variant="outline" size="sm">Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SearchErrorBoundary>
      )}

      {/* Game Detail Modal */}
      {selectedGameForModal && (
        <GameDetailModal
          gameId={selectedGameForModal.id}
          initialTitle={selectedGameForModal.title}
          onClose={() => setSelectedGameForModal(null)}
        />
      )}
    </div>
  );
};
