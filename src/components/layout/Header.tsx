import React from 'react';
import { Compass, Search, Menu, Moon, Sun, Bell, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';

export const Header: React.FC = () => {
  const { setTheme, isDark } = useTheme();
  const { toggleMobileOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 md:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Mobile Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileOpen}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-wider text-white leading-none group-hover:text-indigo-400 transition-colors">
                PLAY<span className="text-indigo-400">ATLAS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight">GAME DISCOVERY & LISTS</span>
            </div>
          </a>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <Input
            placeholder="Search games, top 10 lists, tier lists, or creators..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button variant="glow" size="sm" icon={<Plus className="w-3.5 h-3.5 hidden sm:inline" />}>
            <span className="hidden sm:inline">New List</span>
            <span className="sm:hidden">+</span>
          </Button>

          {/* Theme Switcher Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors border border-slate-800"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
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
  );
};
