import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { CountdownCard } from '../components/widgets/CountdownCard';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { Flame } from 'lucide-react';

export const UpcomingGamesPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="UPCOMING GAMES"
        title="Major Upcoming Release Spotlights"
        subtitle="Track anticipated future game launches, countdown timers, and release schedules."
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h2 className="text-xl font-bold text-white">Featured Release Spotlight</h2>
        </div>
        <CountdownCard />
      </section>

      <GameListGrid
        title="Anticipated Releases Grid"
        description="Filter upcoming game announcements by genre, developer, and release year."
        badge="UPCOMING SPOTLIGHT"
      />
    </div>
  );
};
