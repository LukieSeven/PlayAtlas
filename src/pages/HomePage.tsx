import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Gamepad2,
  Clock,
  Bookmark,
  Trophy,
  ArrowRight,
  Tag,
  Calendar,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  X,
  Pencil
} from 'lucide-react';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import { getYuckedNumericIds } from '../utils/personalGameVisibility';
import { CompactGameLookupRecord } from '../types/catalog';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { FantasyLandscapeArtwork } from '../components/ui/FantasyLandscapeArtwork';
import { Button } from '../components/ui/Button';
import { getUpcomingGames, convertReleaseRecordToCompactRecord } from '../services/releaseCatalogService';
import { hydrateCompactRecordsBatch, convertPersonalRecordToCompact } from '../services/catalogDetailService';

type HomeWidgetId = 'featured' | 'playing' | 'deals' | 'progress' | 'releases' | 'events';
type HomeWidgetWidth = 'half' | 'full';

interface HomeWidgetPreferences {
  visible: HomeWidgetId[];
  widths: Record<HomeWidgetId, HomeWidgetWidth>;
}

const HOME_WIDGET_STORAGE_KEY = 'playatlas_home_widgets_v1';
const HOME_WIDGET_IDS: HomeWidgetId[] = ['featured', 'playing', 'deals', 'progress', 'releases', 'events'];
const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
  featured: 'Featured Upcoming Game',
  playing: 'Currently Playing',
  deals: 'Discounts & Deals',
  progress: 'Top Games In Progress',
  releases: 'New Releases',
  events: 'Upcoming Events',
};
const DEFAULT_HOME_WIDGETS: HomeWidgetPreferences = {
  visible: [...HOME_WIDGET_IDS],
  widths: {
    featured: 'half',
    playing: 'half',
    deals: 'half',
    progress: 'half',
    releases: 'half',
    events: 'half',
  },
};

const loadHomeWidgetPreferences = (): HomeWidgetPreferences => {
  try {
    const saved = localStorage.getItem(HOME_WIDGET_STORAGE_KEY);
    if (!saved) return DEFAULT_HOME_WIDGETS;
    const parsed = JSON.parse(saved) as Partial<HomeWidgetPreferences>;
    const savedOrder = Array.isArray(parsed.visible)
      ? parsed.visible.filter((id, index): id is HomeWidgetId => HOME_WIDGET_IDS.includes(id as HomeWidgetId) && parsed.visible?.indexOf(id) === index)
      : DEFAULT_HOME_WIDGETS.visible;
    return {
      visible: savedOrder,
      widths: { ...DEFAULT_HOME_WIDGETS.widths, ...parsed.widths },
    };
  } catch {
    return DEFAULT_HOME_WIDGETS;
  }
};

