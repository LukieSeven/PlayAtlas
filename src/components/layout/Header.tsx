import React, { useState, useEffect, useRef } from 'react';
import { Compass, Search, Menu, Bell, Plus, Loader2, Sparkles, Layers, X, Palette, Check, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { ThemePresetKey } from '../../types/theme';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { executeProgressiveTokenSearch, CompactGameLookupRecord } from '../../services/tokenSearchService';
import { GameDetailModal } from '../widgets/GameDetailModal';

export const Header: React.FC = () => {
  const { currentPresetKey, activeTokens, setThemePreset, availablePresets } = useTheme();
  const { toggleMobileOpen } = useSidebar();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CompactGameLookupRecord[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<{ id: number; chunk?: number; name: string } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Debounced progressive token search execution (300 ms debounce)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    setSearchError(null);

    const isNumeric = /^\d+$/.test(trimmed);
    if (!trimmed || (!isNumeric && trimmed.length < 2)) {
      setSearchResults([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

    const timer = setTimeout(() => {
      executeProgressiveTokenSearch(trimmed, 20)
        .then(({ results }) => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch(err => {
          console.error('Header quick search error:', err);
          setSearchError('Search failed');
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search & theme menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 w-full themed-header px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left Navigation Toggle for Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileOpen}
              className="lg:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[var(--accent-color)] font-mono text-xs">
              <Compass className="w-4 h-4 text-[var(--accent-color)] animate-pulse" />
              <span className="font-bold tracking-wider text-[var(--heading-color)] serif-heading">PLAY ATLAS</span>
            </div>
          </div>

          {/* Center Search Input Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsOpen(true);
                }}
                placeholder="Search 5,900+ games, franchises, or developers (e.g. Final Fantasy, Witcher, Halo)..."
                className="w-full pl-10 pr-10 py-2 rounded-2xl themed-input text-xs font-medium focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Results Dropdown Panel */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 themed-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                {isSearching && (
                  <div className="flex items-center gap-2.5 p-4 text-xs font-mono text-[var(--text-muted)]">
                    <Loader2 className="w-4 h-4 text-[var(--primary-action)] animate-spin" />
                    <span>Searching token index...</span>
                  </div>
                )}

                {searchError && (
                  <div className="p-4 text-xs font-mono text-rose-500 bg-rose-500/10 border-b border-rose-500/20">
                    ❌ {searchError}
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && (
                  <div className="p-4 text-xs font-mono text-[var(--text-muted)] text-center">
                    0 games matching "{searchQuery}"
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="divide-y divide-[var(--panel-border)]">
                    <div className="px-3 py-2 bg-[rgba(0,0,0,0.05)] text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider flex justify-between items-center">
                      <span>Search Results ({searchResults.length})</span>
                      <span className="text-[var(--accent-color)] font-bold">Progressive Token Match</span>
                    </div>

                    {searchResults.map(game => (
                      <button
                        key={game.id}
                        onClick={() => {
                          setSelectedGame({ id: game.id, chunk: game.chunk, name: game.name });
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.15)] border border-[var(--panel-border)] flex items-center justify-center text-[var(--accent-color)] group-hover:scale-105 transition-transform">
                            {game.defaultVisible ? <Sparkles className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-action)] transition-colors">
                              {game.name}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">
                              {game.year ? game.year : 'TBA'} • {game.gameType}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--primary-action)] group-hover:underline">View</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Controls & Top Application Theme Selector */}
          <div className="flex items-center gap-2.5">
            <Button variant="glow" size="sm" icon={<Plus className="w-3.5 h-3.5 hidden sm:inline" />}>
              <span className="hidden sm:inline">New List</span>
              <span className="sm:hidden">+</span>
            </Button>

            {/* TOP APPLICATION HEADER THEME SELECTOR DROPDOWN */}
            <div ref={themeMenuRef} className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--app-bg-secondary)] border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-sm group"
                title="Change Theme Preset"
                aria-expanded={isThemeMenuOpen}
              >
                <Palette className="w-4 h-4 text-[var(--accent-color)] group-hover:rotate-12 transition-transform" />
                <span className="hidden md:inline font-bold">{activeTokens.name}</span>
                <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: activeTokens.primaryAction }} />
              </button>

              {/* Compact Theme Preset Selector Dropdown */}
              {isThemeMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 themed-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                  <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2 px-1">
                    <span className="text-xs font-bold themed-heading">Theme Presets</span>
                    <Badge variant="amber">6 AVAILABLE</Badge>
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                    {Object.values(availablePresets).map(preset => {
                      const isActive = currentPresetKey === preset.presetKey;

                      return (
                        <button
                          key={preset.presetKey}
                          onClick={() => {
                            setThemePreset(preset.presetKey as ThemePresetKey);
                            setIsThemeMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all ${
                            isActive
                              ? 'bg-[rgba(212,175,55,0.2)] text-[var(--text-primary)] font-bold border border-[var(--accent-color)]'
                              : 'text-[var(--text-secondary)] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: preset.primaryAction }} />
                            <span>{preset.name}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-[var(--accent-color)]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Full Theme Settings Action */}
                  <div className="pt-2 border-t border-[var(--panel-border)]">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.08)] text-[11px] font-bold text-[var(--primary-action)] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Full Theme Settings & Accessibility</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors border border-[var(--panel-border)]"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-color)] ring-2 ring-slate-950" />
            </button>

            {/* User Avatar */}
            <div className="pl-1 flex items-center gap-2 border-l border-[var(--panel-border)] ml-1">
              <Avatar name="Lukie Seven" size="md" />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[var(--text-primary)] leading-none">LukieSeven</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">Curator</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          gameId={selectedGame.id}
          chunkNumber={selectedGame.chunk}
          initialTitle={selectedGame.name}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
};
