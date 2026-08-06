import React, { useState, useMemo, useEffect } from 'react';
import { SortAsc, LayoutGrid, List as ListIcon, ShieldAlert, ChevronDown } from 'lucide-react';
import { CompactGameLookupRecord } from '../../types/catalog';
import { GameCard } from '../common/GameCard';
import { getAllFamilies } from '../../services/platformTaxonomyService';
import { MinimumRatingFilter } from '../ui/MinimumRatingFilter';
import { usePersonalGameLibrary } from '../../hooks/usePersonalGameLibrary';
import { getYuckedNumericIds } from '../../utils/personalGameVisibility';
import { matchesCatalogFormat, matchesCatalogPlatformFamily, sortCatalogGames, CatalogSortMode } from '../../utils/gameListControls';

interface GameListGridProps {
  collectionKey?: string;
  games?: CompactGameLookupRecord[];
  totalMatches?: number;
  onSelectGame?: (record: CompactGameLookupRecord) => void;
  onVisibleGamesChange?: (visibleGames: CompactGameLookupRecord[]) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  badge?: string;
  onShareClick?: () => void;
  headerContent?: React.ReactNode;
  searchContent?: React.ReactNode;
  noticeContent?: React.ReactNode;
}

export const GameListGrid: React.FC<GameListGridProps> = ({
  collectionKey = 'default',
  games = [],
  onSelectGame,
  onVisibleGamesChange,
  isLoading = false,
  title,
  description,
  onShareClick,
  headerContent,
  searchContent,
  noticeContent,
}) => {
  const personalRecords = usePersonalGameLibrary();
  const yuckedIds = useMemo(() => getYuckedNumericIds(personalRecords), [personalRecords]);
  const [selectedPlatformFamily, setSelectedPlatformFamily] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minimumRating, setMinimumRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<CatalogSortMode>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Real Incremental Rendering State (Initial batch: 40)
  const [visibleCount, setVisibleCount] = useState<number>(40);

  // Reset visibleCount to 40 ONLY when collectionKey, filters, or sorting change (NOT on record hydration!)
  useEffect(() => {
    setVisibleCount(40);
  }, [collectionKey, selectedPlatformFamily, selectedCategory, minimumRating, sortBy]);

  // Filter games dynamically using PlatformTaxonomyService
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      if (yuckedIds.has(game.id)) return false;
      // Platform Family Filter
      if (!matchesCatalogPlatformFamily(game, selectedPlatformFamily)) return false;

      // Category Filter
      if (!matchesCatalogFormat(game, selectedCategory)) return false;

      if (minimumRating > 0 && (game.rating === undefined || game.rating < minimumRating)) return false;

      return true;
    });
  }, [games, yuckedIds, selectedPlatformFamily, selectedCategory, minimumRating]);

  // Sort games
  const sortedGames = useMemo(() => {
    return sortCatalogGames(filteredGames, sortBy);
  }, [filteredGames, sortBy]);

  // Real Incremental Slice (only mounts visible cards)
  const visibleGames = useMemo(() => {
    return sortedGames.slice(0, visibleCount);
  }, [sortedGames, visibleCount]);

  // Notify parent of visible games change for targeted batch hydration
  useEffect(() => {
    if (onVisibleGamesChange) {
      onVisibleGamesChange(visibleGames);
    }
  }, [visibleGames, onVisibleGamesChange]);

  const platformFamilies = getAllFamilies();

  return (
    <div className="space-y-6">
      {/* Optional Section Header */}
      {title && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold themed-heading">{title}</h2>
            {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>}
          </div>
          {onShareClick && (
            <button
              onClick={onShareClick}
              className="px-3 py-1.5 rounded-xl themed-button-secondary text-xs font-bold"
            >
              Share List
            </button>
          )}
        </div>
      )}

      {/* Solid High-Contrast Filter and Control Bar */}
      <div className="themed-panel rounded-2xl border border-[var(--panel-border)] shadow-md bg-[#fefcf6] overflow-hidden">
        {headerContent && <div>{headerContent}</div>}
        <div className={`p-4 space-y-3 text-xs font-semibold ${headerContent ? 'border-t border-[#D9C8A9]' : ''}`}>
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">{searchContent}</div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0C1D2D]">
              Showing {visibleGames.length} of {sortedGames.length.toLocaleString()}
            </span>
            <div className="flex items-center bg-[#EFE8D8] p-0.5 rounded-xl border border-[#D9C8A9]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D] hover:bg-white/50'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D] hover:bg-white/50'}`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9C8A9]/60 pt-2">
        {/* Left Side Filters */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Platform Taxonomy Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedPlatformFamily}
              onChange={e => setSelectedPlatformFamily(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0f2b48] border border-[#c8b584] focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <option value="all">All Platform Families</option>
              {platformFamilies.map(fam => (
                <option key={fam.key} value={fam.key}>
                  {fam.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0f2b48] border border-[#c8b584] focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
              <option value="all">All Formats</option>
            <option value="main_game">Main Games Only</option>
            <option value="dlc_addon">DLC & Addons</option>
            <option value="pack">Packs & Expansions</option>
            <option value="mod">Mods & ROM Hacks</option>
          </select>

          <MinimumRatingFilter value={minimumRating} onChange={setMinimumRating} />

        </div>

        {/* Right Side Sorting */}
        <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <SortAsc className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0f2b48] border border-[#c8b584] focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <option value="relevance">Search Relevance</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="yearDesc">Release Year (Newest)</option>
              <option value="yearAsc">Release Year (Oldest)</option>
            </select>
          </div>
        </div>
        </div>
        </div>
      </div>

      {noticeContent}

      {/* Grid Results Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] themed-panel rounded-2xl bg-slate-200/50" />
          ))}
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="themed-panel p-12 text-center rounded-3xl space-y-3 border border-[var(--panel-border)] bg-[#fefcf6]">
          <ShieldAlert className="w-10 h-10 mx-auto text-amber-600 opacity-80" />
          <h3 className="text-base font-bold themed-heading">No Matching Games Found</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto font-medium">
            Try resetting platform or category filters to view more titles in the Play Atlas catalog.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
            {visibleGames.map(game => (
              <GameCard key={game.id} game={game} onSelect={onSelectGame} />
            ))}
          </div>

          {/* Load 20 More Button */}
          {visibleCount < sortedGames.length && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary-action)] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>Load 20 More</span>
                <ChevronDown className="w-4 h-4" />
                <span className="text-[10px] opacity-80 font-mono">({sortedGames.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
