import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CalendarDays, Clock } from 'lucide-react';

const upcomingSchedule = [
  { month: 'Q1 2026', games: [{ title: 'Monster Hunter Wilds', date: 'Feb 28, 2025' }, { title: 'Civilization VII', date: 'Feb 11, 2025' }] },
  { month: 'Q2 2026', games: [{ title: 'Metroid Prime 4: Beyond', date: 'Spring 2026' }, { title: 'Doom: The Dark Ages', date: 'Mid 2026' }] },
  { month: 'Q4 2026', games: [{ title: 'Grand Theft Auto VI', date: 'Fall 2026' }] },
];

export const CalendarPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="GAMES CALENDAR"
        title="Release Calendar & Schedule"
        subtitle="Chronological release calendar for confirmed video game launches."
      />

      <div className="space-y-6">
        {upcomingSchedule.map((sec, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">{sec.month}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sec.games.map((g, i) => (
                <Card key={i} glass className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">{g.title}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {g.date}
                    </p>
                  </div>
                  <Badge variant="cyan">CONFIRMED</Badge>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
