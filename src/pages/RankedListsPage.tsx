import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ListPlus, Plus, Search, Save, Trash2, Trophy, X } from 'lucide-react';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { CompactGameLookupRecord } from '../types/catalog';
import { TierRank, UserGameList } from '../types/userList';
import { executeProgressiveTokenSearch } from '../services/tokenSearchService';
import { hydrateCompactRecordsBatch } from '../services/catalogDetailService';
import {
  addGameToUserList,
  createUserList,
  loadUserLists,
  removeGameFromUserList,
  saveUserLists,
  DEFAULT_TIER_ROWS,
  MAX_TIER_ROWS,
} from '../services/userListService';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import { PersonalGameBucketId, PERSONAL_GAME_BUCKETS } from '../types/gameSource';
import { compactGamesForBucket, exportListToBucket, importGamesIntoList } from '../services/gameSourceService';

type ListsMode = 'new_list' | 'new_tier' | 'existing';
export const RankedListsPage: React.FC = () => {
  const personalRecords = usePersonalGameLibrary();
  const [mode, setMode] = useState<ListsMode>('new_list');
  const [lists, setLists] = useState<UserGameList[]>(loadUserLists);
  const [activeList, setActiveList] = useState<UserGameList>(() => createUserList('', 'regular'));
  const [activeTier, setActiveTier] = useState<TierRank>('S');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompactGameLookupRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleGames, setVisibleGames] = useState<CompactGameLookupRecord[]>([]);
  const [message, setMessage] = useState('Name your list, then search the catalog to add games.');
  const [isUsingPreviewCatalog, setIsUsingPreviewCatalog] = useState(false);
  const [importBucket, setImportBucket] = useState<PersonalGameBucketId>('backlog');
  const [exportBucket, setExportBucket] = useState<PersonalGameBucketId>('backlog');
  const activeSearchQueryRef = useRef('');
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());
  const tierRows = activeList.tiers || DEFAULT_TIER_ROWS;

  useEffect(() => {
    if (activeList.kind === 'tier' && !tierRows.some(tier => tier.id === activeTier)) {
      setActiveTier(tierRows[0]?.id || 'S');
    }
  }, [activeList.kind, activeTier, tierRows]);

  useEffect(() => {
    const query = searchQuery.trim();
    activeSearchQueryRef.current = query;
    const timer = window.setTimeout(async () => {
      if (query.length < 2) {
        const result = await executeProgressiveTokenSearch('', 60);
        if (activeSearchQueryRef.current === query) {
          setSearchResults(result.results);
          setIsUsingPreviewCatalog(result.source === 'development_plugin');
        }
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const result = await executeProgressiveTokenSearch(query, 60);
        if (activeSearchQueryRef.current === query) {
          setSearchResults(result.results);
          setIsUsingPreviewCatalog(result.source === 'development_plugin');
        }
      } catch (error) {
        console.error('List catalog search failed:', error);
        if (activeSearchQueryRef.current === query) {
          setSearchResults([]);
          setIsUsingPreviewCatalog(false);
          setMessage('Catalog search failed. Please try again.');
        }
      } finally {
        if (activeSearchQueryRef.current === query) setIsSearching(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (visibleGames.length === 0) return;

    let isCurrent = true;
    const currentQuery = searchQuery.trim();
    const recordsToHydrate = visibleGames.filter(
      game => game.id > 0 && (!game.coverUrl || game.coverUrl.includes('nocover')) && !attemptedHydrationIdsRef.current.has(game.id),
    );
    if (recordsToHydrate.length === 0) return;

    recordsToHydrate.forEach(game => attemptedHydrationIdsRef.current.add(game.id));
    hydrateCompactRecordsBatch(recordsToHydrate)
      .then(hydratedGames => {
        if (!isCurrent || activeSearchQueryRef.current !== currentQuery) return;
        const hydratedById = new Map(hydratedGames.map(game => [game.id, game]));
        setSearchResults(previous => previous.map(game => hydratedById.get(game.id) || game));
      })
      .catch(error => console.warn('Non-critical list search hydration warning:', error));

    return () => {
      isCurrent = false;
    };
  }, [searchQuery, visibleGames]);

  const changeMode = (nextMode: ListsMode) => {
    setMode(nextMode);
    setSearchQuery('');
    if (!isUsingPreviewCatalog) setSearchResults([]);
    if (nextMode === 'new_list') {
      setActiveList(createUserList('', 'regular'));
      setMessage('Name your list, then search the catalog to add games.');
    } else if (nextMode === 'new_tier') {
      setActiveList(createUserList('', 'tier'));
      setMessage('Choose a tier, then search the catalog to place games.');
    } else if (lists.length > 0) {
      setActiveList(lists[0]);
      setMessage('Select an existing list to edit it.');
    }
  };

  const persistActiveList = useCallback((next: UserGameList, successMessage?: string) => {
    setActiveList(next);
    setLists(previous => {
      const exists = previous.some(list => list.id === next.id);
      const updated = exists ? previous.map(list => list.id === next.id ? next : list) : [...previous, next];
      saveUserLists(updated);
      return updated;
    });
    if (successMessage) setMessage(successMessage);
  }, []);

  const addGame = (game: CompactGameLookupRecord) => {
    const existingEntry = activeList.entries.find(entry => entry.game.id === game.id);
    const next = addGameToUserList(activeList, game, activeTier);
    if (next === activeList) {
      setMessage(`${game.name} is already in this list.`);
      return;
    }
    const selectedTierLabel = tierRows.find(tier => tier.id === activeTier)?.label || activeTier;
    persistActiveList(next, existingEntry ? `${game.name} moved to ${selectedTierLabel}.` : `${game.name} added${next.kind === 'tier' ? ` to ${selectedTierLabel}` : ''}.`);
  };

  const renameTier = (tierId: string, label: string) => {
    persistActiveList({
      ...activeList,
      tiers: tierRows.map(tier => tier.id === tierId ? { ...tier, label: label.slice(0, 30) } : tier),
      updatedAt: new Date().toISOString(),
    });
  };

  const addTier = () => {
    if (tierRows.length >= MAX_TIER_ROWS) {
      setMessage(`Tier lists can contain a maximum of ${MAX_TIER_ROWS} rows.`);
      return;
    }
    const id = `tier_${Date.now()}`;
    persistActiveList({
      ...activeList,
      tiers: [...tierRows, { id, label: `Tier ${tierRows.length + 1}` }],
      updatedAt: new Date().toISOString(),
    }, 'New tier row added. Rename it directly in the row.');
    setActiveTier(id);
  };

  const removeTier = (tierId: string) => {
    if (tierRows.length <= 1) {
      setMessage('A tier list must keep at least one row.');
      return;
    }
    if (activeList.entries.some(entry => entry.tier === tierId)) {
      setMessage('Move or remove the games in this row before deleting it.');
      return;
    }
    const remaining = tierRows.filter(tier => tier.id !== tierId);
    persistActiveList({ ...activeList, tiers: remaining, updatedAt: new Date().toISOString() }, 'Tier row removed.');
    if (activeTier === tierId) setActiveTier(remaining[0].id);
  };

  const saveList = () => {
    const name = activeList.name.trim();
    if (!name) {
      setMessage('Enter a list name before saving.');
      return;
    }
    persistActiveList({ ...activeList, name, updatedAt: new Date().toISOString() }, `${name} saved.`);
    setMode('existing');
  };

  const deleteActiveList = () => {
    const remaining = lists.filter(list => list.id !== activeList.id);
    saveUserLists(remaining);
    setLists(remaining);
    if (remaining.length > 0) setActiveList(remaining[0]);
    else {
      setMode('new_list');
      setActiveList(createUserList('', 'regular'));
    }
    setMessage('List deleted.');
  };

  const importSelectedBucket = () => {
    const games = compactGamesForBucket(personalRecords, importBucket);
    const next = importGamesIntoList(activeList, games, activeList.kind === 'tier' ? activeTier : undefined);
    const added = next.entries.length - activeList.entries.length;
    persistActiveList(next, added > 0 ? `${added} game${added === 1 ? '' : 's'} imported from ${PERSONAL_GAME_BUCKETS.find(bucket => bucket.id === importBucket)?.label}.` : 'No new games were available to import.');
  };

  const exportToSelectedBucket = async () => {
    if (activeList.entries.length === 0) {
      setMessage('Add games to this list before exporting it.');
      return;
    }
    try {
      const count = await exportListToBucket(activeList, exportBucket);
      setMessage(`${count} game${count === 1 ? '' : 's'} added to ${PERSONAL_GAME_BUCKETS.find(bucket => bucket.id === exportBucket)?.label}. Existing personal data was preserved.`);
    } catch (error) {
      console.error('List bucket export failed:', error);
      setMessage('The list could not be exported to My Games. Please try again.');
    }
  };

  const groupedEntries = useMemo(() => Object.fromEntries(
    tierRows.map(tier => [tier.id, activeList.entries.filter(entry => entry.tier === tier.id)]),
  ) as Record<TierRank, typeof activeList.entries>, [activeList.entries, tierRows]);

  const headerContent = (
    <div className="flex flex-wrap items-center gap-1 bg-[#EFE8D8]/45 px-3 py-2" role="group" aria-label="List workspace mode">
      {([
        ['new_list', 'New List', ListPlus],
        ['new_tier', 'New Tier List', Trophy],
        ['existing', 'Existing Lists', Save],
      ] as const).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => changeMode(value)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${mode === value ? 'bg-[var(--primary-action)] text-white shadow-md' : 'text-[#0f2b48] hover:bg-white/60'}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {value === 'existing' && <span className="rounded-full bg-white/20 px-1.5 font-mono text-[10px]">{lists.length}</span>}
        </button>
      ))}
    </div>
  );

  const searchContent = (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8C6D37]" />
      <input
        value={searchQuery}
        onChange={event => setSearchQuery(event.target.value)}
        placeholder="Search the full catalog to populate this list..."
        className="w-full rounded-xl border border-[#D9C8A9] bg-white py-2.5 pl-10 pr-9 text-xs font-semibold text-[#0C1D2D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
      />
      {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3" aria-label="Clear list search"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );

  const editor = (
    <div className="themed-panel space-y-4 rounded-2xl border border-[#D9C8A9] bg-[#FEFCF6] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {mode === 'existing' && lists.length > 0 ? (
          <select
            value={activeList.id}
            onChange={event => setActiveList(lists.find(list => list.id === event.target.value) || lists[0])}
            className="min-w-52 rounded-xl border border-[#C8B584] bg-white px-3 py-2 text-xs font-bold text-[#0f2b48]"
          >
            {lists.map(list => <option key={list.id} value={list.id}>{list.name} · {list.kind === 'tier' ? 'Tier List' : 'List'} · {list.entries.length}</option>)}
          </select>
        ) : null}
        <input
          value={activeList.name}
          onChange={event => setActiveList(current => ({ ...current, name: event.target.value }))}
          placeholder={activeList.kind === 'tier' ? 'Tier list name' : 'List name'}
          className="min-w-56 flex-1 rounded-xl border border-[#C8B584] bg-white px-3 py-2 text-xs font-bold text-[#0f2b48]"
        />
        <button type="button" onClick={saveList} className="flex items-center gap-1.5 rounded-xl bg-[#0B2B3C] px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> Save</button>
        {mode === 'existing' && lists.length > 0 && <button type="button" onClick={deleteActiveList} className="rounded-xl border border-rose-300 p-2 text-rose-700" aria-label="Delete active list"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="grid gap-2 rounded-xl border border-[#D9C8A9] bg-[#EFE8D8]/55 p-3 md:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2">
          <select value={importBucket} onChange={event => setImportBucket(event.target.value as PersonalGameBucketId)} className="min-w-0 flex-1 rounded-lg border border-[#C8B584] bg-white px-2 py-2 text-xs font-bold text-[#0f2b48]">
            {PERSONAL_GAME_BUCKETS.map(bucket => <option key={bucket.id} value={bucket.id}>Import {bucket.label}</option>)}
          </select>
          <button type="button" onClick={importSelectedBucket} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#0B2B3C] px-2.5 py-2 text-xs font-bold text-[#0B2B3C]"><ArrowDownToLine className="h-3.5 w-3.5" /> Import</button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <select value={exportBucket} onChange={event => setExportBucket(event.target.value as PersonalGameBucketId)} className="min-w-0 flex-1 rounded-lg border border-[#C8B584] bg-white px-2 py-2 text-xs font-bold text-[#0f2b48]">
            {PERSONAL_GAME_BUCKETS.map(bucket => <option key={bucket.id} value={bucket.id}>Send to {bucket.label}</option>)}
          </select>
          <button type="button" onClick={exportToSelectedBucket} className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0B2B3C] px-2.5 py-2 text-xs font-bold text-white"><ArrowUpFromLine className="h-3.5 w-3.5" /> Send</button>
        </div>
      </div>
      <p className="text-xs font-semibold text-[#6F5B39]">{message}</p>
      {activeList.kind === 'regular' ? (
        <div className="flex flex-wrap gap-2">
          {activeList.entries.map((entry, index) => (
            <button key={entry.game.id} type="button" onClick={() => persistActiveList(removeGameFromUserList(activeList, entry.game.id))} className="rounded-xl border border-[#D9C8A9] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0B2B3C]" title="Remove from list">
              {index + 1}. {entry.game.name} ×
            </button>
          ))}
          {activeList.entries.length === 0 && <span className="text-xs text-[#718294]">No games added yet.</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-[#718294]">Click a tier row to choose where the next selected game goes. Click its heading to rename it.</p>
          {tierRows.map(tier => (
            <div
              key={tier.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTier(tier.id)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setActiveTier(tier.id); }}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-2 transition-all ${activeTier === tier.id ? 'border-[#0B2B3C] bg-[#DCE9E5] shadow-[0_0_0_2px_rgba(197,160,89,0.45)]' : 'border-[#D9C8A9] bg-white hover:bg-[#F7F1E4]'}`}
              aria-label={`Use ${tier.label || 'unnamed tier'} for the next selected game`}
            >
              <input
                value={tier.label}
                onClick={event => event.stopPropagation()}
                onFocus={() => setActiveTier(tier.id)}
                onChange={event => renameTier(tier.id, event.target.value)}
                className={`w-28 rounded-lg border px-2 py-1.5 text-center text-xs font-black ${activeTier === tier.id ? 'border-[#0B2B3C] bg-[#0B2B3C] text-white' : 'border-[#D9C8A9] bg-[#EFE8D8] text-[#0B2B3C]'}`}
                aria-label={`Rename ${tier.label || 'tier'} row`}
              />
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{groupedEntries[tier.id].map(entry => <button key={entry.game.id} type="button" onClick={event => { event.stopPropagation(); persistActiveList(removeGameFromUserList(activeList, entry.game.id)); }} className="rounded-lg bg-[#EFE8D8] px-2 py-1 text-[11px] font-bold" title="Remove from tier list">{entry.game.name} ×</button>)}</div>
              <button type="button" onClick={event => { event.stopPropagation(); removeTier(tier.id); }} className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-100" aria-label={`Delete ${tier.label || 'tier'} row`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" onClick={addTier} disabled={tierRows.length >= MAX_TIER_ROWS} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#C8B584] bg-[#EFE8D8]/60 px-3 py-2 text-xs font-bold text-[#0B2B3C] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add Tier Row ({tierRows.length}/{MAX_TIER_ROWS})</button>
        </div>
      )}
    </div>
  );

  const previewNotice = isUsingPreviewCatalog ? (
    <div className="rounded-xl border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-xs font-semibold text-amber-900">
      Shared preview catalog · These ten sample records are available across the local app only. Production continues to use the generated IGDB catalog.
    </div>
  ) : null;

  return (
    <div className="animate-in fade-in duration-300">
      <GameListGrid
        collectionKey={`lists:${mode}:${activeList.id}:${searchQuery}`}
        headerContent={headerContent}
        searchContent={searchContent}
        noticeContent={<div className="space-y-3">{previewNotice}{editor}</div>}
        games={searchResults}
        isLoading={isSearching}
        onSelectGame={addGame}
        onVisibleGamesChange={setVisibleGames}
        emptyTitle={searchQuery.trim().length < 2 ? 'Search to Add Games' : 'No Catalog Matches'}
        emptyDescription={searchQuery.trim().length < 2 ? 'Enter at least two characters above, then select a game card to add it to the active list.' : 'Try another title or reset the catalog filters.'}
      />
    </div>
  );
};

export default RankedListsPage;
