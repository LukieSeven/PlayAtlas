import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { ShareListModal } from '../components/widgets/ShareListModal';
import { Button } from '../components/ui/Button';
import { Share2, Globe } from 'lucide-react';

export const SharedListPage: React.FC = () => {
  const { listId } = useParams<{ listId?: string }>();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="glass-panel p-4 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-indigo-300">
          <Globe className="w-4 h-4" />
          <span>Public Presentation View • Cached via GitHub (<span className="font-mono">LukieSeven/PlayAtlas</span>)</span>
        </div>
        <Button variant="glow" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} onClick={() => setIsShareModalOpen(true)}>
          Share Link
        </Button>
      </div>

      <PageHeader
        badge="PUBLIC SHARED LIST"
        title="Top 10 Game of the Year (2026)"
        subtitle="Shared by @LukieSeven. Built and ranked using Play Atlas custom list generator."
      />

      <GameListGrid
        title="Ranked Showcase"
        description="Public presentation view with interactive sortable controls."
        onShareClick={() => setIsShareModalOpen(true)}
      />

      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        listTitle="Top 10 Game of the Year (2026)"
        shareUrl={`https://playatlas.app/share/${listId || 'goty-2026'}`}
      />
    </div>
  );
};
