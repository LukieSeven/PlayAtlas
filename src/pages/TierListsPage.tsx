import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { UnavailableIntegrationNotice } from '../components/common/UnavailableIntegrationNotice';
import { Layers } from 'lucide-react';

export const TierListsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="TIER LISTS"
        title="Interactive Tier List Maker"
        subtitle="Rank games from S-Tier to F-Tier using full catalog search and drag-and-drop ordering."
      />

      <div className="py-8">
        <UnavailableIntegrationNotice
          title="No Tier Lists Created Yet"
          description="You have not created any tier lists yet. The interactive tier-list canvas and image export tool will be implemented in a future update."
          icon={<Layers className="w-6 h-6 text-rose-400" />}
          futureRequirement="Interactive Tier List Canvas Engine"
        />
      </div>
    </div>
  );
};

export default TierListsPage;
