import React, { useState, useEffect, useRef } from 'react';
import { Compass, Search, Menu, Moon, Sun, Bell, Plus, Loader2, Sparkles, Layers, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { executeProgressiveTokenSearch, CompactGameLookupRecord } from '../../services/tokenSearchService';
import { GameDetailModal } from '../widgets/GameDetailModal';

export const Header: React.FC = () => {
  const { activeTokens, setThemePreset } = useTheme();
  const { toggleMobileOpen } = useSidebar();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CompactGameLookupRecord[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedGame, setSelectedGame] = useState<{ id: number; chunk?: number; name: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced progressive token search execution (300 ms debounce)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    setSearchError(null);

    // Require at least 2 characters (or 1 character for numeric queries e.g. "3" or "7")
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-slate-800/80 glass-panel bg-slate-950/70 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left Navigation Toggle for Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileOpen}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-indigo-400 font-mono text-xs">
              <Compass className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-bold tracking-wider text-slate-300">PLAY ATLAS</span>
            </div>
          </div>

          {/* Center Search Input Bar */}
          <div ref={containerRef} className="relative flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsOpen(true);
                }}
                placeholder="Search 5,900+ games, franchises, or developers (e.g. Final Fantasy, Witcher, Halo)..."
                className="w-full pl-10 pr-10 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Results Dropdown Panel */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                {isSearching && (
                  <div className="flex items-center gap-2.5 p-4 text-xs font-mono text-slate-400">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Searching token index...</span>
                  </div>
                )}

                {searchError && (
                  <div className="p-4 text-xs font-mono text-red-400 bg-red-500/10 border-b border-red-500/20">
                    ❌ {searchError}
                  </div>
                )}

                {!isSearching && !searchError && searchResults.length === 0 && (
                  <div className="p-4 text-xs font-mono text-slate-400 text-center">
                    0 games matching "{searchQuery}"
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="divide-y divide-slate-800/60">
                    <div className="px-3 py-2 bg-slate-950/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Search Results ({searchResults.length})</span>
                      <span className="text-cyan-400 font-bold">Progressive Token Match</span>
                    </div>

                    {searchResults.map(game => (
                      <button
                        key={game.id}
                        onClick={() => {
                          setSelectedGame({ id: game.id, chunk: game.chunk, name: game.name });
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                            {game.defaultVisible ? <Sparkles className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                              {game.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {game.year ? game.year : 'TBA'} • {game.gameType}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 group-hover:underline">View</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            <Button variant="glow" size="sm" icon={<Plus className="w-3.5 h-3.5 hidden sm:inline" />}>
              <span className="hidden sm:inline">New List</span>
              <span className="sm:hidden">+</span>
            </Button>

            {/* Theme Switcher Button */}
            <button
              onClick={() => setThemePreset(activeTokens.isDark ? 'clean_catalog' : 'watercolor_atlas')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors border border-slate-800"
              title={`Switch Theme Preset (Current: ${activeTokens.name})`}
            >
              {activeTokens.isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors border border-slate-800"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
            </button>

            {/* User Avatar Placeholder */}
            <div className="pl-1 flex items-center gap-2 border-l border-slate-800 ml-1">
              <Avatar name="Lukie Seven" size="md" />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-100 leading-none">LukieSeven</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">Curator</span>
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
