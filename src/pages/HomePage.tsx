import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Gamepad2,
  Clock,
  Bookmark,
  Trophy,
  Heart,
  ArrowRight,
  Package,
  AlertCircle
} from 'lucide-react';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import { CompactGameLookupRecord } from '../types/catalog';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { UniversalActionMenu } from '../components/common/UniversalActionMenu';
import { getUpcomingGames } from '../services/releaseCatalogService';
import { hydrateCompactRecordsBatch, convertPersonalRecordToCompact } from '../services/catalogDetailService';

export const HomePage: React.FC = () => {
  const rawRecords = usePersonalGameLibrary();

  // Selected Game state for Modal
  const [selectedGameForModal, setSelectedGameForModal] = useState<CompactGameLookupRecord | null>(null);

  // Recent Release Feed state (Non-blocking external feed)
  const [recentReleases, setRecentReleases] = useState<CompactGameLookupRecord[]>([]);
  const [loadingReleases, setLoadingReleases] = useState<boolean>(true);
  const [releaseFeedError, setReleaseFeedError] = useState<string | null>(null);

  // Hydration state for displayed compact records
  const [hydratedCompactMap, setHydratedCompactMap] = useState<Map<number, CompactGameLookupRecord>>(new Map());
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());

  // Derive meaningful personal records
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

  // Overall Library Stats
  const stats = useMemo(() => {
    return {
      total: meaningfulRecords.length,
      owned: meaningfulRecords.filter(r => r.ownerships && r.ownerships.length > 0).length,
      playing: meaningfulRecords.filter(r => r.currentPlayStatus === 'playing').length,
      backlog: meaningfulRecords.filter(r => r.inBacklogQueue).length,
      completed: meaningfulRecords.filter(r => r.currentPlayStatus === 'completed' || (r.completionHistory && r.completionHistory.length > 0)).length,
      wanted: meaningfulRecords.filter(r => r.interestStatus === 'wanted' || r.interestStatus === 'wishlist').length,
    };
  }, [meaningfulRecords]);

  // Section 1: Currently Playing (Up to 6)
  const playingRecords = useMemo(() => {
    return meaningfulRecords
      .filter(r => r.currentPlayStatus === 'playing')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }, [meaningfulRecords]);

  // Section 2: Priority Backlog (Up to 6)
  const backlogRecords = useMemo(() => {
    return meaningfulRecords
      .filter(r => r.inBacklogQueue)
      .sort((a, b) => (a.backlogPriority || 999) - (b.backlogPriority || 999))
      .slice(0, 6);
  }, [meaningfulRecords]);

  // Section 3: Wanted / Wishlist (Up to 6)
  const wantedRecords = useMemo(() => {
    return meaningfulRecords
      .filter(r => r.interestStatus === 'wanted' || r.interestStatus === 'wishlist')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }, [meaningfulRecords]);

  // Section 4: Recently Updated (Up to 8)
  const recentlyUpdatedRecords = useMemo(() => {
    return [...meaningfulRecords]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8);
  }, [meaningfulRecords]);

  // Load Recent Release Discovery Feed (Non-blocking)
  useEffect(() => {
    let isMounted = true;
    setLoadingReleases(true);
    setReleaseFeedError(null);

    getUpcomingGames(6)
      .then(partition => {
        if (!isMounted) return;
        const mapped: CompactGameLookupRecord[] = partition.items.map((item: any) => ({
          id: item.record.id,
          name: item.record.name,
          year: item.record.firstReleaseDate ? parseInt(item.record.firstReleaseDate.slice(0, 4), 10) : undefined,
          gameType: item.record.gameType || undefined,
          coverUrl: item.record.coverUrl || undefined,
          chunk: item.record.dataChunk ? parseInt(String(item.record.dataChunk).replace(/\D/g, ''), 10) : undefined,
        }));
        setRecentReleases(mapped);
      })
      .catch(err => {
        console.warn('Home release discovery feed warning:', err);
        if (isMounted) setReleaseFeedError('Release feed temporarily unavailable.');
      })
      .finally(() => {
        if (isMounted) setLoadingReleases(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Collect all compact records currently displayed on Home for targeted hydration
  const homeCompactGamesToHydrate = useMemo(() => {
    const list: CompactGameLookupRecord[] = [];
    const addRecords = (recs: any[]) => {
      recs.forEach(r => {
        const base = convertPersonalRecordToCompact(r);
        const hydrated = hydratedCompactMap.get(base.id);
        list.push(hydrated ? { ...base, ...hydrated } : base);
      });
    };

    addRecords(playingRecords);
    addRecords(backlogRecords);
    addRecords(wantedRecords);
    addRecords(recentlyUpdatedRecords);
    return list;
  }, [playingRecords, backlogRecords, wantedRecords, recentlyUpdatedRecords, hydratedCompactMap]);

  // Targeted hydration of displayed Home records
  useEffect(() => {
    if (homeCompactGamesToHydrate.length === 0) return;

    let isCurrent = true;
    const unhydrated = homeCompactGamesToHydrate.filter(
      r => (!r.coverUrl || r.coverUrl.includes('nocover')) && !attemptedHydrationIdsRef.current.has(r.id)
    );

    if (unhydrated.length === 0) return;

    unhydrated.forEach(r => attemptedHydrationIdsRef.current.add(r.id));

    hydrateCompactRecordsBatch(unhydrated)
      .then(hydratedBatch => {
        if (!isCurrent || hydratedBatch.length === 0) return;
        setHydratedCompactMap(prev => {
          const next = new Map(prev);
          hydratedBatch.forEach(h => next.set(h.id, h));
          return next;
        });
      })
      .catch(err => {
        console.warn('Non-critical Home hydration warning:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [homeCompactGamesToHydrate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Banner: Watercolor Atlas Header */}
      <div className="themed-panel p-6 md:p-8 rounded-3xl border border-[#c8b584] shadow-xl relative overflow-hidden bg-[#fefcf6] text-[#0f2b48]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--primary-action)] font-bold uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Personal Gaming Dashboard</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold themed-heading text-[#0c1e36]">
              Welcome to Play Atlas
            </h1>
            <p className="text-xs text-[#475569] font-medium leading-relaxed">
              Your real-time gaming hub. Monitor actively played titles, manage your backlog priorities, track wanted games, and discover recent launches.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono font-bold">
              <span className="bg-[#ece4d0] px-3 py-1 rounded-xl border border-[#c8b584] text-[#0f2b48]">
                {stats.total} Total Tracked
              </span>
              <span className="bg-indigo-500/15 px-3 py-1 rounded-xl border border-indigo-600/30 text-indigo-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {stats.playing} Playing
              </span>
              <span className="bg-purple-500/15 px-3 py-1 rounded-xl border border-purple-600/30 text-purple-900 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                {stats.backlog} Backlog
              </span>
              <span className="bg-amber-500/15 px-3 py-1 rounded-xl border border-amber-600/30 text-amber-900 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {stats.completed} Completed
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/my-games"
              className="px-5 py-2.5 rounded-2xl bg-[var(--primary-action)] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>Manage My Games</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 1: Currently Playing (2/3) & Library Summary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currently Playing (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Currently Playing</h2>
            </div>
            <Link to="/my-games?view=playing" className="text-xs font-bold text-[var(--primary-action)] hover:underline flex items-center gap-1">
              <span>View All ({stats.playing})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {playingRecords.length === 0 ? (
            <div className="themed-panel p-8 text-center rounded-3xl border border-[#c8b584] bg-[#fefcf6] space-y-3">
              <Clock className="w-8 h-8 text-indigo-600 mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#0c1e36]">No games currently marked Playing</h3>
              <p className="text-xs text-[#475569] max-w-xs mx-auto">
                Mark games as Playing via the Universal Action Menu to pin them to your home dashboard.
              </p>
              <Link to="/my-games" className="inline-block px-4 py-2 rounded-xl bg-[var(--primary-action)] text-white text-xs font-bold shadow">
                Browse My Library
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {playingRecords.map(rec => {
                const compact = convertPersonalRecordToCompact(rec);
                const hydrated = hydratedCompactMap.get(compact.id) || compact;
                return (
                  <GameCard
                    key={rec.gameId}
                    game={hydrated}
                    onSelect={(g: CompactGameLookupRecord) => setSelectedGameForModal(g)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Library Overview Summary (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[var(--primary-action)]" />
            <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Library Overview</h2>
          </div>

          <div className="themed-panel p-5 rounded-3xl border border-[#c8b584] bg-[#fefcf6] space-y-3 shadow-md">
            <Link to="/my-games" className="flex items-center justify-between p-3 rounded-2xl bg-[#f5f0e1] hover:bg-[#ece4d0] transition-colors border border-[#c8b584]">
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="w-4 h-4 text-[var(--primary-action)]" />
                <span className="text-xs font-bold text-[#0f2b48]">Total Tracked</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-[#0f2b48]">{stats.total}</span>
            </Link>

            <Link to="/my-games?view=owned" className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-600/30">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">Owned Games</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-emerald-950">{stats.owned}</span>
            </Link>

            <Link to="/my-games?view=backlog" className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 transition-colors border border-purple-600/30">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-950">Backlog Queue</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-purple-950">{stats.backlog}</span>
            </Link>

            <Link to="/my-games?view=completed" className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-600/30">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-950">Completed</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-amber-950">{stats.completed}</span>
            </Link>

            <Link to="/my-games?view=wanted" className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors border border-rose-600/30">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-700" />
                <span className="text-xs font-bold text-rose-950">Wanted / Wishlist</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-rose-950">{stats.wanted}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Backlog (1/2) & Wanted (1/2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backlog Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Priority Backlog</h2>
            </div>
            <Link to="/my-games?view=backlog" className="text-xs font-bold text-[var(--primary-action)] hover:underline flex items-center gap-1">
              <span>View All ({stats.backlog})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {backlogRecords.length === 0 ? (
            <div className="themed-panel p-6 text-center rounded-3xl border border-[#c8b584] bg-[#fefcf6] text-xs text-[#475569]">
              No games currently in your backlog queue.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {backlogRecords.map(rec => {
                const compact = convertPersonalRecordToCompact(rec);
                const hydrated = hydratedCompactMap.get(compact.id) || compact;
                return (
                  <GameCard
                    key={rec.gameId}
                    game={hydrated}
                    onSelect={(g: CompactGameLookupRecord) => setSelectedGameForModal(g)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Wanted Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600" />
              <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Wanted & Wishlist</h2>
            </div>
            <Link to="/my-games?view=wanted" className="text-xs font-bold text-[var(--primary-action)] hover:underline flex items-center gap-1">
              <span>View All ({stats.wanted})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {wantedRecords.length === 0 ? (
            <div className="themed-panel p-6 text-center rounded-3xl border border-[#c8b584] bg-[#fefcf6] text-xs text-[#475569]">
              No games currently bookmarked as Wanted.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wantedRecords.map(rec => {
                const compact = convertPersonalRecordToCompact(rec);
                const hydrated = hydratedCompactMap.get(compact.id) || compact;
                return (
                  <GameCard
                    key={rec.gameId}
                    game={hydrated}
                    onSelect={(g: CompactGameLookupRecord) => setSelectedGameForModal(g)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recently Updated Section (Full Width) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Recently Updated Personal Records</h2>
          </div>
          <Link to="/my-games" className="text-xs font-bold text-[var(--primary-action)] hover:underline">
            View Complete Library →
          </Link>
        </div>

        {recentlyUpdatedRecords.length === 0 ? (
          <div className="themed-panel p-6 text-center rounded-3xl border border-[#c8b584] bg-[#fefcf6] text-xs text-[#475569]">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {recentlyUpdatedRecords.map(rec => {
              const compact = convertPersonalRecordToCompact(rec);
              const hydrated = hydratedCompactMap.get(compact.id) || compact;

              return (
                <div
                  key={rec.gameId}
                  onClick={() => setSelectedGameForModal(hydrated)}
                  className="themed-panel p-3 rounded-2xl border border-[#c8b584] bg-[#fefcf6] hover:bg-[#f5f0e1] cursor-pointer flex items-center justify-between gap-3 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-12 rounded-lg bg-slate-900 border border-[#c8b584] overflow-hidden shrink-0">
                      {hydrated.coverUrl ? (
                        <img src={hydrated.coverUrl} alt={hydrated.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Gamepad2 className="w-4 h-4 text-[var(--accent-color)] opacity-60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-xs text-[#0f2b48] group-hover:text-[var(--primary-action)] truncate">
                        {hydrated.name}
                      </h4>
                      <p className="text-[10px] font-mono text-[#475569]">
                        {rec.currentPlayStatus
                          ? rec.currentPlayStatus.toUpperCase()
                          : rec.inBacklogQueue
                          ? 'BACKLOG'
                          : rec.interestStatus === 'wanted'
                          ? 'WANTED'
                          : rec.ownerships && rec.ownerships.length > 0
                          ? 'OWNED'
                          : 'UPDATED'}
                      </p>
                    </div>
                  </div>

                  <div onClick={e => e.stopPropagation()}>
                    <UniversalActionMenu
                      gameId={rec.gameId}
                      gameTitle={hydrated.name}
                      coverUrl={hydrated.coverUrl ?? undefined}
                      releaseYear={hydrated.year ?? undefined}
                      personalRecord={rec}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 4: Recent Releases Discovery Feed (Non-blocking) */}
      <div className="space-y-4 pt-2 border-t border-[#c8b584]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary-action)]" />
            <h2 className="text-xl font-bold themed-heading text-[#0c1e36]">Recent & Upcoming Releases Spotlight</h2>
          </div>
          <Link to="/new-releases" className="text-xs font-bold text-[var(--primary-action)] hover:underline flex items-center gap-1">
            <span>Full Discovery Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingReleases ? (
          <div className="p-8 text-center text-xs font-mono text-[#475569]">
            Loading release spotlight...
          </div>
        ) : releaseFeedError ? (
          <div className="themed-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-50 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{releaseFeedError}</span>
            </div>
            <Link to="/new-releases" className="font-bold text-[var(--primary-action)] hover:underline">
              Open New Releases →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentReleases.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onSelect={(g: CompactGameLookupRecord) => setSelectedGameForModal(g)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <GameDetailModal
        selectedGame={selectedGameForModal}
        onClose={() => setSelectedGameForModal(null)}
      />
    </div>
  );
};

export default HomePage;
