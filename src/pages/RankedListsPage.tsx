import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { UnavailableIntegrationNotice } from '../components/common/UnavailableIntegrationNotice';
import { ListOrdered } from 'lucide-react';

export const RankedListsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="RANKED LISTS"
        title="Custom Ranked Game Lists"
        subtitle="Create, rank, and curate custom video game lists and top 10 rankings."
      />

      <div className="py-8">
        <UnavailableIntegrationNotice
          title="No Custom Lists Created Yet"
          description="You have not created any custom ranked lists yet. The interactive list editor and curation canvas will be implemented in a future update."
          icon={<ListOrdered className="w-6 h-6 text-amber-400" />}
          futureRequirement="Interactive Custom List Engine"
        />
      </div>
    </div>
  );
};

export default RankedListsPage;
