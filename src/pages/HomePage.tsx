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
import { getNewReleases, getUpcomingGames, convertReleaseRecordToCompactRecord } from '../services/releaseCatalogService';
import { getEventsCatalog } from '../services/eventCatalogService';
import type { CatalogEvent } from '../types/events';
import { hydrateCompactRecordsBatch, convertPersonalRecordToCompact } from '../services/catalogDetailService';
import { loadUserLists } from '../services/userListService';
import { UserGameList } from '../types/userList';
import { UserListWidget } from '../components/widgets/UserListWidget';
import { HomeWidgetSettingsModal } from '../components/widgets/HomeWidgetSettingsModal';
import { HomeGameWidgetRenderer } from '../components/widgets/HomeGameWidgetRenderer';
import { HomeWidgetConfiguration, HomeWidgetConfigurationMap } from '../types/homeWidget';
import { hydrateHomeWidgetGames } from '../services/homeWidgetHydrationService';
import { loadHomeWidgetConfigurations, resolveWidgetConfiguration, saveHomeWidgetConfigurations } from '../services/homeWidgetService';
import { PERSONAL_GAME_BUCKETS, PersonalGameBucketId } from '../types/gameSource';
import { compactGamesForBucket } from '../services/gameSourceService';

type SystemHomeWidgetId = 'featured' | 'playing' | 'deals' | 'progress' | 'releases' | 'upcoming' | 'events';
type HomeWidgetId = SystemHomeWidgetId | `list:${string}` | `bucket:${PersonalGameBucketId}`;
type HomeWidgetWidth = 'half' | 'full';

interface HomeWidgetPreferences {
  schemaVersion: 2;
  visible: HomeWidgetId[];
  widths: Record<string, HomeWidgetWidth>;
}

const HOME_WIDGET_STORAGE_KEY = 'playatlas_home_widgets_v1';
const HOME_WIDGET_IDS: SystemHomeWidgetId[] = ['featured', 'playing', 'deals', 'progress', 'releases', 'upcoming', 'events'];
const HOME_WIDGET_LABELS: Record<SystemHomeWidgetId, string> = {
  featured: 'Featured Upcoming Game',
  playing: 'Currently Playing',
  deals: 'Discounts & Deals',
  progress: 'Top Games In Progress',
  releases: 'New Releases',
  upcoming: 'Major Upcoming Games',
  events: 'Upcoming Events',
};
const DEFAULT_HOME_WIDGETS: HomeWidgetPreferences = {
  // A fresh Home is public-catalog driven. Personal buckets and lists are
  // available in the widget store only after the user explicitly adds them.
  schemaVersion: 2,
  visible: ['featured', 'upcoming', 'releases', 'deals', 'events'],
  widths: {
    featured: 'half',
    playing: 'half',
    deals: 'half',
    progress: 'half',
    releases: 'half',
    upcoming: 'half',
    events: 'half',
  },
};

const getListWidgetId = (listId: string): HomeWidgetId => `list:${listId}`;
const getListIdFromWidget = (id: HomeWidgetId): string | null => id.startsWith('list:') ? id.slice(5) : null;

const getHomeWidgetLabel = (id: HomeWidgetId, lists: UserGameList[]): string => {
  const listId = getListIdFromWidget(id);
  if (listId) return lists.find(list => list.id === listId)?.name || 'Saved List';
  if (id.startsWith('bucket:')) return PERSONAL_GAME_BUCKETS.find(bucket => bucket.id === id.slice(7))?.label || 'My Games Bucket';
  return HOME_WIDGET_LABELS[id as SystemHomeWidgetId];
};

const loadHomeWidgetPreferences = (lists: UserGameList[]): HomeWidgetPreferences => {
  try {
    const saved = localStorage.getItem(HOME_WIDGET_STORAGE_KEY);
    if (!saved) return DEFAULT_HOME_WIDGETS;
    const parsed = JSON.parse(saved) as Partial<HomeWidgetPreferences>;
    const availableIds: HomeWidgetId[] = [...HOME_WIDGET_IDS, ...PERSONAL_GAME_BUCKETS.map(bucket => `bucket:${bucket.id}` as HomeWidgetId), ...lists.map(list => getListWidgetId(list.id))];
    let savedOrder = Array.isArray(parsed.visible)
      ? parsed.visible.filter((id, index): id is HomeWidgetId => availableIds.includes(id as HomeWidgetId) && parsed.visible?.indexOf(id) === index)
      : DEFAULT_HOME_WIDGETS.visible;
    if (parsed.schemaVersion !== 2 && !savedOrder.includes('upcoming')) {
      const featuredIndex = savedOrder.indexOf('featured');
      savedOrder = [...savedOrder];
      savedOrder.splice(featuredIndex >= 0 ? featuredIndex + 1 : 0, 0, 'upcoming');
    }
    return {
      schemaVersion: 2,
      visible: savedOrder,
      widths: { ...DEFAULT_HOME_WIDGETS.widths, ...parsed.widths },
    };
  } catch {
    return DEFAULT_HOME_WIDGETS;
  }
};

