import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { CountdownCard } from '../components/widgets/CountdownCard';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { ShareListModal } from '../components/widgets/ShareListModal';
import { AddWidgetModal } from '../components/widgets/AddWidgetModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Share2, Flame, Gamepad2 } from 'lucide-react';

interface ActiveWidget {
  id: string;
  type: string;
  title: string;
}

const defaultDashboardWidgets: ActiveWidget[] = [
  { id: 'w-countdown', type: 'spotlight_countdown', title: 'Upcoming Release Countdown Spotlight' },
  { id: 'w-goty', type: 'top_ten_list', title: 'Top 10 Game of the Year (GOTY 2026)' },
  { id: 'w-backlog', type: 'backlog_tracker', title: 'Backlog & Playing Tracker' },
];

export const HomePage: React.FC = () => {
  const [widgets, setWidgets] = useState<ActiveWidget[]>(defaultDashboardWidgets);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);

  const handleAddWidget = (type: string, title: string) => {
    const newWidget: ActiveWidget = {
      id: `w-${Date.now()}`,
      type,
      title,
    };
    setWidgets(prev => [...prev, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Hero Header */}
      <PageHeader
        badge="DISCORD LAYOUT CANVAS"
        title="Welcome to Play Atlas"
        subtitle="Your customizable gaming dashboard. Discover games, track release countdowns, organize lists, and share collections."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => setIsShareModalOpen(true)}
            >
              Share Canvas
            </Button>
            <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddWidgetModalOpen(true)}>
              Add Widget
            </Button>
          </>
        }
      />

      {/* Rendered Widget Cards Canvas Grid */}
      <div className="space-y-8">
        {widgets.map(w => {
          if (w.type === 'spotlight_countdown') {
            return (
              <section key={w.id} className="space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <h2 className="text-xl font-bold text-white">{w.title}</h2>
                  </div>
                  <button
                    onClick={() => removeWidget(w.id)}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove Widget
                  </button>
                </div>
                <CountdownCard />
              </section>
            );
          }

          if (w.type === 'top_ten_list' || w.type === 'custom_list') {
            return (
              <section key={w.id} className="pt-2 relative group">
                <div className="flex items-center justify-end mb-2">
                  <button
                    onClick={() => removeWidget(w.id)}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove Widget
                  </button>
                </div>
                <GameListGrid
                  title={w.title}
                  description="Sortable & filterable custom list presentation."
                  badge={w.type === 'top_ten_list' ? 'TOP 10 RANKED' : 'CURATED LIST'}
                  onShareClick={() => setIsShareModalOpen(true)}
                />
              </section>
            );
          }

          if (w.type === 'backlog_tracker') {
            return (
              <section key={w.id} className="relative group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">{w.title}</h2>
                  </div>
                  <button
                    onClick={() => removeWidget(w.id)}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Remove Widget
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card glass className="p-4 space-y-2">
                    <Badge variant="emerald">CURRENTLY PLAYING</Badge>
                    <h4 className="font-bold text-white">Elden Ring: Shadow of the Erdtree</h4>
                    <p className="text-xs text-slate-400">45 Hours Played • FromSoftware</p>
                  </Card>
                  <Card glass className="p-4 space-y-2">
                    <Badge variant="cyan">UP NEXT</Badge>
                    <h4 className="font-bold text-white">Baldur’s Gate 3</h4>
                    <p className="text-xs text-slate-400">Backlog Queue • Larian Studios</p>
                  </Card>
                  <Card glass className="p-4 space-y-2">
                    <Badge variant="indigo">COMPLETED (100%)</Badge>
                    <h4 className="font-bold text-white">It Takes Two</h4>
                    <p className="text-xs text-slate-400">Co-Op Campaign Finished • Hazelight</p>
                  </Card>
                </div>
              </section>
            );
          }

          return (
            <Card key={w.id} glass className="p-6 relative group flex items-center justify-between">
              <div>
                <Badge variant="purple">{w.type.toUpperCase()}</Badge>
                <h3 className="text-lg font-bold text-white mt-2">{w.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Modular widget placeholder ready for data feed.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeWidget(w.id)}>
                Remove
              </Button>
            </Card>
          );
        })}

        {/* "+ Add Widget Placeholder Slot" Card */}
        <div
          onClick={() => setIsAddWidgetModalOpen(true)}
          className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 hover:bg-indigo-600/5 group flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
              + Add Widget Slot
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
              Click to add a countdown timer, top 10 list, backlog tracker, or games on sale widget.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listTitle="Play Atlas Dashboard Canvas"
        shareUrl="https://playatlas.app/share/dashboard-canvas"
      />

      <AddWidgetModal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        onSelectWidget={handleAddWidget}
      />
    </div>
  );
};
