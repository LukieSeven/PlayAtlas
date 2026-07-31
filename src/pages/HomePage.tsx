import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { CountdownCard } from '../components/widgets/CountdownCard';
import { CustomizableDashboard } from '../components/widgets/CustomizableDashboard';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { ShareListModal } from '../components/widgets/ShareListModal';
import { Button } from '../components/ui/Button';
import { Plus, Share2, Flame } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Hero Header */}
      <PageHeader
        badge="CUSTOMIZABLE DASHBOARD"
        title="Welcome to Play Atlas"
        subtitle="Your central hub to discover games, track release countdowns, build custom ranked top 10 lists, and share collections."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => setIsShareModalOpen(true)}
            >
              Share Dashboard
            </Button>
            <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
              Create New List
            </Button>
          </>
        }
      />

      {/* Widget Customizer Bar */}
      <CustomizableDashboard />

      {/* Featured Upcoming Game Spotlight with Live Release Countdown */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-xl font-bold text-white">Upcoming Release Spotlight</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Timer Active</span>
        </div>
        <CountdownCard />
      </section>

      {/* Main Sortable & Customizable Game List */}
      <section className="pt-4">
        <GameListGrid
          title="Games My Wife & I Enjoy (Co-Op GOTY)"
          description="A customizable, sortable top list of our favorite couch and online co-op games."
          badge="CURATED LIST"
          onShareClick={() => setIsShareModalOpen(true)}
        />
      </section>

      {/* Public Share Modal */}
      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listTitle="Games My Wife & I Enjoy (Co-Op GOTY)"
        shareUrl="https://playatlas.app/share/wife-and-i-coop-goty"
      />
    </div>
  );
};
