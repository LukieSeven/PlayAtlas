import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Gamepad2,
  Package,
  Clock,
  Bookmark,
  Trophy,
  Heart,
  XCircle,
  Search,
  SortAsc,
  LayoutGrid,
  List as ListIcon,
  ShieldAlert,
  ChevronDown,
  Download,
  Edit3,
  Star,
} from 'lucide-react';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import { PersonalGameRecord } from '../types/personal';
import { CompactGameLookupRecord } from '../types/catalog';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { UniversalActionMenu } from '../components/common/UniversalActionMenu';
import { CompletionModal } from '../components/widgets/CompletionModal';
import { EditPersonalDetailsModal } from '../components/widgets/EditPersonalDetailsModal';
import { ExportImportModal } from '../components/widgets/ExportImportModal';
import { getAllFamilies, getPlatformFamily, getPlatformDisplayName } from '../services/platformTaxonomyService';
import { hydrateCompactRecordsBatch, convertPersonalRecordToCompact } from '../services/catalogDetailService';
import { MinimumRatingFilter } from '../components/ui/MinimumRatingFilter';
import { SplatIcon } from '../components/ui/SplatIcon';

type MyGamesViewTab = 'all' | 'owned' | 'playing' | 'backlog' | 'completed' | 'wanted' | 'dropped';

