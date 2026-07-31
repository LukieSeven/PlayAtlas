import React, { useState, useMemo, useEffect } from 'react';
import {
  Grid,
  List as ListIcon,
  LayoutGrid,
  Star,
  Share2,
  Calendar,
  BookmarkPlus,
  RefreshCw,
  Search,
  Loader2,
  Globe
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GameItem } from '../../types/game';
import { AdvancedSearchFilter, FilterState } from './AdvancedSearchFilter';
import { fetchCuratedGames, searchGamesByQuery } from '../../services/gameDbService';

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
  category: 'Main Games', // Defaults to Main Games
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
  title = 'Top 10 Game of the Year (GOTY 2026)',
  description = 'Live game metadata fetched from GameDB CDN.',
  badge = 'LIVE GAMEDB FEED',
  games: initialGames,
  showControls = true,
  showRankNumbers = false, // Unranked discovery cards by default
  onShareClick,
}) => {
  const [liveGames, setLiveGames] = useState<GameItem[]>(initialGames || []);
  const [loading, setLoading] = useState<boolean>(!initialGames || initialGames.length === 0);
  const [viewMode, setViewMode] = useState<'grid' | 'cards' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  // Sync internal games state when initialGames prop changes
  useEffect(() => {
    if (initialGames) {
      setLiveGames(initialGames);
      setLoading(false);
    }
  }, [initialGames]);

  // Fetch live games from GameDB CDN if no initialGames provided
  useEffect(() => {
    if (!initialGames || initialGames.length === 0) {
      let isMounted = true;
      setLoading(true);
      fetchCuratedGames().then(data => {
        if (isMounted) {
          setLiveGames(data);
          setLoading(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [initialGames]);

  // Handle Live Query Search via GameDB CDN Bucket Search
  useEffect(() => {
    if (filters.searchQuery.trim().length >= 2) {
      let isMounted = true;
      setLoading(true);
      const timer = setTimeout(() => {
        searchGamesByQuery(filters.searchQuery).then(data => {
          if (isMounted) {
            setLiveGames(data);
            setLoading(false);
          }
        });
      }, 400);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else if (filters.searchQuery.trim().length === 0 && !initialGames) {
      setLoading(true);
      fetchCuratedGames().then(data => {
        setLiveGames(data);
        setLoading(false);
      });
    }
  }, [filters.searchQuery, initialGames]);

  // Extract unique criteria values for dropdown options
  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    liveGames.forEach(g => g.genres.forEach(genre => genresSet.add(genre)));
    return Array.from(genresSet).sort();
  }, [liveGames]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    liveGames.forEach(g => {
      const year = new Date(g.releaseDate).getFullYear().toString();
      if (!isNaN(parseInt(year))) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [liveGames]);

  const availableDevelopers = useMemo(() => {
    const devsSet = new Set<string>();
    liveGames.forEach(g => devsSet.add(g.developer));
    return Array.from(devsSet).sort();
  }, [liveGames]);

  const availablePlatforms = useMemo(() => {
    const platSet = new Set<string>();
    liveGames.forEach(g => g.platforms.forEach(p => platSet.add(p)));
    return Array.from(platSet).sort();
  }, [liveGames]);

  // Multi-criteria filtering logic
  const filteredGames = useMemo(() => {
    return liveGames
      .filter(game => {
        // Category Filter (Defaults to Main Games)
        if (filters.category === 'Main Games' && game.category && game.category !== 'Base Game') {
          return false;
        } else if (filters.category !== 'All' && filters.category !== 'Main Games') {
          if (game.category !== filters.category) return false;
        }

        // Genre filter
        if (filters.genre !== 'all' && !game.genres.includes(filters.genre)) {
          return false;
        }

        // Year filter
        if (filters.year !== 'all') {
          const gameYear = new Date(game.releaseDate).getFullYear().toString();
          if (gameYear !== filters.year) return false;
        }

        // Developer filter
        if (filters.developer !== 'all' && game.developer !== filters.developer) {
          return false;
        }

        // Platform filter
        if (filters.platform !== 'all' && !game.platforms.includes(filters.platform)) {
          return false;
        }

        // Min rating filter
        if (filters.minRating > 0 && game.rating < filters.minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'rating') return b.rating - a.rating;
        if (filters.sortBy === 'title') return a.title.localeCompare(b.title);
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="indigo">{badge}</Badge>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              {loading ? 'Fetching GameDB...' : `${filteredGames.length} Games Shown`}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Layout View Mode Toggles */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Large Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Compact List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {onShareClick && (
            <Button variant="outline" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} onClick={onShareClick}>
              Share List
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Multi-Criteria Search & Filter Bar */}
      {showControls && (
        <AdvancedSearchFilter
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(initialFilterState)}
          availableGenres={availableGenres}
          availableYears={availableYears}
          availableDevelopers={availableDevelopers}
          availablePlatforms={availablePlatforms}
          totalResults={filteredGames.length}
        />
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">Fetching live game metadata from GameDB CDN...</span>
        </div>
      )}

      {/* Empty State when no games match search filters */}
      {!loading && filteredGames.length === 0 && (
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

      {/* Rendered Games Container - Unranked Cover Cards */}
      {!loading && viewMode === 'grid' && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredGames.map((game, index) => (
            <Card key={game.id} interactive glass className="group flex flex-col justify-between">
              <div>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                  <img
                    src={game.coverUrl}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Optional Rank Badge (Only shown if explicitly enabled) */}
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
                  <span className="truncate max-w-[120px]">{game.developer}</span>
                  <span className="text-slate-500 font-mono">{new Date(game.releaseDate).getFullYear() || '2026'}</span>
                </div>

                <h4 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {game.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{game.summary}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {game.genres.slice(0, 2).map((g, i) => (
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
          ))}
        </div>
      )}

      {!loading && viewMode === 'cards' && filteredGames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGames.map((game, index) => (
            <Card key={game.id} interactive glass className="flex flex-col sm:flex-row gap-4 p-4">
              <div className="shrink-0 relative w-full sm:w-36 aspect-[3/4] rounded-xl overflow-hidden">
                <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
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
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{game.developer}</span>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                      <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                      <span>{game.rating}</span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1">{game.title}</h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{game.summary}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {game.releaseDate}
                  </span>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && viewMode === 'list' && filteredGames.length > 0 && (
        <div className="space-y-2">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between hover:border-indigo-500/40 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                {showRankNumbers && (
                  <span className="w-6 font-mono font-bold text-indigo-400 text-sm">#{index + 1}</span>
                )}
                <img src={game.coverUrl} alt={game.title} className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{game.title}</h4>
                    <Badge variant={getCategoryBadgeVariant(game.category)}>
                      {game.category || 'Base Game'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">{game.developer} • {game.genres.join(', ')} • {game.platforms.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                  <Star className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>{game.rating}</span>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
