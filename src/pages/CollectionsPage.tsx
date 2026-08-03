import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { UnavailableIntegrationNotice } from '../components/common/UnavailableIntegrationNotice';
import { Sparkles } from 'lucide-react';

export const CollectionsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="COLLECTIONS"
        title="Curated Game Collections"
        subtitle="Organize games by theme, multiplayer mood, platform, or personal recommendation playlists."
      />

      <div className="py-8">
        <UnavailableIntegrationNotice
          title="No Collections Created Yet"
          description="You have not created any game collections yet. Smart collections and personal game playlists will populate here once the list and collection engine is active."
          icon={<Sparkles className="w-6 h-6 text-indigo-400" />}
          futureRequirement="Smart Collections & Curation Engine"
        />
      </div>
    </div>
  );
};

export default CollectionsPage;
