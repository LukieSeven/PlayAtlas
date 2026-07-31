import React, { useState } from 'react';
import { Search, Filter, X, ArrowUpDown, Calendar, Gamepad, Building2, Star, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface FilterState {
  searchQuery: string;
  category: string; // 'Main Games' | 'All' | 'DLC & Add-ons' | 'Expansions' | 'Bundles & Collections' | 'Remakes & Remasters' | 'Mods'
  genre: string;
  platform: string;
  minRating: number; // 0 to 10 scale
  developer: string;
  publisher: string;
  status: string; // 'all' | 'released' | 'upcoming'
  year: string;
  gameMode: string; // 'all' | 'singleplayer' | 'online_coop' | 'local_coop'
  perspective: string; // 'all' | 'third_person' | 'first_person' | 'top_down' | 'isometric' | 'vr'
  theme: string;
  sortBy: 'rating' | 'title' | 'date';
}

interface AdvancedSearchFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  availableGenres: string[];
  availableYears: string[];
  availableDevelopers: string[];
  availablePlatforms: string[];
  totalResults: number;
}

export const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableGenres,
  availableYears,
  availableDevelopers,
  availablePlatforms,
  totalResults,
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState<boolean>(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.category !== 'Main Games' ||
    filters.genre !== 'all' ||
    filters.platform !== 'all' ||
    filters.minRating > 0 ||
    filters.developer !== 'all' ||
    filters.publisher !== 'all' ||
    filters.status !== 'all' ||
    filters.year !== 'all' ||
    filters.gameMode !== 'all' ||
    filters.perspective !== 'all' ||
    filters.theme !== 'all';

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      {/* Tier 1: Primary Search & Filter Bar (Always Visible) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Query Input */}
        <div className="lg:col-span-4">
          <Input
            placeholder="Search titles, plot, keywords..."
            value={filters.searchQuery}
            onChange={e => updateFilter('searchQuery', e.target.value)}
            icon={<Search className="w-4 h-4 text-indigo-400" />}
          />
        </div>

        {/* Category Dropdown (Defaults to Main Games) */}
        <div className="lg:col-span-2 relative">
          <select
            value={filters.category}
            onChange={e => updateFilter('category', e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="Main Games">Main Games</option>
            <option value="All">All</option>
            <option value="DLC / Expansion">DLC & Add-ons</option>
            <option value="Bundle">Bundles & Collections</option>
            <option value="Remake">Remakes & Remasters</option>
            <option value="Mod">Mods</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-indigo-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Genre Selector */}
        <div className="lg:col-span-2 relative">
          <select
            value={filters.genre}
            onChange={e => updateFilter('genre', e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="all">All Genres</option>
            {availableGenres.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Platform Selector */}
        <div className="lg:col-span-2 relative">
          <select
            value={filters.platform}
            onChange={e => updateFilter('platform', e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="all">All Platforms</option>
            {availablePlatforms.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Gamepad className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Advanced Filters Button */}
        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={() => setShowAdvancedPanel(prev => !prev)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
              showAdvancedPanel || hasActiveFilters
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Advanced Filters</span>
            {showAdvancedPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive 10-Star Rating Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400">Rating:</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(starNum => {
              const isHighlighted = (hoverRating || filters.minRating) >= starNum;
              return (
                <button
                  key={starNum}
                  type="button"
                  onMouseEnter={() => setHoverRating(starNum)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => updateFilter('minRating', filters.minRating === starNum ? 0 : starNum)}
                  className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                  title={`Filter games rated ${starNum}/10 or higher`}
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      isHighlighted
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'fill-slate-800 text-slate-700 hover:text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          {filters.minRating > 0 && (
            <span className="text-xs font-bold font-mono text-amber-400 ml-1">{filters.minRating}+ Stars</span>
          )}
        </div>

        {/* Sort Selector & Results Count */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="rating">Sort by Rating (Highest)</option>
              <option value="date">Sort by Release Date (Newest)</option>
              <option value="title">Sort by Title (A-Z)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
          </div>

          <span className="text-xs font-mono text-slate-400">
            Found <span className="font-bold text-indigo-400">{totalResults}</span> games
          </span>
        </div>
      </div>

      {/* Tier 2: Expandable Advanced Filters Panel */}
      {showAdvancedPanel && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
              Advanced Multi-Criteria Filters
            </span>
            <span className="text-[10px] text-slate-500 font-mono">15 Total Filter Criteria</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Developer Studio */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Developer Studio</label>
              <div className="relative">
                <select
                  value={filters.developer}
                  onChange={e => updateFilter('developer', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Developers</option>
                  {availableDevelopers.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Building2 className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Release Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Release Status</label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={e => updateFilter('status', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="released">Released Games</option>
                  <option value="upcoming">Upcoming Games</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Release Year */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Release Year</label>
              <div className="relative">
                <select
                  value={filters.year}
                  onChange={e => updateFilter('year', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Release Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Game Mode / Co-Op */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Game Mode / Co-Op</label>
              <div className="relative">
                <select
                  value={filters.gameMode}
                  onChange={e => updateFilter('gameMode', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Modes</option>
                  <option value="singleplayer">Single-Player</option>
                  <option value="online_coop">Online Co-Op</option>
                  <option value="local_coop">Local / Couch Co-Op</option>
                </select>
                <Gamepad className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>

          {filters.category !== 'Main Games' && (
            <Badge variant="indigo" className="gap-1">
              Category: {filters.category}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('category', 'Main Games')} />
            </Badge>
          )}

          {filters.searchQuery && (
            <Badge variant="indigo" className="gap-1">
              Query: "{filters.searchQuery}"
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('searchQuery', '')} />
            </Badge>
          )}

          {filters.genre !== 'all' && (
            <Badge variant="cyan" className="gap-1">
              Genre: {filters.genre}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('genre', 'all')} />
            </Badge>
          )}

          {filters.platform !== 'all' && (
            <Badge variant="purple" className="gap-1">
              Platform: {filters.platform}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('platform', 'all')} />
            </Badge>
          )}

          {filters.minRating > 0 && (
            <Badge variant="amber" className="gap-1">
              Rating: {filters.minRating}/10+ Stars
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('minRating', 0)} />
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={onResetFilters} className="text-xs text-rose-400 hover:text-rose-300">
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
