import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Gamepad2, Sparkles, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCatalogSearch } from '../../hooks/useCatalogSearch';
import { CompactGameLookupRecord } from '../../types/catalog';
import { useTheme } from '../../context/ThemeContext';
import { UniversalActionMenu } from '../common/UniversalActionMenu';
import { getGameTypeLabel, shouldShowGameTypeBadge } from '../../services/gameTypePresentationService';
import { normalizeGameTypeCategory } from '../../utils/gameTypeUtils';

interface HeaderProps {
  onSelectGame?: (gameId: number, name: string) => void;
}

const getPageTitle = (pathname: string): { title: string; subtitle: string } => {
  switch (pathname) {
    case '/my-games':
      return { title: 'My Games', subtitle: 'Authoritative personal game library' };
    case '/new-releases':
      return { title: 'New Releases', subtitle: 'Latest releases and launches' };
    case '/upcoming':
      return { title: 'Upcoming Games', subtitle: 'Upcoming titles spotlight' };
    case '/calendar':
      return { title: 'Games Calendar', subtitle: 'Scheduled gaming events and releases' };
    case '/discounts':
      return { title: 'Discounts & Deals', subtitle: 'Featured platform game sales' };
    case '/lists':
      return { title: 'Ranked Lists', subtitle: 'Curated library rankings' };
    case '/tier-lists':
      return { title: 'Tier Lists', subtitle: 'Personal tier ratings' };
    case '/collections':
      return { title: 'Collections', subtitle: 'Custom gaming collections' };
    case '/settings':
      return { title: 'Settings', subtitle: 'Application customization' };
    default:
      return { title: 'Home', subtitle: 'Your customizable gaming hub' };
  }
};

export const Header: React.FC<HeaderProps> = ({ onSelectGame }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);
  const { activeTokens, setThemePreset, availablePresets } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { title, subtitle } = getPageTitle(location.pathname);
  const { results, totalMatches, isSearching, search } = useCatalogSearch();

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        search(searchQuery, 8);
      }
    }, 150);

    return () => clearTimeout(handler);
  }, [searchQuery, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (game: CompactGameLookupRecord) => {
    if (onSelectGame) {
      onSelectGame(game.id, game.name);
    }
    setSearchQuery('');
  };

  const presetList = Object.values(availablePresets);

  return (
    <header className="sticky top-0 z-30 themed-header w-full px-4 md:px-6 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 border-b border-[#D9C8A9] bg-[#F4EFE6]/95 backdrop-blur-sm shadow-xs select-none">
      {/* Left Header Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-[#0C1D2D] leading-none tracking-tight">
              {title}
            </h1>
            <span className="text-[#C5A059] text-base leading-none">✦</span>
          </div>
          <p className="text-xs text-[#47586A] font-sans font-medium mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Center/Right Search Bar & Controls */}
      <div className="flex items-center gap-3 flex-1 md:flex-initial max-w-xl justify-end">
        {/* Search Control */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-[#8C6D37] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search games, lists, tags..."
              className="w-full pl-10 pr-9 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#C5A059] placeholder:text-[#718294] focus:outline-none focus:ring-2 focus:ring-[#C5A059] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-[#718294] hover:text-[#0C1D2D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-[#C5A059] shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto bg-[#FDFBF7] text-[#0C1D2D]">
              {isSearching ? (
                <div className="p-6 text-center text-xs text-[#0C1D2D] flex items-center justify-center gap-2 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B2B3C]" />
                  <span>Searching Play Atlas catalog...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#718294] font-mono">
                  No matching games found for "{searchQuery}".
                </div>
              ) : (
                <div className="divide-y divide-[#D9C8A9]/60">
                  <div className="px-4 py-2 bg-[#EFE8D8] text-[10px] font-mono text-[#0C1D2D] font-bold uppercase flex justify-between">
                    <span>Results ({totalMatches.toLocaleString()})</span>
                    <span>Press game to view details</span>
                  </div>

                  {results.map((game: CompactGameLookupRecord) => {
                    const gameCategory = normalizeGameTypeCategory(game.gameType || undefined, game.name);
                    const showTypeBadge = shouldShowGameTypeBadge(gameCategory);

                    return (
                      <div
                        key={game.id}
                        onClick={() => handleResultClick(game)}
                        className="p-3 hover:bg-[#EFE8D8]/70 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-11 rounded-lg bg-[#EFE8D8] border border-[#D9C8A9] shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-mono text-[#8C6D37]">
                            <Gamepad2 className="w-4 h-4 text-[#8C6D37]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-[#0C1D2D] truncate">
                                {game.name}
                              </h4>
                              {showTypeBadge && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#0B2B3C]/10 text-[#0B2B3C] border border-[#0B2B3C]/20 uppercase">
                                  {getGameTypeLabel(gameCategory)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-[#718294]">
                              {game.year || 'TBA'}
                            </p>
                          </div>
                        </div>

                        <div onClick={e => e.stopPropagation()}>
                          <UniversalActionMenu
                            gameId={game.id}
                            gameTitle={game.name}
                            releaseYear={game.year || undefined}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customize Theme Button */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setIsThemePopoverOpen(!isThemePopoverOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#C5A059] hover:bg-[#EFE8D8] text-xs font-bold transition-all shadow-xs text-[#0C1D2D] cursor-pointer"
            title="Customize Theme"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Customize</span>
          </button>

          {/* Theme Preset Selector Popover */}
          {isThemePopoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[#C5A059] shadow-2xl p-3 z-50 space-y-2 bg-[#FDFBF7] text-[#0C1D2D]">
              <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-2">
                <span className="text-xs font-bold font-serif">Theme Presets</span>
                <button
                  onClick={() => {
                    setIsThemePopoverOpen(false);
                    navigate('/settings');
                  }}
                  className="text-[10px] font-sans font-semibold text-[#8C6D37] hover:underline"
                >
                  More Options →
                </button>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto">
                {presetList.map(preset => (
                  <button
                    key={preset.presetKey}
                    onClick={() => {
                      setThemePreset(preset.presetKey);
                      setIsThemePopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all ${
                      preset.presetKey === activeTokens.presetKey
                        ? 'bg-[#0B2B3C] text-white shadow-xs'
                        : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/40"
                      style={{ backgroundColor: preset.primaryAction }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#FDFBF7] border border-[#D9C8A9] text-xs font-bold text-[#0C1D2D]">
          <div className="w-6 h-6 rounded-full bg-[#0B2B3C] text-[#C5A059] flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span>Aventurer</span>
        </div>
      </div>
    </header>
  );
};
