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
  Trophy,
  Layers,
  Gamepad2,
  Settings
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { Badge } from '../ui/Badge';
import { AddTabModal } from '../widgets/AddTabModal';

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5 text-amber-400" />,
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
    return ['home', 'my-games', 'new-releases', 'upcoming', 'calendar', 'discounts', 'deals', 'settings'].includes(id);
  };

  return (
    <aside className="hidden lg:flex flex-col themed-sidebar w-64 md:w-72 h-screen sticky top-0 left-0 shrink-0 z-30 justify-between relative">
      {/* Play-Arrow Inspired Beveled Layered Sidebar Edge Rail (14px wide) */}
      <div className="beveled-sidebar-rail" />

      {/* Official Brand Logo Header */}
      <div className="p-4 border-b border-[var(--panel-border)] bg-[rgba(0,0,0,0.15)] relative z-10">
        <div className="w-full flex items-center justify-center">
          <img
            src="./branding/play-atlas-watercolor-logo.jpg"
            alt="Play Atlas - Personalized Gaming Hub"
            className="w-full max-h-16 object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* Sidebar Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto relative z-10">
        {/* Pinned Homepage Tab - Distinct & Larger */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-200 mb-3 shadow-md ${
              isActive
                ? 'themed-active-nav shadow-lg'
                : 'bg-[rgba(255,255,255,0.05)] text-[var(--sidebar-text)] hover:bg-[rgba(255,255,255,0.1)] border border-[var(--panel-border)]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-amber-400" />
            <span className="text-base tracking-wide serif-heading">Homepage</span>
          </div>
          <Badge variant="amber">PRIMARY</Badge>
        </NavLink>

        {/* Discovery Feeds */}
        <nav className="space-y-1">
          {customTabs
            .filter(t => t.id !== 'home' && t.id !== 'settings')
            .map(item => (
              <div key={item.id} className="relative group flex items-center">
                <NavLink
                  to={item.path === '/deals' ? '/discounts' : item.path}
                  className={({ isActive }) =>
                    `flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-[rgba(255,255,255,0.15)] text-white border border-[var(--accent-color)] shadow-md'
                        : 'text-[var(--sidebar-muted-text)] hover:text-[var(--sidebar-text)] hover:bg-[rgba(255,255,255,0.08)]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="shrink-0">{iconMap[item.iconName] || <Bookmark className="w-4 h-4" />}</span>
                    <span className="truncate">{item.id === 'deals' ? 'Discounts' : item.label}</span>
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

      {/* Bottom Action Footer */}
      <div className="p-3 border-t border-[var(--panel-border)] space-y-2 bg-[rgba(0,0,0,0.1)] relative z-10">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[var(--panel-border)] text-[var(--sidebar-muted-text)] hover:text-white hover:border-[var(--accent-color)] hover:bg-[rgba(255,255,255,0.08)] text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Create Custom Tab / List</span>
        </button>

        {/* Permanent Settings Navigation Item */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-[rgba(255,255,255,0.2)] text-white border border-[var(--accent-color)]'
                : 'text-[var(--sidebar-muted-text)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]'
            }`
          }
        >
          <Settings className="w-4 h-4 text-slate-300" />
          <span>Settings & Customization</span>
        </NavLink>

        <div className="text-[9px] text-[var(--sidebar-muted-text)] text-center font-mono pt-1">
          Play Atlas • Personal Gaming Hub
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
