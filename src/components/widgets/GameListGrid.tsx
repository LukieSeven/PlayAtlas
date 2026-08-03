import React, { useState, useMemo } from 'react';
import { Filter, SortAsc, LayoutGrid, List as ListIcon, ShieldAlert } from 'lucide-react';
import { CompactGameLookupRecord } from '../../types/catalog';
import { normalizeGameTypeCategory } from '../../utils/gameTypeUtils';
import { GameCard } from '../common/GameCard';
import { getAllFamilies, getPlatformFamily } from '../../services/platformTaxonomyService';

interface GameListGridProps {
  games?: CompactGameLookupRecord[];
  totalMatches?: number;
  onSelectGame?: (gameId: number, name: string) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  badge?: string;
  onShareClick?: () => void;
}

export const GameListGrid: React.FC<GameListGridProps> = ({
  games = [],
  onSelectGame,
  isLoading = false,
  title,
  description,
  onShareClick,
}) => {
  const [selectedPlatformFamily, setSelectedPlatformFamily] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'name' | 'yearAsc' | 'yearDesc'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter games dynamically using PlatformTaxonomyService
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Platform Family Filter
      if (selectedPlatformFamily !== 'all') {
        const matchFamily = selectedPlatformFamily === 'all' || getPlatformFamily(game.id) === selectedPlatformFamily;
        if (!matchFamily) return false;
      }

      // Category Filter
      if (selectedCategory !== 'all') {
        const cat = normalizeGameTypeCategory(game.gameType || undefined, game.name);
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [games, selectedPlatformFamily, selectedCategory]);

  // Sort games
  const sortedGames = useMemo(() => {
    const list = [...filteredGames];
    switch (sortBy) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'yearAsc':
        return list.sort((a, b) => (a.year || 0) - (b.year || 0));
      case 'yearDesc':
        return list.sort((a, b) => (b.year || 0) - (a.year || 0));
      case 'relevance':
      default:
        return list; // Retain deterministic search ranking order
    }
  }, [filteredGames, sortBy]);

  const platformFamilies = getAllFamilies();

  return (
    <div className="space-y-6">
      {/* Optional Section Header */}
      {title && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold themed-heading">{title}</h2>
            {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
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

      {/* Filter and Control Bar */}
      <div className="themed-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-[var(--panel-border)] shadow-md">
        {/* Left Side Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          {/* Platform Taxonomy Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            <select
              value={selectedPlatformFamily}
              onChange={e => setSelectedPlatformFamily(e.target.value)}
              className="themed-input px-3 py-1.5 rounded-xl text-xs font-bold"
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
            className="themed-input px-3 py-1.5 rounded-xl text-xs font-bold"
          >
            <option value="all">All Game Types</option>
            <option value="main_game">Main Games Only</option>
            <option value="dlc_addon">DLC & Addons</option>
            <option value="pack">Packs & Expansions</option>
            <option value="mod">Mods & ROM Hacks</option>
          </select>
        </div>

        {/* Right Side Sorting & Layout Toggle */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <SortAsc className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="themed-input px-3 py-1.5 rounded-xl text-xs font-bold"
            >
              <option value="relevance">Search Relevance</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="yearDesc">Release Year (Newest)</option>
              <option value="yearAsc">Release Year (Oldest)</option>
            </select>
          </div>

          {/* Grid / List Mode Controls */}
          <div className="flex items-center bg-[rgba(0,0,0,0.1)] p-0.5 rounded-xl border border-[var(--panel-border)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[var(--primary-action)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[var(--primary-action)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Results Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] themed-panel rounded-2xl bg-slate-800/40" />
          ))}
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="themed-panel p-12 text-center rounded-3xl space-y-3 border border-[var(--panel-border)]">
          <ShieldAlert className="w-10 h-10 mx-auto text-amber-500 opacity-60" />
          <h3 className="text-base font-bold themed-heading">No Matching Games Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Try resetting platform or category filters to view more titles in the Play Atlas catalog.
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
          {sortedGames.map(game => (
            <GameCard key={game.id} game={game} onSelect={onSelectGame} />
          ))}
        </div>
      )}
    </div>
  );
};
