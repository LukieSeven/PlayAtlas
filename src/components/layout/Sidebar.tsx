import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Rocket,
  Flame,
  CalendarDays,
  Tag,
  Plus,
  Trash2,
  Bookmark,
  Compass,
  Trophy,
  Layers,
  Gamepad2
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { Badge } from '../ui/Badge';
import { AddTabModal } from '../widgets/AddTabModal';

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5 text-indigo-400" />,
  Rocket: <Rocket className="w-4 h-4 text-cyan-400" />,
  Flame: <Flame className="w-4 h-4 text-amber-400" />,
  CalendarDays: <CalendarDays className="w-4 h-4 text-emerald-400" />,
  Tag: <Tag className="w-4 h-4 text-purple-400" />,
  Trophy: <Trophy className="w-4 h-4 text-amber-400" />,
  Gamepad2: <Gamepad2 className="w-4 h-4 text-cyan-400" />,
  Layers: <Layers className="w-4 h-4 text-rose-400" />,
  Bookmark: <Bookmark className="w-4 h-4 text-indigo-400" />,
};

export const Sidebar: React.FC = () => {
  const { customTabs, addTab, deleteTab } = useSidebar();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isDefaultSystemTab = (id: string) => {
    return ['home', 'new-releases', 'upcoming', 'calendar', 'deals'].includes(id);
  };

  return (
    <aside className="hidden lg:flex flex-col border-r border-slate-800/80 glass-panel w-64 md:w-72 h-screen sticky top-0 left-0 shrink-0 z-30 justify-between">
      {/* Top Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-wider text-white leading-none">
              PLAY<span className="text-indigo-400">ATLAS</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5">GAME DISCOVERY & LISTS</span>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* Pinned Homepage Tab - Distinct & Larger */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 mb-3 shadow-md ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-indigo-600/30 border border-indigo-400/50'
                : 'bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-indigo-300" />
            <span className="text-base tracking-wide">Homepage</span>
          </div>
          <Badge variant="indigo">PRIMARY</Badge>
        </NavLink>

        {/* Discovery Feeds */}
        <nav className="space-y-1">
          {customTabs
            .filter(t => t.id !== 'home')
            .map(item => (
              <div key={item.id} className="relative group flex items-center">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-800/90 text-white border border-indigo-500/30 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="shrink-0">{iconMap[item.iconName] || <Bookmark className="w-4 h-4" />}</span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && <Badge variant={item.badgeColor || 'indigo'}>{item.badge}</Badge>}
                </NavLink>

                {/* Delete Hover Button for Custom Secondary Tabs */}
                {!isDefaultSystemTab(item.id) && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      deleteTab(item.id);
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete Custom Tab"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
        </nav>
      </div>

      {/* Bottom Action Footer with Create Triggers */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-600/10 text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Tab / List</span>
        </button>

        <div className="text-[10px] text-slate-500 text-center font-mono pt-1">
          GitHub Sync • LukieSeven/PlayAtlas
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
