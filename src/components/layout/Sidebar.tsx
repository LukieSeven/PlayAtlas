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
    <aside className="hidden lg:flex flex-col themed-sidebar w-64 md:w-72 h-screen sticky top-0 left-0 shrink-0 z-30 justify-between relative bg-[#F4EFE6] border-r border-[#D9C8A9]">
      {/* Play-Arrow Inspired Beveled Layered Sidebar Edge Rail (14px wide) */}
      <div className="beveled-sidebar-rail" />

      {/* Official Brand Logo Header */}
      <div className="p-5 border-b border-[#D9C8A9]/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0B2B3C] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-md font-serif font-bold text-lg select-none shrink-0">
            ✦
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wide text-[#0C1D2D] leading-none">
              Play Atlas
            </h1>
            <span className="text-[10px] uppercase font-semibold text-[#8C6D37] tracking-widest block mt-0.5">
              Cartographic Hub
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation List */}
      <div className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto relative z-10">
        {/* Pinned Homepage Tab - Distinct & Larger */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-3 shadow-sm ${
              isActive
                ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-md'
                : 'bg-[#FDFBF7] text-[#0C1D2D] hover:bg-[#EFE8D8] border border-[#D9C8A9]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-[#C5A059]" />
            <span className="font-serif text-base tracking-wide">Homepage</span>
          </div>
          <Badge variant="amber">PRIMARY</Badge>
        </NavLink>

        {/* Discovery Feeds */}
        <nav className="space-y-1 font-sans text-sm font-medium">
          {customTabs
            .filter(t => t.id !== 'home' && t.id !== 'settings')
            .map(item => (
              <div key={item.id} className="relative group flex items-center">
                <NavLink
                  to={item.path === '/deals' ? '/discounts' : item.path}
                  className={({ isActive }) =>
                    `flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-md'
                        : 'text-[#213547] hover:text-[#0B2B3C] hover:bg-[#EFE8D8]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="shrink-0">{iconMap[item.iconName] || <Bookmark className="w-4 h-4 text-[#8C6D37]" />}</span>
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

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-[#D9C8A9]/60 space-y-3 relative z-10 bg-[#F4EFE6]">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-[#D9C8A9] text-[#213547] hover:text-[#0B2B3C] hover:border-[#C5A059] hover:bg-[#EFE8D8] text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Create Custom Tab / List</span>
        </button>

        {/* Map Route Dotted Line Illustration */}
        <div className="py-0.5 opacity-50 flex justify-center text-[#8C6D37] text-xs tracking-widest select-none">
          - - - ✕ - - -
        </div>

        {/* Permanent Settings Navigation Item */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#0B2B3C] text-white border border-[#C5A059]'
                : 'text-[#213547] hover:text-[#0B2B3C] hover:bg-[#EFE8D8]'
            }`
          }
        >
          <Settings className="w-4 h-4 text-[#8C6D37]" />
          <span>Settings & Customization</span>
        </NavLink>

        <div className="text-[10px] text-[#47586A] text-center font-sans pt-1">
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
