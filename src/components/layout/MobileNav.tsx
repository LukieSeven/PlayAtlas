import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, Trophy, Layers, Bookmark, Gamepad2, Share2, Settings, CalendarDays, Tag } from 'lucide-react';
import { navigationConfig } from '../../config/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { getBasePathAwareUrl } from '../../services/catalogDataSource';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5 text-amber-400" />,
  Trophy: <Trophy className="w-5 h-5 text-amber-400" />,
  Layers: <Layers className="w-5 h-5 text-rose-400" />,
  Bookmark: <Bookmark className="w-5 h-5 text-indigo-400" />,
  Gamepad2: <Gamepad2 className="w-5 h-5 text-cyan-400" />,
  Share2: <Share2 className="w-5 h-5 text-emerald-400" />,
  Settings: <Settings className="w-5 h-5 text-slate-300" />,
  CalendarDays: <CalendarDays className="w-5 h-5 text-amber-400" />,
  Tag: <Tag className="w-5 h-5 text-amber-400" />,
};

export const MobileNav: React.FC = () => {
  const { isMobileOpen, setMobileOpen } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-[#0C1D2D]/60 backdrop-blur-xs transition-opacity"
        onClick={() => setMobileOpen(false)}
      />

      {/* Drawer Content */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-[#F4EFE6] border-r border-[#D9C8A9] p-6 flex flex-col justify-between z-50 shadow-2xl overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D9C8A9]/60 pb-4">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={getBasePathAwareUrl('branding/play-atlas-compass-watercolor.png')}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-[#C5A059] object-cover"
              />
              <div className="atlas-wordmark-crop atlas-wordmark-crop--compact" role="img" aria-label="Play Atlas" />
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-[#718294] hover:text-[#0C1D2D]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6">
            {navigationConfig.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-xs font-bold text-[#8C6D37] uppercase tracking-wider font-sans">
                  {section.title}
                </h4>
                <div className="space-y-1 font-sans">
                  {section.items.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#0B2B3C] text-white font-semibold shadow-xs'
                            : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        {iconMap[item.iconName]}
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {/* Permanent Settings Access in Mobile Drawer */}
            <div className="pt-2 border-t border-[#D9C8A9]/60">
              <NavLink
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-[#0B2B3C] text-white font-semibold'
                      : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                  }`
                }
              >
                <Settings className="w-5 h-5 text-[#8C6D37]" />
                <span>Settings & Customization</span>
              </NavLink>
            </div>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#D9C8A9]/60 text-xs text-[#47586A] text-center font-sans">
          Play Atlas © 2026 • GitHub Repository Sync
        </div>
      </div>
    </div>
  );
};
