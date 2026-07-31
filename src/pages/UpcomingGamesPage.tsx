import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { CountdownCard } from '../components/widgets/CountdownCard';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { fetchUpcomingGames } from '../services/gameDbService';
import { GameItem } from '../types/game';
import { Flame } from 'lucide-react';

export const UpcomingGamesPage: React.FC = () => {
  const [upcomingGames, setUpcomingGames] = useState<GameItem[]>([]);

  useEffect(() => {
    fetchUpcomingGames().then(data => setUpcomingGames(data));
  }, []);

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
        title="Anticipated Future Releases"
        description="Filter upcoming game announcements by genre, developer, and release year."
        badge="UPCOMING SPOTLIGHT"
        games={upcomingGames}
      />
    </div>
  );
};