interface WidgetControlsProps {
  id: HomeWidgetId;
  label: string;
  width: HomeWidgetWidth;
  onToggleWidth: (id: HomeWidgetId) => void;
  onEdit: (id: HomeWidgetId) => void;
  onRemove: (id: HomeWidgetId) => void;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({ id, label, width, onToggleWidth, onEdit, onRemove }) => (
  <div className="atlas-widget-controls absolute right-3 top-3 z-30 flex items-center gap-1">
    <button
      type="button"
      onClick={() => onEdit(id)}
      className="atlas-widget-control"
      title={`Replace or edit ${label}`}
      aria-label={`Replace or edit ${label}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      onClick={() => onToggleWidth(id)}
      className="atlas-widget-control"
      title={width === 'full' ? 'Return widget to half width' : 'Expand widget to full width'}
      aria-label={width === 'full' ? `Return ${label} to half width` : `Expand ${label} to full width`}
    >
      {width === 'full' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </button>
    <button
      type="button"
      onClick={() => onRemove(id)}
      className="atlas-widget-control atlas-widget-control--danger"
      title="Remove widget from Home (it can be restored)"
      aria-label={`Remove ${label} from Home`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const HomePage: React.FC = () => {
  const rawRecords = usePersonalGameLibrary();
  const yuckedIds = useMemo(() => getYuckedNumericIds(rawRecords), [rawRecords]);
  const [userLists] = useState<UserGameList[]>(loadUserLists);
  const [widgetPreferences, setWidgetPreferences] = useState<HomeWidgetPreferences>(() => loadHomeWidgetPreferences(userLists));
  const [isWidgetStoreOpen, setIsWidgetStoreOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<HomeWidgetId | null>(null);
  const [settingsWidgetId, setSettingsWidgetId] = useState<HomeWidgetId | null>(null);
  const [widgetConfigurations, setWidgetConfigurations] = useState<HomeWidgetConfigurationMap>(loadHomeWidgetConfigurations);
  const [hydratedListGames, setHydratedListGames] = useState<Record<string, CompactGameLookupRecord[]>>({});
  const [hydratingLists, setHydratingLists] = useState<Set<string>>(new Set());

  // Selected Game state for Modal
  const [selectedGameForModal, setSelectedGameForModal] = useState<CompactGameLookupRecord | null>(null);

  // Release Feed catalog state (Real catalog data)
  const [recentReleases, setRecentReleases] = useState<CompactGameLookupRecord[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<CompactGameLookupRecord[]>([]);
  const [catalogEvents, setCatalogEvents] = useState<CatalogEvent[]>([]);

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

    Promise.all([getNewReleases(10), getUpcomingGames(10)])
      .then(([recentPartition, upcomingPartition]) => {
        if (!isMounted) return;
        const recentMapped: CompactGameLookupRecord[] = recentPartition.items.map(item =>
          convertReleaseRecordToCompactRecord(item.record)
        );
        const upcomingMapped: CompactGameLookupRecord[] = upcomingPartition.items.map(item =>
          convertReleaseRecordToCompactRecord(item.record)
        );
        setRecentReleases(recentMapped.filter(game => !yuckedIds.has(game.id)));
        setUpcomingGames(upcomingMapped.filter(game => !yuckedIds.has(game.id)));
      })
      .catch(err => {
        console.warn('Home release discovery feed warning:', err);
      });

    getEventsCatalog()
      .then(events => { if (isMounted) setCatalogEvents(events); })
      .catch(err => { if (isMounted) console.warn('Home events feed warning:', err); });

    return () => {
      isMounted = false;
    };
  }, [yuckedIds]);

  // Hydrate displayed records
  useEffect(() => {
    const homeCatalogGames = [...recentReleases, ...upcomingGames];
    if (homeCatalogGames.length === 0) return;
    let isCurrent = true;

    const unhydrated = homeCatalogGames.filter(
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
  }, [recentReleases, upcomingGames]);

  useEffect(() => {
    let isCurrent = true;
    const listsToHydrate = userLists.filter(list => list.entries.length > 0);
    if (listsToHydrate.length === 0) return;
    setHydratingLists(new Set(listsToHydrate.map(list => list.id)));
    Promise.all(listsToHydrate.map(async list => [list.id, await hydrateHomeWidgetGames(list.entries.map(entry => entry.game))] as const))
      .then(results => {
        if (!isCurrent) return;
        setHydratedListGames(Object.fromEntries(results));
        setHydratingLists(new Set());
      })
      .catch(error => {
        if (!isCurrent) return;
        console.warn('Home list hydration warning:', error);
        setHydratingLists(new Set());
      });
    return () => { isCurrent = false; };
  }, [userLists]);

  // Featured Game derived from real catalog if available
  const realFeaturedGame = upcomingGames.length > 0 ? upcomingGames[0] : null;
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return catalogEvents.filter(event => new Date(event.endTime || event.startTime).getTime() >= now).slice(0, 4);
  }, [catalogEvents]);

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
      schemaVersion: 2,
      widths: {
        ...current.widths,
        [id]: current.widths[id] === 'full' ? 'half' : 'full',
      },
    }));
  };

  const removeWidget = (id: HomeWidgetId) => {
    updateWidgetPreferences(current => ({
      ...current,
      schemaVersion: 2,
      visible: current.visible.filter(widgetId => widgetId !== id),
    }));
  };

  const restoreWidget = (id: HomeWidgetId) => {
    updateWidgetPreferences(current => ({
      ...current,
      schemaVersion: 2,
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
      schemaVersion: 2,
      visible: current.visible.map(id => id === editingWidgetId ? replacementId : id),
      widths: {
        ...current.widths,
        [replacementId]: current.widths[editingWidgetId] || 'half',
      },
    }));
    setEditingWidgetId(null);
    setIsWidgetStoreOpen(false);
  };

  const openWidgetStore = (editingId: HomeWidgetId | null = null) => {
    setEditingWidgetId(editingId);
    setIsWidgetStoreOpen(true);
  };

  const getWidgetConfiguration = (id: HomeWidgetId) => resolveWidgetConfiguration(widgetConfigurations, id, getHomeWidgetLabel(id, userLists));
  const sourceOptions = [
    ...PERSONAL_GAME_BUCKETS.map(bucket => ({ value: `bucket:${bucket.id}`, label: `${bucket.label} bucket` })),
    ...userLists.map(list => ({ value: `list:${list.id}`, label: list.name })),
  ];
  const gamesForSource = (source?: string): CompactGameLookupRecord[] => {
    if (!source) return [];
    if (source.startsWith('bucket:')) return compactGamesForBucket(rawRecords, source.slice(7) as PersonalGameBucketId).map(game => hydratedCompactMap.get(game.id) || game);
    if (source.startsWith('list:')) {
      const listId = source.slice(5);
      return hydratedListGames[listId] || userLists.find(list => list.id === listId)?.entries.map(entry => entry.game) || [];
    }
    if (source === 'system:releases') return recentReleases.map(game => hydratedCompactMap.get(game.id) || game);
    if (source === 'system:upcoming' || source === 'system:featured') return upcomingGames.map(game => hydratedCompactMap.get(game.id) || game);
    if (source === 'system:playing') return playingRecords.map(convertPersonalRecordToCompact);
    if (source === 'system:progress') return inProgressRecords.map(convertPersonalRecordToCompact);
    return [];
  };
  const universalOverride = (id: SystemHomeWidgetId) => {
    const configuration = getWidgetConfiguration(id);
    const defaults = resolveWidgetConfiguration({}, id, HOME_WIDGET_LABELS[id]);
    const isNonGamePlaceholder = id === 'deals' || id === 'events';
    if (isNonGamePlaceholder && configuration.source === defaults.source && configuration.display.presentation === defaults.display.presentation) return null;
    return <div className="absolute inset-0 z-20 overflow-auto bg-[#FDFBF7] p-4 md:p-5">
      <div className="mb-3 border-b border-[#D9C8A9] pb-3 pr-28"><h3 className="font-serif text-lg font-bold text-[#0C1D2D]">{configuration.title}</h3></div>
      <HomeGameWidgetRenderer games={gamesForSource(configuration.source)} display={configuration.display} yuckedIds={yuckedIds} allowCatalogSampling={!configuration.source} onSelect={setSelectedGameForModal} />
    </div>;
  };
  const saveWidgetConfiguration = (id: HomeWidgetId, configuration: HomeWidgetConfiguration) => {
    setWidgetConfigurations(current => {
      const next = { ...current, [id]: configuration };
      saveHomeWidgetConfigurations(next);
      return next;
    });
    setSettingsWidgetId(null);
  };

  const availableWidgetIds: HomeWidgetId[] = [...HOME_WIDGET_IDS, ...PERSONAL_GAME_BUCKETS.map(bucket => `bucket:${bucket.id}` as HomeWidgetId), ...userLists.map(list => getListWidgetId(list.id))];
  const hiddenWidgets = availableWidgetIds.filter(id => !widgetPreferences.visible.includes(id));
  const storeWidgets = editingWidgetId
    ? availableWidgetIds.filter(id => id !== editingWidgetId && !widgetPreferences.visible.includes(id))
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
            <WidgetControls id="featured" label={HOME_WIDGET_LABELS.featured} width={widgetPreferences.widths.featured || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('featured')}
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
            <WidgetControls id="playing" label={HOME_WIDGET_LABELS.playing} width={widgetPreferences.widths.playing || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('playing')}
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
              <div className="atlas-widget-card-grid">
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
            <WidgetControls id="deals" label={HOME_WIDGET_LABELS.deals} width={widgetPreferences.widths.deals || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('deals')}
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
            <WidgetControls id="progress" label={HOME_WIDGET_LABELS.progress} width={widgetPreferences.widths.progress || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('progress')}
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
            <WidgetControls id="releases" label={HOME_WIDGET_LABELS.releases} width={widgetPreferences.widths.releases || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('releases')}
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

          {/* MAJOR UPCOMING GAMES */}
          {widgetPreferences.visible.includes('upcoming') && <div style={{ order: widgetOrder('upcoming') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative ${widgetGridClass('upcoming')}`}>
            <WidgetControls id="upcoming" label={HOME_WIDGET_LABELS.upcoming} width={widgetPreferences.widths.upcoming || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('upcoming')}
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">MAJOR UPCOMING GAMES</h3>
              </div>
              <Link to="/upcoming" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">View All</Link>
            </div>
            {upcomingGames.length > 0 ? (
              <div className="space-y-3 font-sans">
                {upcomingGames.slice(0, 10).map(game => {
                  const hydrated = hydratedCompactMap.get(game.id) || game;
                  return <button key={game.id} type="button" onClick={() => setSelectedGameForModal(hydrated)} className="flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors hover:bg-[#EFE8D8]">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9C8A9] bg-[#EFE8D8] font-serif text-xs font-bold text-[#0B2B3C]">{hydrated.coverUrl ? <img src={hydrated.coverUrl} alt="" className="h-full w-full object-cover" /> : hydrated.name[0]}</span>
                      <span className="min-w-0"><span className="block truncate text-xs font-bold text-[#0C1D2D]">{hydrated.name}</span><span className="block truncate text-[10px] text-[#47586A]">{hydrated.year || 'TBA'} · {hydrated.platforms?.join(', ') || 'Multi-Platform'}</span></span>
                    </span>
                    <span className="ml-2 shrink-0 rounded-lg border border-[#D9C8A9] bg-[#EFE8D8] px-2 py-1 font-mono text-[10px] font-bold text-[#0B2B3C]">View</span>
                  </button>;
                })}
              </div>
            ) : <div className="rounded-2xl border border-[#D9C8A9] bg-[#EFE8D8] p-6 text-center text-xs text-[#47586A]">Major upcoming releases are temporarily unavailable.</div>}
          </div>}

