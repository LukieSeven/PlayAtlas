import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { CompactGameLookupRecord } from '../../types/catalog';
import { HomeWidgetDisplaySettings } from '../../types/homeWidget';
import { GameCard } from '../common/GameCard';
import { RandomizerWidget } from './RandomizerWidget';

interface Props {
  games: CompactGameLookupRecord[];
  display: HomeWidgetDisplaySettings;
  isHydrating?: boolean;
  onSelect: (game: CompactGameLookupRecord) => void;
  yuckedIds?: Set<number>;
  allowCatalogSampling?: boolean;
}

export const HomeGameWidgetRenderer: React.FC<Props> = ({ games, display, isHydrating = false, onSelect, yuckedIds = new Set(), allowCatalogSampling = false }) => {
  const visibleGames = useMemo(() => games.slice(0, display.itemLimit), [games, display.itemLimit]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(index => Math.min(index, Math.max(0, visibleGames.length - 1))), [visibleGames.length]);
  useEffect(() => {
    if (display.presentation !== 'carousel' || !display.autoRotate || visibleGames.length < 2) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % visibleGames.length), Math.max(4, display.rotationSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [display.autoRotate, display.presentation, display.rotationSeconds, visibleGames.length]);

  if (display.presentation === 'randomizer') return <RandomizerWidget games={games} allowCatalogSampling={allowCatalogSampling} yuckedIds={yuckedIds} onSelect={onSelect} />;
  if (isHydrating) return <div className="grid min-h-44 grid-cols-2 gap-3"><div className="animate-pulse rounded-xl bg-[#D9C8A9]/60" /><div className="animate-pulse rounded-xl bg-[#D9C8A9]/40" /></div>;
  if (visibleGames.length === 0) return <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-[#C8B584] bg-[#EFE8D8]/70 text-xs font-semibold text-[#47586A]">No games are available for this widget yet.</div>;

  const meta = (game: CompactGameLookupRecord) => [display.showPlatforms ? game.platforms?.slice(0, 2).join(', ') : '', display.showRating && game.rating ? `${game.rating.toFixed(1)} stars` : ''].filter(Boolean).join(' · ');

  if (display.presentation === 'grid') return <div className="atlas-widget-card-grid">{visibleGames.map(game => <GameCard key={game.id} game={game} onSelect={onSelect} />)}</div>;

  if (display.presentation === 'list') return <ol className="space-y-2">{visibleGames.map((game, index) => <li key={game.id}><button type="button" onClick={() => onSelect(game)} className="flex w-full items-center gap-3 rounded-xl border border-[#D9C8A9] bg-white/70 p-2 text-left hover:bg-[#EFE8D8]">{display.showArtwork && <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EFE8D8]">{game.coverUrl ? <img src={game.coverUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[#8C6D37]" />}</div>}<span className="font-mono text-xs font-black text-[#8C6D37]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#0C1D2D]">{game.name}</span><span className="block truncate text-[10px] text-[#718294]">{game.year || 'TBA'}{meta(game) ? ` · ${meta(game)}` : ''}</span></span></button></li>)}</ol>;

  const game = visibleGames[activeIndex];
  return <div className="relative min-h-52 overflow-hidden rounded-2xl border border-[#C8B584] bg-[#0B2B3C] text-white"><button type="button" onClick={() => onSelect(game)} className="absolute inset-0 w-full text-left">{display.showArtwork && game.coverUrl ? <img src={game.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#0B6777] to-[#071c2a]" />}<span className="absolute inset-0 bg-gradient-to-t from-[#071c2a] via-[#071c2a]/40 to-transparent" /><span className="absolute bottom-0 left-0 right-0 block p-5"><span className="block font-serif text-2xl font-bold">{game.name}</span><span className="mt-1 block text-xs text-white/80">{game.year || 'Release date TBA'}{meta(game) ? ` · ${meta(game)}` : ''}</span></span></button>{display.presentation === 'carousel' && visibleGames.length > 1 && <><button type="button" onClick={() => setActiveIndex(index => (index - 1 + visibleGames.length) % visibleGames.length)} className="absolute left-3 top-1/2 z-10 rounded-full bg-[#071c2a]/70 p-2" aria-label="Previous game"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setActiveIndex(index => (index + 1) % visibleGames.length)} className="absolute right-3 top-1/2 z-10 rounded-full bg-[#071c2a]/70 p-2" aria-label="Next game"><ChevronRight className="h-4 w-4" /></button></>}</div>;
};
