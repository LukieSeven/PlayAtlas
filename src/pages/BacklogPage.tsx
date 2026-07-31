import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Play, CheckCircle2, Clock, Plus } from 'lucide-react';

const backlogCategories = [
  { label: 'Currently Playing', count: 3, color: 'emerald', icon: <Play className="w-4 h-4 text-emerald-400" /> },
  { label: 'Up Next (Backlog)', count: 12, color: 'cyan', icon: <Clock className="w-4 h-4 text-cyan-400" /> },
  { label: 'Completed (100%)', count: 28, color: 'indigo', icon: <CheckCircle2 className="w-4 h-4 text-indigo-400" /> },
];

export const BacklogPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="BACKLOG TRACKER"
        title="Game Backlog & Progress"
        subtitle="Keep track of what you are currently playing, games on deck, and your completed library."
        actions={
          <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
            Add Game to Backlog
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {backlogCategories.map((cat, i) => (
          <Card key={i} glass className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cat.icon}
                <span className="font-bold text-white text-base">{cat.label}</span>
              </div>
              <Badge variant={cat.color as any}>{cat.count}</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Organize your play queue and record your completion time and review notes.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
