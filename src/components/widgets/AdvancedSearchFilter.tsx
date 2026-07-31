import React from 'react';
import { Search, Filter, X, ArrowUpDown, Calendar, Gamepad, Building2, Star } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface FilterState {
  searchQuery: string;
  genre: string;
  year: string;
  developer: string;
  platform: string;
  minRating: number;
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
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.genre !== 'all' ||
    filters.year !== 'all' ||
    filters.developer !== 'all' ||
    filters.platform !== 'all' ||
    filters.minRating > 0;

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      {/* Top Search Input & Primary Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Query Input */}
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by title, story, keywords..."
            value={filters.searchQuery}
            onChange={e => updateFilter('searchQuery', e.target.value)}
            icon={<Search className="w-4 h-4 text-indigo-400" />}
          />
        </div>

        {/* Genre Select */}
        <div className="relative">
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

        {/* Release Year Select */}
        <div className="relative">
          <select
            value={filters.year}
            onChange={e => updateFilter('year', e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="all">All Release Years</option>
            {availableYears.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Calendar className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Developer / Studio Select */}
        <div className="relative">
          <select
            value={filters.developer}
            onChange={e => updateFilter('developer', e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="all">All Developers</option>
            {availableDevelopers.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Building2 className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Secondary Row: Platform, Rating, Sort Order & Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform Filter */}
          <div className="relative">
            <select
              value={filters.platform}
              onChange={e => updateFilter('platform', e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              {availablePlatforms.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Gamepad className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Sort Order */}
          <div className="relative flex items-center">
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="bg-slate-900 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="rating">Sort by Rating (Highest)</option>
              <option value="date">Sort by Release Date (Newest)</option>
              <option value="title">Sort by Title (A-Z)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Min Rating Filter Toggle */}
          <button
            onClick={() => updateFilter('minRating', filters.minRating === 9.0 ? 0 : 9.0)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              filters.minRating === 9.0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>9.0+ Masterpieces</span>
          </button>
        </div>

        {/* Results Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Found <span className="font-bold text-indigo-400">{totalResults}</span> games matching criteria
          </span>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Filters:</span>

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

          {filters.year !== 'all' && (
            <Badge variant="amber" className="gap-1">
              Year: {filters.year}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('year', 'all')} />
            </Badge>
          )}

          {filters.developer !== 'all' && (
            <Badge variant="rose" className="gap-1">
              Developer: {filters.developer}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('developer', 'all')} />
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
              Rating: {filters.minRating}+
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
