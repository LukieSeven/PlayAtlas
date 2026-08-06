import React, { useState } from 'react';
import { Dices, Shuffle } from 'lucide-react';
import { CompactGameLookupRecord } from '../../types/catalog';
import { pickRandomGame } from '../../services/gameSourceService';
import { sampleRandomCatalogGame } from '../../services/tokenSearchService';
import { hydrateHomeWidgetGames } from '../../services/homeWidgetHydrationService';

interface Props {
  games: CompactGameLookupRecord[];
  allowCatalogSampling?: boolean;
  yuckedIds: Set<number>;
  onSelect: (game: CompactGameLookupRecord) => void;
}

export const RandomizerWidget: React.FC<Props> = ({ games, allowCatalogSampling = false, yuckedIds, onSelect }) => {
  const [selected, setSelected] = useState<CompactGameLookupRecord | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [isShuffling, setIsShuffling] = useState(false);

  const shuffle = async () => {
    setIsShuffling(true);
    try {
      let choice: CompactGameLookupRecord | null = null;
      if (allowCatalogSampling) {
        for (let attempt = 0; attempt < 8 && !choice; attempt++) {
          const candidate = await sampleRandomCatalogGame();
          if (candidate && !yuckedIds.has(candidate.id) && !seenIds.has(candidate.id)) choice = candidate;
        }
      } else {
        const candidates = games;
        choice = pickRandomGame(candidates.filter(game => !yuckedIds.has(game.id)), seenIds);
        if (!choice && candidates.length > 0) {
          setSeenIds(new Set());
          choice = pickRandomGame(candidates.filter(game => !yuckedIds.has(game.id)));
        }
      }
      if (choice) {
        const [hydrated] = await hydrateHomeWidgetGames([choice]);
        setSelected(hydrated || choice);
        setSeenIds(previous => new Set(previous).add(choice!.id));
      } else setSelected(null);
    } catch (error) {
      console.warn('Randomizer could not select a game:', error);
      setSelected(null);
    } finally {
      window.setTimeout(() => setIsShuffling(false), 350);
    }
  };

  return <div className="space-y-3">
    <div className="flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#D9C8A9] bg-[#EFE8D8]/75 p-4 text-center">
      {selected ? <button type="button" onClick={() => onSelect(selected)} className="group flex items-center gap-4 text-left">{selected.coverUrl && <img src={selected.coverUrl} alt="" className={`h-24 w-20 rounded-xl object-cover shadow-md ${isShuffling ? 'animate-pulse' : ''}`} />}<span><span className="block font-serif text-xl font-bold text-[#0C1D2D]">{selected.name}</span><span className="mt-1 block text-xs text-[#47586A]">{selected.year || 'Release date TBA'} · View details</span></span></button> : <><Dices className={`h-10 w-10 text-[#0B6777] ${isShuffling ? 'animate-spin' : ''}`} /><p className="mt-2 text-xs font-semibold text-[#47586A]">Shuffle this source to choose your next game.</p></>}
    </div>
    <button type="button" onClick={shuffle} disabled={isShuffling} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B2B3C] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"><Shuffle className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />{selected ? 'Shuffle Again' : 'Shuffle'}</button>
  </div>;
};
