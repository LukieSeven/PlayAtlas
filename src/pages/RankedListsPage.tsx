import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { ShareListModal } from '../components/widgets/ShareListModal';

export const RankedListsPage: React.FC = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="RANKED LISTS"
        title="Custom Ranked Top 10 Lists"
        subtitle="Create, order, and share your personal Top 10 Game of the Year, All-Time Favorites, or genre rankings."
        actions={
          <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
            Create Ranked List
          </Button>
        }
      />

      <GameListGrid
        title="Top 10 Game of the Year (GOTY 2026)"
        description="Ranked in order from #1 to #10 with ratings, developer info, and public share links."
        badge="TOP 10 RANKED"
        onShareClick={() => setIsShareModalOpen(true)}
      />

      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listTitle="Top 10 Game of the Year (GOTY 2026)"
        shareUrl="https://playatlas.app/share/goty-2026-top-10"
      />
    </div>
  );
};