export const MyGamesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRecords = usePersonalGameLibrary();

  // Tab View state (Synced with URL ?view=)
  const viewParam = (searchParams.get('view') || 'all').toLowerCase();
  const activeTab: MyGamesViewTab = ['all', 'owned', 'playing', 'backlog', 'completed', 'wanted', 'dropped'].includes(viewParam)
    ? (viewParam as MyGamesViewTab)
    : 'all';

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlatformFamily, setSelectedPlatformFamily] = useState<string>('all');
  const [selectedOwnershipType, setSelectedOwnershipType] = useState<string>('all');
  const [selectedPlayStatus, setSelectedPlayStatus] = useState<string>('all');
  const [selectedInterestStatus, setSelectedInterestStatus] = useState<string>('all');
  const [minimumRating, setMinimumRating] = useState<number>(0);

  // Sorting State
  const [sortBy, setSortBy] = useState<
    'recently_updated' | 'recently_added' | 'title_asc' | 'title_desc' | 'year_newest' | 'year_oldest' | 'rating_highest' | 'backlog_priority' | 'completion_recent'
  >('recently_updated');

  // Layout View Mode (grid vs list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('playatlas_mygames_viewmode') as 'grid' | 'list') || 'grid';
  });

  // Incremental Pagination State (Initial: 40, Load More: 20)
  const [visibleCount, setVisibleCount] = useState<number>(40);

  // Hydration state for displayed compact records
  const [hydratedCompactMap, setHydratedCompactMap] = useState<Map<number, CompactGameLookupRecord>>(new Map());
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());

  // Modal dialog states
  const [selectedGameForModal, setSelectedGameForModal] = useState<CompactGameLookupRecord | null>(null);
  const [completionGameTarget, setCompletionGameTarget] = useState<{ id: string | number; title: string; coverUrl?: string; year?: number } | null>(null);
  const [editDetailsTarget, setEditDetailsTarget] = useState<{ record: PersonalGameRecord; title: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Save viewMode preference to localStorage
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('playatlas_mygames_viewmode', mode);
  };

  const handleTabChange = (tab: MyGamesViewTab) => {
    if (tab === 'all') {
      searchParams.delete('view');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ view: tab });
    }
  };

  // Derive meaningful tracked records (excludes empty records)
  const meaningfulRecords = useMemo(() => {
    return rawRecords.filter(rec => {
      return (
        Boolean(rec.interestStatus) ||
        Boolean(rec.currentPlayStatus) ||
        Boolean(rec.inBacklogQueue) ||
        (rec.userRating !== undefined && rec.userRating !== null) ||
        (rec.userNotes && rec.userNotes.trim().length > 0) ||
        (rec.ownerships && rec.ownerships.length > 0) ||
        (rec.customTags && rec.customTags.length > 0) ||
        (rec.playSessions && rec.playSessions.length > 0) ||
        (rec.completionHistory && rec.completionHistory.length > 0)
      );
    });
  }, [rawRecords]);

  // Tab Count Definitions
  const counts = useMemo(() => {
    const visibleRecords = meaningfulRecords.filter(r => r.currentPlayStatus !== 'dropped');
    return {
      all: visibleRecords.length,
      owned: visibleRecords.filter(r => r.ownerships && r.ownerships.length > 0).length,
      playing: visibleRecords.filter(r => r.currentPlayStatus === 'playing').length,
      backlog: visibleRecords.filter(r => r.inBacklogQueue).length,
      completed: visibleRecords.filter(r => r.currentPlayStatus === 'completed' || (r.completionHistory && r.completionHistory.length > 0)).length,
      wanted: visibleRecords.filter(r => r.interestStatus === 'wanted' || r.interestStatus === 'wishlist').length,
      dropped: meaningfulRecords.filter(r => r.currentPlayStatus === 'dropped').length,
    };
  }, [meaningfulRecords]);

  // Apply Tab View + Search + Filters
  const filteredRecords = useMemo(() => {
    return meaningfulRecords.filter(rec => {
      if (activeTab !== 'dropped' && rec.currentPlayStatus === 'dropped') return false;
      // 1. Primary Tab View Filter
      switch (activeTab) {
        case 'owned':
          if (!rec.ownerships || rec.ownerships.length === 0) return false;
          break;
        case 'playing':
          if (rec.currentPlayStatus !== 'playing') return false;
          break;
        case 'backlog':
          if (!rec.inBacklogQueue) return false;
          break;
        case 'completed':
          if (rec.currentPlayStatus !== 'completed' && (!rec.completionHistory || rec.completionHistory.length === 0)) return false;
          break;
        case 'wanted':
          if (rec.interestStatus !== 'wanted' && rec.interestStatus !== 'wishlist') return false;
          break;
        case 'dropped':
          if (rec.currentPlayStatus !== 'dropped') return false;
          break;
        case 'all':
        default:
          break;
      }

      // 2. Search Text Filter (Matches Title, Notes, Tags, Storefronts, Owned Platforms)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const title = (rec.catalogSnapshot?.name || `Game #${rec.numericId}`).toLowerCase();
        const notes = (rec.userNotes || '').toLowerCase();
        const tags = (rec.customTags || []).join(' ').toLowerCase();
        const storefronts = (rec.ownerships || []).map(o => o.storefrontOrProvider || '').join(' ').toLowerCase();
        const platforms = (rec.ownerships || []).map(o => getPlatformDisplayName(o.platformId)).join(' ').toLowerCase();

        const matchesQuery =
          title.includes(query) ||
          notes.includes(query) ||
          tags.includes(query) ||
          storefronts.includes(query) ||
          platforms.includes(query);

        if (!matchesQuery) return false;
      }

      // 3. Platform Family Filter
      if (selectedPlatformFamily !== 'all') {
        const hasMatchingFamily = (rec.ownerships || []).some(o => getPlatformFamily(o.platformId) === selectedPlatformFamily) ||
          getPlatformFamily(rec.numericId) === selectedPlatformFamily;
        if (!hasMatchingFamily) return false;
      }

      // 4. Ownership Format Filter
      if (selectedOwnershipType !== 'all') {
        const hasType = (rec.ownerships || []).some(o => o.ownershipType === selectedOwnershipType);
        if (!hasType) return false;
      }

      // 5. Play Status Filter
      if (selectedPlayStatus !== 'all') {
        if (rec.currentPlayStatus !== selectedPlayStatus) return false;
      }

      // 6. Interest Status Filter
      if (selectedInterestStatus !== 'all') {
        if (rec.interestStatus !== selectedInterestStatus) return false;
      }

      // 7. Rating Filter
      if (minimumRating > 0 && (rec.userRating === undefined || rec.userRating < minimumRating)) return false;

      return true;
    });
  }, [
    meaningfulRecords,
    activeTab,
    searchQuery,
    selectedPlatformFamily,
    selectedOwnershipType,
    selectedPlayStatus,
    selectedInterestStatus,
    minimumRating,
  ]);

  // Apply Sorting
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    switch (sortBy) {
      case 'recently_added':
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case 'title_asc':
        return list.sort((a, b) => (a.catalogSnapshot?.name || '').localeCompare(b.catalogSnapshot?.name || ''));
      case 'title_desc':
        return list.sort((a, b) => (b.catalogSnapshot?.name || '').localeCompare(a.catalogSnapshot?.name || ''));
      case 'year_newest':
        return list.sort((a, b) => (b.catalogSnapshot?.releaseYear || 0) - (a.catalogSnapshot?.releaseYear || 0));
      case 'year_oldest':
        return list.sort((a, b) => (a.catalogSnapshot?.releaseYear || 0) - (b.catalogSnapshot?.releaseYear || 0));
      case 'rating_highest':
        return list.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
      case 'backlog_priority':
        return list.sort((a, b) => (a.backlogPriority || 999) - (b.backlogPriority || 999));
      case 'completion_recent':
        return list.sort((a, b) => {
          const dateA = a.completionHistory?.[a.completionHistory.length - 1]?.completedDate || '';
          const dateB = b.completionHistory?.[b.completionHistory.length - 1]?.completedDate || '';
          return dateB.localeCompare(dateA);
        });
      case 'recently_updated':
      default:
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  }, [filteredRecords, sortBy]);

  // Stable Collection Key to reset pagination only on collection identity changes
  const collectionKey = `mygames:${activeTab}:${searchQuery}:${selectedPlatformFamily}:${selectedOwnershipType}:${selectedPlayStatus}:${selectedInterestStatus}:${minimumRating}:${sortBy}`;

  useEffect(() => {
    setVisibleCount(40);
  }, [collectionKey]);

  // Visible Personal Records slice
  const visibleRecords = useMemo(() => {
    return sortedRecords.slice(0, visibleCount);
  }, [sortedRecords, visibleCount]);

  // Map visible personal records to CompactGameLookupRecords for grid cards & batch hydration
  const visibleCompactGames = useMemo(() => {
    return visibleRecords.map(rec => {
      const baseCompact = convertPersonalRecordToCompact(rec);
      const hydrated = hydratedCompactMap.get(baseCompact.id);
      return hydrated ? { ...baseCompact, ...hydrated } : baseCompact;
    });
  }, [visibleRecords, hydratedCompactMap]);

  // Targeted Hydration for visible personal records
  useEffect(() => {
    if (visibleCompactGames.length === 0) return;

    let isCurrent = true;
    const recordsToHydrate = visibleCompactGames.filter(
      r => (!r.coverUrl || r.coverUrl.includes('nocover') || typeof r.chunk !== 'number') && !attemptedHydrationIdsRef.current.has(r.id)
    );

    if (recordsToHydrate.length === 0) return;

    recordsToHydrate.forEach(r => attemptedHydrationIdsRef.current.add(r.id));

    hydrateCompactRecordsBatch(recordsToHydrate)
      .then(hydratedBatch => {
        if (!isCurrent || hydratedBatch.length === 0) return;
        setHydratedCompactMap(prev => {
          const next = new Map(prev);
          hydratedBatch.forEach(h => next.set(h.id, h));
          return next;
        });
      })
      .catch(err => {
        console.warn('Non-critical personal batch hydration warning:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [visibleCompactGames]);

  // Active filters count indicator
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPlatformFamily !== 'all') count++;
    if (selectedOwnershipType !== 'all') count++;
    if (selectedPlayStatus !== 'all') count++;
    if (selectedInterestStatus !== 'all') count++;
    if (minimumRating > 0) count++;
    return count;
  }, [
    selectedPlatformFamily,
    selectedOwnershipType,
    selectedPlayStatus,
    selectedInterestStatus,
    minimumRating,
  ]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedPlatformFamily('all');
    setSelectedOwnershipType('all');
    setSelectedPlayStatus('all');
    setSelectedInterestStatus('all');
    setMinimumRating(0);
  };

  const platformFamilies = getAllFamilies();

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Unified library navigation, counts, search, filters, and actions */}
      <section className="atlas-dashboard-panel overflow-hidden text-[#0C1D2D]">
      {/* Primary Tab Views Segmented Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#D9C8A9] bg-[#EFE8D8]/45">
        <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {(
            [
              { key: 'all', label: 'All Games', count: counts.all, icon: Gamepad2 },
              { key: 'owned', label: 'Owned', count: counts.owned, icon: Package },
              { key: 'playing', label: 'Playing', count: counts.playing, icon: Clock },
              { key: 'backlog', label: 'Backlog', count: counts.backlog, icon: Bookmark },
              { key: 'completed', label: 'Completed', count: counts.completed, icon: Trophy },
              { key: 'wanted', label: 'Like', count: counts.wanted, icon: Heart },
              { key: 'dropped', label: 'Yuck!', count: counts.dropped, icon: SplatIcon },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#0B2B3C] text-white shadow-xs border border-[#C5A059]'
                    : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.key === 'dropped' ? (isActive ? 'text-[#8FD39A]' : 'text-[#2B6E4E]') : isActive ? 'text-[#C5A059]' : 'text-[#8C6D37]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#EFE8D8] text-[#0C1D2D]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="shrink-0 px-3 py-2 rounded-xl bg-[#0B2B3C] hover:bg-[#0F4C5C] text-white font-bold text-xs shadow-xs border border-[#C5A059] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#C5A059]" />
          <span>Backup</span>
        </button>
      </div>

      {/* Solid High-Contrast Local Search & Filter Control Surface */}
      <div className="p-4 space-y-3 text-xs font-semibold">
        {/* Row 1: Search Bar & Primary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 w-4 h-4 text-[#8C6D37] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search library by title, notes, custom tags, storefronts, or platforms..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] placeholder:text-[#718294] focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-[#718294] hover:text-[#0C1D2D]"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#0C1D2D] shrink-0">
              Showing {Math.min(visibleCount, sortedRecords.length)} of {sortedRecords.length}
            </span>

            {/* Grid / List Mode Controls */}
            <div className="flex items-center bg-[#EFE8D8] p-0.5 rounded-xl border border-[#D9C8A9]">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D] hover:bg-white/50'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D] hover:bg-white/50'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Detailed Filters and Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9C8A9]/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform Family */}
            <select
              value={selectedPlatformFamily}
              onChange={e => setSelectedPlatformFamily(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9]"
            >
              <option value="all">All Platform Families</option>
              {platformFamilies.map(fam => (
                <option key={fam.key} value={fam.key}>
                  {fam.label}
                </option>
              ))}
            </select>

            {/* Ownership Format */}
            <select
              value={selectedOwnershipType}
              onChange={e => setSelectedOwnershipType(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9]"
            >
              <option value="all">All Formats</option>
              <option value="digital">Digital Only</option>
              <option value="physical">Physical Disc/Cart</option>
              <option value="subscription">Subscription</option>
              <option value="borrowed">Borrowed</option>
              <option value="previously_owned">Previously Owned</option>
            </select>

            <MinimumRatingFilter value={minimumRating} onChange={setMinimumRating} label="Minimum personal rating" />

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-900 border border-rose-600/30 text-[11px] font-bold hover:bg-rose-500/20 cursor-pointer"
              >
                Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SortAsc className="w-3.5 h-3.5 text-[#8C6D37]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9]"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="recently_added">Recently Added</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="year_newest">Release Year (Newest)</option>
              <option value="year_oldest">Release Year (Oldest)</option>
              <option value="rating_highest">Personal Rating (Highest)</option>
              <option value="backlog_priority">Backlog Priority</option>
              <option value="completion_recent">Most Recent Completion</option>
            </select>
          </div>
        </div>
      </div>
      </section>

      {/* Main Content Area */}
      {meaningfulRecords.length === 0 ? (
        <div className="p-12 text-center rounded-3xl space-y-4 border border-[#D9C8A9] bg-[#FDFBF7] shadow-md">
          <Gamepad2 className="w-12 h-12 mx-auto text-[#0B2B3C] opacity-80" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold font-serif text-[#0C1D2D]">Your Personal Library is Empty</h3>
            <p className="text-xs text-[#47586A] font-sans">
              Games you bookmark or update via the Universal Action Menu will automatically appear in your personal library.
            </p>
          </div>
        </div>
      ) : sortedRecords.length === 0 ? (
        <div className="p-12 text-center rounded-3xl space-y-3 border border-[#D9C8A9] bg-[#FDFBF7] shadow-md">
          <ShieldAlert className="w-10 h-10 mx-auto text-[#8C6D37] opacity-80" />
          <h3 className="text-base font-bold font-serif text-[#0C1D2D]">No Tracked Games Match Filters</h3>
          <p className="text-xs text-[#47586A] max-w-sm mx-auto font-sans">
            No games in your personal library match the selected view tab ({activeTab}) and filter options.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-[#0B2B3C] text-white font-bold text-xs shadow-xs border border-[#C5A059] cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid Mode vs List Mode */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {visibleCompactGames.map(compact => (
                <GameCard
                  key={compact.id}
                  game={compact}
                  onSelect={(rec: CompactGameLookupRecord) => setSelectedGameForModal(rec)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleRecords.map(rec => {
                const compact = convertPersonalRecordToCompact(rec);
                const hydrated = hydratedCompactMap.get(compact.id) || compact;

                return (
                  <div
                    key={rec.gameId}
                    onClick={() => setSelectedGameForModal(hydrated)}
                    className="themed-panel p-3.5 rounded-2xl border border-[#c8b584] bg-[#fefcf6] hover:bg-[#f5f0e1] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm group"
                  >
                    {/* Left Meta info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-14 rounded-xl bg-slate-900 border border-[#c8b584] overflow-hidden shrink-0">
                        {hydrated.coverUrl ? (
                          <img src={hydrated.coverUrl} alt={hydrated.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Gamepad2 className="w-5 h-5 text-[var(--accent-color)] opacity-60" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#0f2b48] group-hover:text-[var(--primary-action)] truncate">
                            {hydrated.name}
                          </h4>
                          {hydrated.year && <span className="text-xs font-mono text-[#475569]">({hydrated.year})</span>}
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          {rec.ownerships && rec.ownerships.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {rec.ownerships.map(o => getPlatformDisplayName(o.platformId)).join(', ')}
                            </span>
                          )}
                          {rec.currentPlayStatus === 'playing' && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white">PLAYING</span>
                          )}
                          {rec.currentPlayStatus === 'completed' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">COMPLETED</span>
                          )}
                          {rec.inBacklogQueue && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white">BACKLOG</span>
                          )}
                          {rec.interestStatus === 'wanted' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white">WANTED</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Meta & Actions */}
                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end" onClick={e => e.stopPropagation()}>
                      {rec.userRating !== undefined && rec.userRating !== null && (
                        <span className="font-bold text-xs text-[var(--accent-color)] bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-600/30 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {rec.userRating} ★
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {/* Record Completion Quick Action */}
                        <button
                          onClick={() => setCompletionGameTarget({ id: rec.gameId, title: hydrated.name, coverUrl: hydrated.coverUrl ?? undefined, year: hydrated.year ?? undefined })}
                          className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 border border-amber-600/30 transition-all"
                          title="Record Completion"
                        >
                          <Trophy className="w-4 h-4" />
                        </button>

                        {/* Edit Details Quick Action */}
                        <button
                          onClick={() => setEditDetailsTarget({ record: rec, title: hydrated.name })}
                          className="p-1.5 rounded-xl bg-[#ece4d0] hover:bg-[#e4d8bc] text-[#0f2b48] border border-[#c8b584] transition-all"
                          title="Edit Personal Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <UniversalActionMenu
                          gameId={rec.gameId}
                          gameTitle={hydrated.name}
                          coverUrl={hydrated.coverUrl ?? undefined}
                          releaseYear={hydrated.year ?? undefined}
                          personalRecord={rec}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load 20 More Button */}
          {visibleCount < sortedRecords.length && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary-action)] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>Load 20 More</span>
                <ChevronDown className="w-4 h-4" />
                <span className="text-[10px] opacity-80 font-mono">({sortedRecords.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <GameDetailModal
        selectedGame={selectedGameForModal}
        onClose={() => setSelectedGameForModal(null)}
      />

      <CompletionModal
        gameId={completionGameTarget?.id || null}
        gameTitle={completionGameTarget?.title || ''}
        coverUrl={completionGameTarget?.coverUrl}
        releaseYear={completionGameTarget?.year}
        isOpen={Boolean(completionGameTarget)}
        onClose={() => setCompletionGameTarget(null)}
      />

      <EditPersonalDetailsModal
        gameId={editDetailsTarget?.record.gameId || null}
        gameTitle={editDetailsTarget?.title || ''}
        existingRecord={editDetailsTarget?.record}
        isOpen={Boolean(editDetailsTarget)}
        onClose={() => setEditDetailsTarget(null)}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