          {/* WIDGET 6: UPCOMING EVENTS */}
          {widgetPreferences.visible.includes('events') && <div style={{ order: widgetOrder('events') }} className={`atlas-home-widget atlas-dashboard-panel p-4 md:p-5 space-y-3 relative overflow-hidden ${widgetGridClass('events')}`}>
            <WidgetControls id="events" label={HOME_WIDGET_LABELS.events} width={widgetPreferences.widths.events || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            {universalOverride('events')}
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">UPCOMING EVENTS</h3>
              </div>
              <Link to="/events" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {upcomingEvents.length > 0 ? <div className="relative z-10 space-y-2">
              {upcomingEvents.map(event => <Link key={event.id} to="/events" className="flex items-center gap-3 rounded-xl border border-[#D9C8A9] bg-[#FDFBF7]/90 p-2.5 transition-colors hover:bg-[#EFE8D8]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#D9C8A9] bg-[#EFE8D8]">{event.logoUrl ? <img src={event.logoUrl} alt="" className="h-full w-full object-contain" /> : <Calendar className="h-5 w-5 text-[#0B2B3C]" />}</span>
                <span className="min-w-0"><span className="block truncate text-xs font-bold text-[#0C1D2D]">{event.name}</span><span className="block text-[10px] font-semibold text-[#8C6D37]">{new Date(event.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></span>
              </Link>)}
            </div> : <div className="p-6 text-center rounded-2xl bg-[#EFE8D8]/80 border border-[#D9C8A9] space-y-2 relative z-10">
              <Calendar className="w-8 h-8 text-[#0B2B3C] mx-auto opacity-70" />
              <h4 className="font-bold text-xs text-[#0C1D2D]">No upcoming gaming events scheduled</h4>
              <p className="text-xs text-[#47586A] max-w-xs mx-auto">The IGDB Events feed currently has no future-dated entries.</p>
            </div>}

            {/* Lower-Right Corner Castle Landscape Illustration */}
            <div className="absolute right-0 bottom-0 w-64 h-36 opacity-30 pointer-events-none z-0">
              <FantasyLandscapeArtwork variant="events" />
            </div>
          </div>}
        </div>

        {PERSONAL_GAME_BUCKETS.map(bucket => {
          const widgetId = `bucket:${bucket.id}` as HomeWidgetId;
          if (!widgetPreferences.visible.includes(widgetId)) return null;
          const configuration = getWidgetConfiguration(widgetId);
          return <div key={widgetId} style={{ order: widgetOrder(widgetId) }} className={`atlas-home-widget atlas-dashboard-panel relative p-4 md:p-5 ${widgetGridClass(widgetId)}`}>
            <WidgetControls id={widgetId} label={bucket.label} width={widgetPreferences.widths[widgetId] || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
            <div className="mb-3 border-b border-[#D9C8A9] pb-3 pr-28"><h3 className="font-serif text-lg font-bold text-[#0C1D2D]">{configuration.title}</h3></div>
            <HomeGameWidgetRenderer games={gamesForSource(configuration.source)} display={configuration.display} yuckedIds={yuckedIds} allowCatalogSampling={!configuration.source} onSelect={setSelectedGameForModal} />
          </div>;
        })}

        {userLists.map(list => {
          const widgetId = getListWidgetId(list.id);
          if (!widgetPreferences.visible.includes(widgetId)) return null;
          return (
            <div key={widgetId} style={{ order: widgetOrder(widgetId) }} className={`atlas-home-widget atlas-dashboard-panel relative min-h-[310px] p-4 md:p-5 ${widgetGridClass(widgetId)}`}>
              <WidgetControls id={widgetId} label={list.name} width={widgetPreferences.widths[widgetId] || 'half'} onToggleWidth={toggleWidgetWidth} onEdit={setSettingsWidgetId} onRemove={removeWidget} />
              <UserListWidget list={list} title={getWidgetConfiguration(widgetId).title} games={gamesForSource(getWidgetConfiguration(widgetId).source)} display={getWidgetConfiguration(widgetId).display} isHydrating={hydratingLists.has(list.id)} onSelect={setSelectedGameForModal} yuckedIds={yuckedIds} allowCatalogSampling={!getWidgetConfiguration(widgetId).source} />
            </div>
          );
        })}

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
                <p className="mt-1 text-xs text-[#47586A]">{editingWidgetId ? `Choose a replacement for ${getHomeWidgetLabel(editingWidgetId, userLists)}. Its slot and size will be preserved.` : 'Choose a widget for the next available position on your Home page.'}</p>
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
                      <span className="block font-serif text-base font-bold text-[#0C1D2D]">{getHomeWidgetLabel(id, userLists)}</span>
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

      {settingsWidgetId && <HomeWidgetSettingsModal configuration={getWidgetConfiguration(settingsWidgetId)} sourceOptions={sourceOptions} onSave={configuration => saveWidgetConfiguration(settingsWidgetId, configuration)} onClose={() => setSettingsWidgetId(null)} />}

      {/* Modal */}
      <GameDetailModal
        selectedGame={selectedGameForModal}
        onClose={() => setSelectedGameForModal(null)}
      />
    </div>
  );
};

export default HomePage;
