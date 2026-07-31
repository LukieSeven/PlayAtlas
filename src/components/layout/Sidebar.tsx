import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Layers,
  Bookmark,
  Gamepad2,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { navigationConfig } from '../../config/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { Badge } from '../ui/Badge';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Trophy: <Trophy className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Bookmark: <Bookmark className="w-4 h-4" />,
  Gamepad2: <Gamepad2 className="w-4 h-4" />,
  Share2: <Share2 className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
};

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-slate-800/80 glass-panel transition-all duration-300 relative z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-6 z-40 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        aria-label="Toggle sidebar collapse"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        {navigationConfig.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            {!isCollapsed && (
              <h4 className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {section.title}
              </h4>
            )}

            <nav className="space-y-1">
              {section.items.map(item => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 group-hover:scale-110 transition-transform">
                      {iconMap[item.iconName]}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <Badge variant={item.badgeColor || 'indigo'}>{item.badge}</Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Info Box in Sidebar */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-indigo-300">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>GitHub Sync Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Lists cache locally and sync directly via GitHub repository.
          </p>
        </div>
      )}
    </aside>
  );
};
