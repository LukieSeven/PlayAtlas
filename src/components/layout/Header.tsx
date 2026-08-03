import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Gamepad2, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCatalogSearch } from '../../hooks/useCatalogSearch';
import { CompactGameLookupRecord } from '../../types/catalog';
import { useTheme } from '../../context/ThemeContext';
import { UniversalActionMenu } from '../common/UniversalActionMenu';
import { getGameTypeLabel, shouldShowGameTypeBadge } from '../../services/gameTypePresentationService';
import { normalizeGameTypeCategory } from '../../utils/gameTypeUtils';

interface HeaderProps {
  onSelectGame?: (gameId: number, name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectGame }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);
  const { activeTokens, setThemePreset, availablePresets } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-30 themed-header w-full px-4 md:px-8 py-3 flex items-center justify-between gap-4 border-b border-[var(--panel-border)] shadow-sm">
      {/* Left Search Bar Area */}
      <div className="relative flex-1 max-w-xl" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search over 370,000+ games across all platforms..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-medium themed-input focus:ring-2 focus:ring-[var(--focus-ring)] transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 themed-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
                <span>Searching Play Atlas catalog...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] font-mono">
                No matching games found for "{searchQuery}".
              </div>
            ) : (
              <div className="divide-y divide-[var(--panel-border)]">
                <div className="px-4 py-2 bg-[rgba(0,0,0,0.05)] text-[10px] font-mono text-[var(--text-muted)] uppercase flex justify-between">
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
                      className="p-3 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-11 rounded-lg bg-slate-900 border border-[var(--panel-border)] shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-mono text-slate-400">
                          <Gamepad2 className="w-4 h-4 text-[var(--accent-color)] opacity-70" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                              {game.name}
                            </h4>
                            {showTypeBadge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 uppercase">
                                {getGameTypeLabel(gameCategory)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            {game.year || 'TBA'}
                          </p>
                        </div>
                      </div>

                      {/* Right Action Menu in Header Dropdown */}
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

      {/* Right Top Header Theme Selector & Settings Controls */}
      <div className="flex items-center gap-3" ref={themeRef}>
        <div className="relative">
          <button
            onClick={() => setIsThemePopoverOpen(!isThemePopoverOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl themed-panel border border-[var(--panel-border)] hover:border-[var(--accent-color)] text-xs font-bold transition-all shadow-sm"
            title="Change Visual Theme"
          >
            <Palette className="w-4 h-4 text-[var(--accent-color)]" />
            <span className="hidden sm:inline text-[var(--text-primary)]">{activeTokens.name.split(' ')[0]}</span>
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-inner"
              style={{ backgroundColor: activeTokens.primaryAction }}
            />
          </button>

          {/* Theme Preset Selector Popover */}
          {isThemePopoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 themed-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2">
                <span className="text-xs font-bold themed-heading">Theme Presets</span>
                <button
                  onClick={() => {
                    setIsThemePopoverOpen(false);
                    navigate('/settings');
                  }}
                  className="text-[10px] font-mono text-[var(--accent-color)] hover:underline"
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
                        ? 'bg-[var(--primary-action)] text-white shadow-sm'
                        : 'text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)]'
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
      </div>
    </header>
  );
};
