import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { UnavailableIntegrationNotice } from '../components/common/UnavailableIntegrationNotice';
import { Clock } from 'lucide-react';

export const BacklogPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="BACKLOG TRACKER"
        title="Game Backlog & Progress"
        subtitle="Keep track of what you are currently playing, games on deck, and your completed library."
      />

      <div className="py-8">
        <UnavailableIntegrationNotice
          title="No Backlog Games Tracked Yet"
          description="Your personal backlog, current play status, and completion records will populate here once the central My Games personal catalog system is active."
          icon={<Clock className="w-6 h-6 text-cyan-400" />}
          futureRequirement="My Games Personal Catalog System (Phase 5)"
        />
      </div>
    </div>
  );
};

export default BacklogPage;
