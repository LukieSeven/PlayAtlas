import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { fetchNewReleases } from '../services/gameDbService';
import { GameItem } from '../types/game';

export const NewReleasesPage: React.FC = () => {
  const [newReleases, setNewReleases] = useState<GameItem[]>([]);

  useEffect(() => {
    fetchNewReleases().then(data => setNewReleases(data));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="NEW RELEASES"
        title="New & Recent Game Releases"
        subtitle="Explore newly released titles and recent game launches sorted by release date."
      />

      <GameListGrid
        title="Recent Game Launches (2024 - 2025)"
        description="Filter and search newly launched titles."
        badge="NEW RELEASES"
        games={newReleases}
      />
    </div>
  );
};
