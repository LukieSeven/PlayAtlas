import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Compass, LayoutDashboard, Trophy, Layers, Bookmark, Gamepad2, Share2, Settings } from 'lucide-react';
import { navigationConfig } from '../../config/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { Badge } from '../ui/Badge';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Bookmark: <Bookmark className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  Share2: <Share2 className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
};

export const MobileNav: React.FC = () => {
  const { isMobileOpen, setMobileOpen } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => setMobileOpen(false)}
      />

      {/* Drawer Content */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs glass-panel border-r border-slate-800 p-6 flex flex-col justify-between z-50 animate-in slide-in-from-left duration-300">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white">PLAYATLAS</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6">
            {navigationConfig.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        {iconMap[item.iconName]}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && <Badge variant={item.badgeColor || 'indigo'}>{item.badge}</Badge>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Play Atlas © 2026 • GitHub Repository Sync
        </div>
      </div>
    </div>
  );
};
