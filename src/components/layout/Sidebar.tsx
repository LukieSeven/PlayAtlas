import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass,
  Home,
  Gamepad2,
  Rocket,
  Flame,
  CalendarDays,
  Tag,
  Trophy,
  Layers,
  FolderArchive,
  Plus,
  Trash2,
  Bookmark,
  Settings
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { usePersonalGameLibrary } from '../../hooks/usePersonalGameLibrary';
import { Badge } from '../ui/Badge';
import { AddTabModal } from '../widgets/AddTabModal';

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4 text-[#C5A059]" />,
  Gamepad2: <Gamepad2 className="w-4 h-4 text-[#C5A059]" />,
  Rocket: <Rocket className="w-4 h-4 text-[#C5A059]" />,
  Flame: <Flame className="w-4 h-4 text-[#C5A059]" />,
  CalendarDays: <CalendarDays className="w-4 h-4 text-[#C5A059]" />,
  Tag: <Tag className="w-4 h-4 text-[#C5A059]" />,
  Trophy: <Trophy className="w-4 h-4 text-[#C5A059]" />,
  Layers: <Layers className="w-4 h-4 text-[#C5A059]" />,
  FolderArchive: <FolderArchive className="w-4 h-4 text-[#C5A059]" />,
  Bookmark: <Bookmark className="w-4 h-4 text-[#C5A059]" />,
};

export const Sidebar: React.FC = () => {
  const { customTabs, addTab, deleteTab } = useSidebar();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const rawRecords = usePersonalGameLibrary();

  // Real library summary stats derived from actual store state
  const libraryStats = useMemo(() => {
    return {
      wishlist: rawRecords.filter(r => r.interestStatus === 'wanted' || r.interestStatus === 'wishlist').length,
      backlog: rawRecords.filter(r => r.inBacklogQueue).length,
      completed: rawRecords.filter(r => r.currentPlayStatus === 'completed' || (r.completionHistory && r.completionHistory.length > 0)).length,
    };
  }, [rawRecords]);

  const isDefaultSystemTab = (id: string) => {
    return ['home', 'my-games', 'new-releases', 'upcoming', 'calendar', 'discounts', 'deals', 'settings'].includes(id);
  };

  return (
    <aside className="hidden lg:flex flex-col themed-sidebar w-64 md:w-70 lg:w-[260px] h-screen sticky top-0 left-0 shrink-0 z-30 justify-between relative bg-[#F4EFE6] border-r border-[#D9C8A9] shadow-sm select-none">
      {/* Decorative Beveled Rail */}
      <div className="beveled-sidebar-rail" />

      {/* Top Branding Emblem Header */}
      <div className="p-5 border-b border-[#D9C8A9] relative z-10 space-y-2">
        <div className="flex items-center gap-3">
          {/* Astrolabe Compass Logo Emblem */}
          <div className="w-12 h-12 rounded-full bg-[#0B2B3C] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-md shrink-0 relative group">
            <Compass className="w-7 h-7 text-[#C5A059] animate-in zoom-in duration-300" />
            <div className="absolute inset-0 rounded-full border border-amber-300/30 animate-pulse" />
          </div>

          <div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#0C1D2D] leading-none">
              Play Atlas
            </h1>
            <span className="text-[10px] uppercase font-extrabold text-[#8C6D37] tracking-widest block mt-1">
              CARTOGRAPHIC HUB
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative z-10 scrollbar-thin">
        {/* Main Pinned Home Tab */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-2.5 ${
              isActive
                ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-md'
                : 'bg-[#FDFBF7] text-[#0C1D2D] hover:bg-[#EFE8D8] border border-[#D9C8A9]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <Home className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#8C6D37]'}`} />
                <span className="font-serif text-base tracking-wide font-bold">Home</span>
              </div>
              {isActive && <span className="text-[#C5A059] text-xs">✦</span>}
            </>
          )}
        </NavLink>

        {/* Discovery & Navigation Feeds */}
        <nav className="space-y-0.5 font-sans">
          {/* My Games Main Navigation */}
          <NavLink
            to="/my-games"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-sm'
                  : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3 truncate">
                  <Gamepad2 className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#8C6D37]'}`} />
                  <span>My Games</span>
                </div>
                {isActive && <span className="text-[#C5A059] text-xs">✦</span>}
              </>
            )}
          </NavLink>

          {/* Additional Nav & Custom Tabs */}
          {customTabs
            .filter(t => t.id !== 'home' && t.id !== 'my-games' && t.id !== 'settings')
            .map(item => (
              <div key={item.id} className="relative group flex items-center">
                <NavLink
                  to={item.path === '/deals' ? '/discounts' : item.path}
                  className={({ isActive }) =>
                    `flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-sm'
                        : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 truncate">
                        <span className="shrink-0">
                          {iconMap[item.iconName] || <Bookmark className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#8C6D37]'}`} />}
                        </span>
                        <span className="truncate">{item.id === 'deals' ? 'Discounts' : item.label}</span>
                      </div>

                      {item.badge ? (
                        <Badge variant={item.badgeColor || 'indigo'}>{item.badge}</Badge>
                      ) : isActive ? (
                        <span className="text-[#C5A059] text-xs">✦</span>
                      ) : null}
                    </>
                  )}
                </NavLink>

                {!isDefaultSystemTab(item.id) && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      deleteTab(item.id);
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#718294] hover:text-[#991B1B] hover:bg-rose-500/10 transition-all"
                    title="Delete Custom Tab"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
        </nav>
      </div>

      {/* Bottom Footer & Settings Area */}
      <div className="p-3.5 border-t border-[#D9C8A9] space-y-2.5 relative z-10 bg-[#F4EFE6]">
        {/* Custom Tab Creation Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[#C5A059] text-[#0C1D2D] hover:bg-[#EFE8D8] text-xs font-bold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Create Custom Tab / List</span>
        </button>

        {/* Route Line Dotted Trail Ornament */}
        <div className="py-0.5 opacity-40 flex justify-center text-[#8C6D37] text-xs tracking-widest select-none font-mono">
          - - ✕ - -
        </div>

        {/* Settings Navigation Link */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#0B2B3C] text-white border border-[#C5A059]'
                : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
            }`
          }
        >
          <Settings className="w-4 h-4 text-[#8C6D37]" />
          <span>Settings & Customization</span>
        </NavLink>

        {/* Real Personal Library Summary Counts (Bottom Footer Pill) */}
        <div className="p-2 rounded-xl bg-[#EFE8D8] border border-[#D9C8A9] text-[11px] font-mono font-semibold space-y-1">
          <div className="flex items-center justify-between text-[#0C1D2D]">
            <span className="flex items-center gap-1.5 text-[#47586A]">
              <Bookmark className="w-3 h-3 text-[#C5A059]" /> Wishlist
            </span>
            <span className="font-bold text-[#0B2B3C]">{libraryStats.wishlist}</span>
          </div>
          <div className="flex items-center justify-between text-[#0C1D2D]">
            <span className="flex items-center gap-1.5 text-[#47586A]">
              <Layers className="w-3 h-3 text-purple-700" /> Backlog
            </span>
            <span className="font-bold text-[#0B2B3C]">{libraryStats.backlog}</span>
          </div>
          <div className="flex items-center justify-between text-[#0C1D2D]">
            <span className="flex items-center gap-1.5 text-[#47586A]">
              <Trophy className="w-3 h-3 text-amber-700" /> Completed
            </span>
            <span className="font-bold text-[#0B2B3C]">{libraryStats.completed}</span>
          </div>
        </div>
      </div>

      <AddTabModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTab={addTab}
      />
    </aside>
  );
};