interface WidgetControlsProps {
  id: HomeWidgetId;
  width: HomeWidgetWidth;
  onToggleWidth: (id: HomeWidgetId) => void;
  onEdit: (id: HomeWidgetId) => void;
  onRemove: (id: HomeWidgetId) => void;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({ id, width, onToggleWidth, onEdit, onRemove }) => (
  <div className="atlas-widget-controls absolute right-3 top-3 z-30 flex items-center gap-1">
    <button
      type="button"
      onClick={() => onEdit(id)}
      className="atlas-widget-control"
      title={`Replace or edit ${HOME_WIDGET_LABELS[id]}`}
      aria-label={`Replace or edit ${HOME_WIDGET_LABELS[id]}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      onClick={() => onToggleWidth(id)}
      className="atlas-widget-control"
      title={width === 'full' ? 'Return widget to half width' : 'Expand widget to full width'}
      aria-label={width === 'full' ? `Return ${HOME_WIDGET_LABELS[id]} to half width` : `Expand ${HOME_WIDGET_LABELS[id]} to full width`}
    >
      {width === 'full' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </button>
    <button
      type="button"
      onClick={() => onRemove(id)}
      className="atlas-widget-control atlas-widget-control--danger"
      title="Remove widget from Home (it can be restored)"
      aria-label={`Remove ${HOME_WIDGET_LABELS[id]} from Home`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const HomePage: React.FC = () => {
  const rawRecords = usePersonalGameLibrary();
  const yuckedIds = useMemo(() => getYuckedNumericIds(rawRecords), [rawRecords]);
  const [widgetPreferences, setWidgetPreferences] = useState<HomeWidgetPreferences>(loadHomeWidgetPreferences);
  const [isWidgetStoreOpen, setIsWidgetStoreOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<HomeWidgetId | null>(null);

  // Selected Game state for Modal
  const [selectedGameForModal, setSelectedGameForModal] = useState<CompactGameLookupRecord | null>(null);

  // Release Feed catalog state (Real catalog data)
  const [recentReleases, setRecentReleases] = useState<CompactGameLookupRecord[]>([]);

  // Hydration state for displayed compact records
  const [hydratedCompactMap, setHydratedCompactMap] = useState<Map<number, CompactGameLookupRecord>>(new Map());
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());

  // Derive meaningful records from personal library
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

  // Derive playing records from personal library
  const playingRecords = useMemo(() => {
    return meaningfulRecords
      .filter(r => r.currentPlayStatus === 'playing')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [meaningfulRecords]);

  // Derive in-progress records (playing or with session/completion history)
  const inProgressRecords = useMemo(() => {
    return meaningfulRecords
      .filter(r => r.currentPlayStatus === 'playing' || (r.playSessions && r.playSessions.length > 0) || (r.completionHistory && r.completionHistory.length > 0))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [meaningfulRecords]);

  // Load Release Discovery Feed from real catalog service
  useEffect(() => {
    let isMounted = true;

    getUpcomingGames(6)
      .then(partition => {
        if (!isMounted) return;
        const mapped: CompactGameLookupRecord[] = partition.items.map(item =>
          convertReleaseRecordToCompactRecord(item.record)
        );
        setRecentReleases(mapped.filter(game => !yuckedIds.has(game.id)));
      })
      .catch(err => {
        console.warn('Home release discovery feed warning:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [yuckedIds]);

  // Hydrate displayed records
  useEffect(() => {
    if (recentReleases.length === 0) return;
    let isCurrent = true;

    const unhydrated = recentReleases.filter(
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
      .catch(err => console.warn('Home hydration warning:', err));

    return () => {
      isCurrent = false;
    };
  }, [recentReleases]);

  // Featured Game derived from real catalog if available
  const realFeaturedGame = recentReleases.length > 0 ? recentReleases[0] : null;

  const updateWidgetPreferences = (updater: (current: HomeWidgetPreferences) => HomeWidgetPreferences) => {
    setWidgetPreferences(current => {
      const next = updater(current);
      localStorage.setItem(HOME_WIDGET_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleWidgetWidth = (id: HomeWidgetId) => {
    updateWidgetPreferences(current => ({
      ...current,
      widths: {
        ...current.widths,
        [id]: current.widths[id] === 'full' ? 'half' : 'full',
      },
    }));
  };

  const removeWidget = (id: HomeWidgetId) => {
    updateWidgetPreferences(current => ({
      ...current,
      visible: current.visible.filter(widgetId => widgetId !== id),
    }));
  };

  const restoreWidget = (id: HomeWidgetId) => {
    updateWidgetPreferences(current => ({
      ...current,
      visible: current.visible.includes(id) ? current.visible : [...current.visible, id],
    }));
    setIsWidgetStoreOpen(false);
  };

  const replaceWidget = (replacementId: HomeWidgetId) => {
    if (!editingWidgetId) {
      restoreWidget(replacementId);
      return;
    }
    updateWidgetPreferences(current => ({
      visible: current.visible.map(id => id === editingWidgetId ? replacementId : id),
      widths: {
        ...current.widths,
        [replacementId]: current.widths[editingWidgetId],
      },
    }));
    setEditingWidgetId(null);
    setIsWidgetStoreOpen(false);
  };

  const openWidgetStore = (editingId: HomeWidgetId | null = null) => {
    setEditingWidgetId(editingId);
    setIsWidgetStoreOpen(true);
  };

  const hiddenWidgets = HOME_WIDGET_IDS.filter(id => !widgetPreferences.visible.includes(id));
  const storeWidgets = editingWidgetId
    ? HOME_WIDGET_IDS.filter(id => id !== editingWidgetId && !widgetPreferences.visible.includes(id))
    : hiddenWidgets;
  const widgetGridClass = (id: HomeWidgetId) => widgetPreferences.widths[id] === 'full' ? 'xl:col-span-2' : 'xl:col-span-1';
  const widgetOrder = (id: HomeWidgetId) => widgetPreferences.visible.indexOf(id);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 select-none">
      {/* 2-Column Main Dashboard Grid Composition */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* ==================== LEFT COLUMN (approx 60% = col-span-7) ==================== */}
        <div className="home-widget-column space-y-4 min-w-0">
          {/* WIDGET 1: FEATURED UPCOMING GAME */}
          {widgetPreferences.visible.includes('featured') && <div style={{ order: widgetOrder('featured') }} className={`atlas-home-widget atlas-dashboard-panel atlas-dashboard-feature atlas-feature-layout overflow-hidden relative group ${widgetGridClass('featured')}`}>
            <WidgetControls id="featured" width={widgetPreferences.widths.featured} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            {/* Top Landscape Artwork Container */}
            <div className="atlas-feature-art relative h-52 md:h-64 w-full overflow-hidden bg-[#0B2B3C]">
              <FantasyLandscapeArtwork variant="featured" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

              {/* Gold Ribbon Badge Overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0B2B3C]/80 backdrop-blur-md text-[#C5A059] border border-[#C5A059] text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>FEATURED UPCOMING GAME</span>
              </div>
            </div>

            {/* Bottom Content Information Panel */}
            <div className="atlas-feature-copy p-5 md:p-6 space-y-4 bg-[#FDFBF7]/95 relative z-10">
              {realFeaturedGame ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="font-serif text-3xl font-extrabold text-[#0C1D2D] leading-tight">
                        {realFeaturedGame.name}
                      </h2>
                      <p className="text-xs font-sans font-bold text-[#8C6D37]">
                        {realFeaturedGame.platforms?.join(', ') || 'Multi-Platform'} • Release Year: {realFeaturedGame.year || 'TBA'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      icon={<ArrowRight className="w-4 h-4 text-[#C5A059]" />}
                      onClick={() => setSelectedGameForModal(realFeaturedGame)}
                    >
                      View Details
                    </Button>
                    <Link to="/my-games">
                      <Button variant="secondary" icon={<Bookmark className="w-4 h-4 text-[#8C6D37]" />}>
                        Explore Library
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Themed Empty State for Featured Game Shell */
                <div className="space-y-3 py-2">
                  <h2 className="font-serif text-2xl font-bold text-[#0C1D2D]">
                    Featured Upcoming Title
                  </h2>
                  <p className="text-xs font-sans text-[#47586A] leading-relaxed max-w-md">
                    Featured upcoming release information unavailable until catalog data is loaded. Explore your personal gaming library to track active games and backlog items.
                  </p>
                  <div className="pt-2">
                    <Link to="/my-games">
                      <Button variant="primary" icon={<ArrowRight className="w-4 h-4 text-[#C5A059]" />}>
                        Explore Personal Library
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>}

          {/* WIDGET 3: CURRENTLY PLAYING */}
          {widgetPreferences.visible.includes('playing') && <div style={{ order: widgetOrder('playing') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative ${widgetGridClass('playing')}`}>
            <WidgetControls id="playing" width={widgetPreferences.widths.playing} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">CURRENTLY PLAYING</h3>
              </div>
              <Link to="/my-games?view=playing" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {playingRecords.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {playingRecords.slice(0, 4).map(rec => {
                  const compact = convertPersonalRecordToCompact(rec);
                  const hydrated = hydratedCompactMap.get(compact.id) || compact;
                  return (
                    <GameCard
                      key={rec.gameId}
                      game={hydrated}
                      onSelect={g => setSelectedGameForModal(g)}
                    />
                  );
                })}
              </div>
            ) : (
              /* Themed Empty State for Currently Playing Widget */
              <div className="p-6 text-center rounded-2xl bg-[#EFE8D8] border border-[#D9C8A9] space-y-2">
                <Clock className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
                <h4 className="font-bold text-xs text-[#0C1D2D]">No games currently marked as Playing</h4>
                <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                  Mark games as Playing via the Universal Action Menu to feature them here.
                </p>
              </div>
            )}
          </div>}

          {/* WIDGET 5: DISCOUNTS & DEALS */}
          {widgetPreferences.visible.includes('deals') && <div style={{ order: widgetOrder('deals') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative ${widgetGridClass('deals')}`}>
            <WidgetControls id="deals" width={widgetPreferences.widths.deals} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">DISCOUNTS & DEALS</h3>
              </div>
              <Link to="/discounts" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {/* Themed Empty State for Deals Widget */}
            <div className="p-6 text-center rounded-2xl bg-[#EFE8D8] border border-[#D9C8A9] space-y-2">
              <Tag className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
              <h4 className="font-bold text-xs text-[#0C1D2D]">No active deals or sales available</h4>
              <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                Check back for updated platform storefront discounts and promotional sales.
              </p>
            </div>
          </div>}
        </div>

        {/* ==================== RIGHT COLUMN (approx 40% = col-span-5) ==================== */}
        <div className="home-widget-column space-y-4 min-w-0">
          {/* WIDGET 2: TOP 10 IN PROGRESS */}
          {widgetPreferences.visible.includes('progress') && <div style={{ order: widgetOrder('progress') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative ${widgetGridClass('progress')}`}>
            <WidgetControls id="progress" width={widgetPreferences.widths.progress} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">TOP 10 IN PROGRESS</h3>
              </div>
              <Link to="/my-games?view=playing" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {inProgressRecords.length > 0 ? (
              <div className="space-y-3 font-sans">
                {inProgressRecords.map((rec, idx) => {
                  const compact = convertPersonalRecordToCompact(rec);
                  const hydrated = hydratedCompactMap.get(compact.id) || compact;
                  const hasUserRating = rec.userRating !== undefined && rec.userRating !== null;
                  const ratingVal = rec.userRating ?? 5;
                  const pct = hasUserRating ? Math.round((ratingVal / 10) * 100) : 50;

                  return (
                    <div key={rec.gameId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#EFE8D8] transition-colors">
                      <span className="font-mono font-extrabold text-sm text-[#0B2B3C] w-4 text-center">{idx + 1}</span>
                      <div className="w-8 h-10 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-mono font-bold text-[#8C6D37]">
                        {hydrated.coverUrl ? (
                          <img src={hydrated.coverUrl} alt={hydrated.name} className="w-full h-full object-cover" />
                        ) : (
                          hydrated.name[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <h4 className="font-bold text-[#0C1D2D] truncate">{hydrated.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-[#8C6D37] shrink-0 ml-2">
                            {rec.currentPlayStatus?.toUpperCase() || 'IN PROGRESS'}
                          </span>
                        </div>
                        <div className="w-full bg-[#EFE8D8] rounded-full h-1.5 overflow-hidden border border-[#D9C8A9]">
                          <div className="bg-[#0B2B3C] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#0C1D2D] w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Themed Empty State for In Progress Widget */
              <div className="p-6 text-center rounded-2xl bg-[#EFE8D8] border border-[#D9C8A9] space-y-2">
                <Trophy className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
                <h4 className="font-bold text-xs text-[#0C1D2D]">No active game progress recorded yet</h4>
                <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                  Play status updates recorded in your library will appear here.
                </p>
              </div>
            )}
          </div>}

          {/* WIDGET 4: NEW RELEASES */}
          {widgetPreferences.visible.includes('releases') && <div style={{ order: widgetOrder('releases') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative ${widgetGridClass('releases')}`}>
            <WidgetControls id="releases" width={widgetPreferences.widths.releases} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">NEW RELEASES</h3>
              </div>
              <Link to="/new-releases" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {recentReleases.length > 0 ? (
              <div className="space-y-3 font-sans">
                {recentReleases.slice(0, 4).map((game) => {
                  const hydrated = hydratedCompactMap.get(game.id) || game;
                  return (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGameForModal(hydrated)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#EFE8D8] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-11 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] shrink-0 overflow-hidden flex items-center justify-center text-xs font-serif font-bold text-[#0B2B3C]">
                          {hydrated.coverUrl ? (
                            <img src={hydrated.coverUrl} alt={hydrated.name} className="w-full h-full object-cover" />
                          ) : (
                            hydrated.name[0]
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-[#0C1D2D] truncate">{hydrated.name}</h4>
                          <p className="text-[10px] text-[#47586A] truncate">
                            {hydrated.year || 'TBA'} • {hydrated.platforms?.join(', ') || 'Multi-Platform'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-[#EFE8D8] text-[#0B2B3C] font-mono text-[10px] font-bold border border-[#D9C8A9] shrink-0 ml-2">
                        View
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Themed Empty State for New Releases Widget */
              <div className="p-6 text-center rounded-2xl bg-[#EFE8D8] border border-[#D9C8A9] space-y-2">
                <Gamepad2 className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
                <h4 className="font-bold text-xs text-[#0C1D2D]">Release information temporarily unavailable</h4>
                <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                  New and upcoming catalog releases will be listed here when available.
                </p>
              </div>
            )}
          </div>}

          {/* WIDGET 6: UPCOMING EVENTS */}
          {widgetPreferences.visible.includes('events') && <div style={{ order: widgetOrder('events') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative overflow-hidden ${widgetGridClass('events')}`}>
            <WidgetControls id="events" width={widgetPreferences.widths.events} onToggleWidth={toggleWidgetWidth} onEdit={openWidgetStore} onRemove={removeWidget} />
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">UPCOMING EVENTS</h3>
              </div>
              <Link to="/calendar" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View Calendar
              </Link>
            </div>

            {/* Themed Empty State for Upcoming Events Widget */}
            <div className="p-6 text-center rounded-2xl bg-[#EFE8D8]/80 border border-[#D9C8A9] space-y-2 relative z-10">
              <Calendar className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
              <h4 className="font-bold text-xs text-[#0C1D2D]">No upcoming gaming events scheduled</h4>
              <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                Check the games calendar for upcoming industry showcases, release streams, and gaming expos.
              </p>
            </div>

            {/* Lower-Right Corner Castle Landscape Illustration */}
            <div className="absolute right-0 bottom-0 w-64 h-36 opacity-30 pointer-events-none z-0">
              <FantasyLandscapeArtwork variant="events" />
            </div>
          </div>}
        </div>

        <button
          type="button"
          onClick={() => openWidgetStore()}
          style={{ order: widgetPreferences.visible.length }}
          className="atlas-widget-add-slot atlas-home-widget"
          aria-label="Add a widget to the next available Home slot"
        >
          <span className="atlas-widget-add-orbit" aria-hidden="true">
            <Plus className="h-8 w-8" />
          </span>
          <span className="font-serif text-lg font-bold">Add Widget</span>
          <span className="text-xs text-[#47586A]">
            {hiddenWidgets.length > 0 ? `${hiddenWidgets.length} available` : 'Open widget store'}
          </span>
        </button>
      </div>

      {isWidgetStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C1D2D]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="widget-store-title">
          <div className="atlas-dashboard-panel w-full max-w-2xl p-5 md:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#D9C8A9] pb-4">
              <div>
                <h2 id="widget-store-title" className="font-serif text-2xl font-bold text-[#0C1D2D]">{editingWidgetId ? 'Replace Widget' : 'Widget Store'}</h2>
                <p className="mt-1 text-xs text-[#47586A]">{editingWidgetId ? `Choose a replacement for ${HOME_WIDGET_LABELS[editingWidgetId]}. Its slot and size will be preserved.` : 'Choose a widget for the next available position on your Home page.'}</p>
              </div>
              <button type="button" onClick={() => { setIsWidgetStoreOpen(false); setEditingWidgetId(null); }} className="atlas-widget-control" aria-label="Close widget store">
                <X className="h-4 w-4" />
              </button>
            </div>

            {storeWidgets.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {storeWidgets.map(id => (
                  <button key={id} type="button" onClick={() => replaceWidget(id)} className="atlas-widget-store-option">
                    <span className="atlas-widget-store-option-icon"><Plus className="h-4 w-4" /></span>
                    <span className="text-left">
                      <span className="block font-serif text-base font-bold text-[#0C1D2D]">{HOME_WIDGET_LABELS[id]}</span>
                      <span className="block text-[11px] text-[#47586A]">{editingWidgetId ? 'Replace this widget in place' : 'Add to the next available slot'}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[#D9C8A9] bg-[#EFE8D8] p-8 text-center">
                <p className="font-serif text-lg font-bold text-[#0C1D2D]">All available widgets are already on Home.</p>
                <p className="mt-1 text-xs text-[#47586A]">More widget types can be added to this store without changing the grid behavior.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <GameDetailModal
        selectedGame={selectedGameForModal}
        onClose={() => setSelectedGameForModal(null)}
      />
    </div>
  );
};

export default HomePage;
