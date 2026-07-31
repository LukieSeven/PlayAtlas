import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { GameListGrid } from '../components/widgets/GameListGrid';

export const NewReleasesPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="NEW RELEASES"
        title="New & Recent Game Releases"
        subtitle="Explore the latest game launches, expansion releases, and trending titles fetched live from GameDB."
      />

      <GameListGrid
        title="Recent & Trending Launches"
        description="Search, filter, and sort all newly released games."
        badge="LIVE GAMEDB FEED"
      />
    </div>
  );
};
