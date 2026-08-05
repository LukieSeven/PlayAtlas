import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Bookmark,
  ArrowRight,
  Bell
} from 'lucide-react';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import { CompactGameLookupRecord } from '../types/catalog';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { FantasyLandscapeArtwork } from '../components/ui/FantasyLandscapeArtwork';
import { Button } from '../components/ui/Button';
import { getUpcomingGames } from '../services/releaseCatalogService';
import { hydrateCompactRecordsBatch, convertPersonalRecordToCompact } from '../services/catalogDetailService';

export const HomePage: React.FC = () => {
  const rawRecords = usePersonalGameLibrary();

  // Selected Game state for Modal
  const [selectedGameForModal, setSelectedGameForModal] = useState<CompactGameLookupRecord | null>(null);

  // Recent Release Feed state
  const [recentReleases, setRecentReleases] = useState<CompactGameLookupRecord[]>([]);

  // Hydration state for displayed compact records
  const [hydratedCompactMap, setHydratedCompactMap] = useState<Map<number, CompactGameLookupRecord>>(new Map());
  const attemptedHydrationIdsRef = useRef<Set<number>>(new Set());

  // Derive playing & active records from personal library
  const playingRecords = useMemo(() => {
    return rawRecords
      .filter(r => r.currentPlayStatus === 'playing')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [rawRecords]);

  // Live Countdown Timer state for Featured Game
  const [countdown, setCountdown] = useState({ days: 23, hrs: 14, mins: 37, secs: 52 });
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        return { ...prev, secs: 59, mins: prev.mins > 0 ? prev.mins - 1 : 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Recent Release Discovery Feed (Non-blocking)
  useEffect(() => {
    let isMounted = true;

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
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Hydration batch processing
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* 2-Column Main Dashboard Grid Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================== LEFT COLUMN (approx 60% = col-span-7) ==================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* WIDGET 1: FEATURED UPCOMING GAME */}
          <div className="rounded-3xl border border-[#C5A059] bg-[#FDFBF7] shadow-lg overflow-hidden relative group">
            {/* Top Landscape Artwork Container */}
            <div className="relative h-64 md:h-72 w-full overflow-hidden bg-[#0B2B3C]">
              <FantasyLandscapeArtwork variant="featured" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

              {/* Gold Ribbon Badge Overlay */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0B2B3C]/80 backdrop-blur-md text-[#C5A059] border border-[#C5A059] text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>FEATURED UPCOMING GAME</span>
              </div>
            </div>

            {/* Bottom Content Information Panel */}
            <div className="p-6 md:p-8 space-y-4 bg-[#FDFBF7] relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0C1D2D] leading-tight">
                    ECHOES OF THE WILDMOOR
                  </h2>
                  <p className="text-xs font-sans font-bold text-[#8C6D37]">
                    RPG, Open World • PC, PS5, XSX
                  </p>
                </div>

                {/* Countdown Timer Block */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-extrabold text-[#718294] uppercase tracking-wider block">
                    RELEASES IN
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-[#0C1D2D]">
                    <div className="px-2 py-1 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] text-center min-w-[36px]">
                      <span className="block text-sm text-[#0B2B3C]">{countdown.days}</span>
                      <span className="text-[9px] text-[#47586A]">DAYS</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] text-center min-w-[36px]">
                      <span className="block text-sm text-[#0B2B3C]">{countdown.hrs}</span>
                      <span className="text-[9px] text-[#47586A]">HRS</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] text-center min-w-[36px]">
                      <span className="block text-sm text-[#0B2B3C]">{countdown.mins}</span>
                      <span className="text-[9px] text-[#47586A]">MINS</span>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] text-center min-w-[36px]">
                      <span className="block text-sm text-[#0B2B3C]">{countdown.secs}</span>
                      <span className="text-[9px] text-[#47586A]">SECS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="primary" icon={<ArrowRight className="w-4 h-4 text-[#C5A059]" />}>
                  View Details
                </Button>
                <Button variant="secondary" icon={<Bookmark className="w-4 h-4 text-[#8C6D37]" />}>
                  Bookmark
                </Button>
              </div>
            </div>
          </div>

          {/* WIDGET 3: CURRENTLY PLAYING */}
          <div className="p-6 rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
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
              // Default Formatted Display Items matching Target Mockup
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: "Baldur's Gate 3", progress: '68% • 82h', platform: 'PC' },
                  { title: 'Zelda: TotK', progress: '54% • 60h', platform: 'Switch' },
                  { title: 'Cyberpunk 2077', progress: '42% • 34h', platform: 'PC' },
                  { title: 'Stardew Valley', progress: '86% • 120h', platform: 'PC' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-[#D9C8A9] bg-[#EFE8D8] space-y-2 hover:border-[#C5A059] transition-all cursor-pointer"
                  >
                    <div className="aspect-[3/4] w-full rounded-xl bg-[#0B2B3C]/10 border border-[#D9C8A9] flex items-center justify-center text-[#0B2B3C] text-xs font-serif font-bold p-2 text-center">
                      {item.title}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#0C1D2D] truncate">{item.title}</h4>
                      <p className="text-[10px] font-mono font-semibold text-[#47586A]">{item.progress} • {item.platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WIDGET 5: DEALS • PLAYSTATION STORE */}
          <div className="p-6 rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">DEALS • PLAYSTATION STORE</h3>
              </div>
              <Link to="/discounts" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: 'Elden Ring', discount: '-40%', price: '$35.99', orig: '$59.99' },
                { title: 'God of War', discount: '-50%', price: '$19.99', orig: '$39.99' },
                { title: 'Ghost of Tsushima', discount: '-33%', price: '$46.89', orig: '$69.99' },
                { title: "Demon's Souls", discount: '-60%', price: '$27.99', orig: '$69.99' },
              ].map((deal, idx) => (
                <div key={idx} className="p-3 rounded-2xl border border-[#D9C8A9] bg-[#EFE8D8] space-y-2 hover:border-[#C5A059] transition-all">
                  <div className="aspect-[4/3] w-full rounded-xl bg-[#0B2B3C]/10 border border-[#D9C8A9] flex items-center justify-center text-[#0B2B3C] text-xs font-serif font-bold p-2 text-center">
                    {deal.title}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#0C1D2D] truncate">{deal.title}</h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[#0B2B3C] text-white text-[10px] font-bold">{deal.discount}</span>
                      <div>
                        <span className="font-bold text-[#0C1D2D] mr-1">{deal.price}</span>
                        <span className="line-through text-[#718294] text-[9px]">{deal.orig}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN (approx 40% = col-span-5) ==================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* WIDGET 2: TOP 10 IN PROGRESS */}
          <div className="p-6 rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">TOP 10 IN PROGRESS</h3>
              </div>
              <Link to="/my-games?view=playing" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            {/* List Rows */}
            <div className="space-y-3 font-sans">
              {[
                { rank: 1, title: "Baldur's Gate 3", platform: 'PC', pct: 68 },
                { rank: 2, title: 'The Legend of Zelda: Tears of the Kingdom', platform: 'Switch', pct: 54 },
                { rank: 3, title: 'Cyberpunk 2077: Phantom Liberty', platform: 'PC', pct: 42 },
                { rank: 4, title: 'Red Dead Redemption 2', platform: 'PC', pct: 31 },
                { rank: 5, title: 'Horizon Forbidden West', platform: 'PS5', pct: 28 },
              ].map(item => (
                <div key={item.rank} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#EFE8D8] transition-colors">
                  <span className="font-mono font-extrabold text-sm text-[#0B2B3C] w-4 text-center">{item.rank}</span>
                  <div className="w-8 h-10 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] shrink-0 flex items-center justify-center text-[10px] font-mono font-bold text-[#8C6D37]">
                    {item.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <h4 className="font-bold text-[#0C1D2D] truncate">{item.title}</h4>
                      <span className="text-[10px] font-mono font-bold text-[#8C6D37] shrink-0 ml-2">{item.platform}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#EFE8D8] rounded-full h-1.5 overflow-hidden border border-[#D9C8A9]">
                      <div className="bg-[#0B2B3C] h-full rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0C1D2D] w-10 text-right">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET 4: NEW RELEASES */}
          <div className="p-6 rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">NEW RELEASES</h3>
              </div>
              <Link to="/new-releases" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3 font-sans">
              {[
                { title: 'Manor Lords', genre: 'Strategy, City Builder', platform: 'PC', price: '$39.99' },
                { title: 'Animal Well', genre: 'Metroidvania, Puzzle', platform: 'PC, Switch', price: '$24.99' },
                { title: 'Pacific Drive', genre: 'Survival, Driving', platform: 'PC, PS5', price: '$29.99' },
                { title: 'The Rogue Prince of Persia', genre: 'Action, Platformer', platform: 'PC, Switch', price: '$24.99' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#EFE8D8] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EFE8D8] border border-[#D9C8A9] shrink-0 flex items-center justify-center text-xs font-serif font-bold text-[#0B2B3C]">
                      {item.title[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#0C1D2D] truncate">{item.title}</h4>
                      <p className="text-[10px] text-[#47586A] truncate">{item.genre} • {item.platform}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-[#0B2B3C] text-white font-mono text-xs font-bold border border-[#C5A059] shrink-0 ml-2">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET 6: UPCOMING EVENTS */}
          <div className="p-6 rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[#C5A059] text-sm">✦</span>
                <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">UPCOMING EVENTS</h3>
              </div>
              <Link to="/calendar" className="text-xs font-sans font-bold text-[#0B2B3C] hover:underline">
                View Calendar
              </Link>
            </div>

            <div className="space-y-3 font-sans relative z-10">
              {[
                { month: 'MAY', day: '24', title: 'PlayStation State of Play', time: 'May 24, 2024 • 3:00 PM PT', color: 'bg-indigo-600' },
                { month: 'JUN', day: '09', title: 'Xbox Games Showcase', time: 'June 9, 2024 • 10:00 AM PT', color: 'bg-emerald-600' },
                { month: 'JUN', day: '10', title: 'Summer Game Fest 2024', time: 'June 10, 2024 • 2:00 PM PT', color: 'bg-purple-600' },
              ].map((evt, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FDFBF7]/90 border border-[#D9C8A9] hover:bg-[#EFE8D8] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EFE8D8] border border-[#D9C8A9] text-center flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-mono font-extrabold text-[#718294] leading-none">{evt.month}</span>
                      <span className="text-sm font-mono font-extrabold text-[#0B2B3C] leading-none mt-0.5">{evt.day}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${evt.color}`} />
                        <h4 className="font-bold text-xs text-[#0C1D2D]">{evt.title}</h4>
                      </div>
                      <p className="text-[10px] font-mono text-[#47586A] mt-0.5">{evt.time}</p>
                    </div>
                  </div>
                  <Bell className="w-4 h-4 text-[#8C6D37] hover:text-[#0B2B3C] cursor-pointer" />
                </div>
              ))}
            </div>

            {/* Lower-Right Corner Castle Landscape Illustration */}
            <div className="absolute right-0 bottom-0 w-64 h-36 opacity-30 pointer-events-none z-0">
              <FantasyLandscapeArtwork variant="events" />
            </div>
          </div>
        </div>
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
