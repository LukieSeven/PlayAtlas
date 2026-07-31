import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';

const tierRows = [
  { rank: 'S Tier', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', games: ['Elden Ring', 'Baldur’s Gate 3'] },
  { rank: 'A Tier', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', games: ['It Takes Two', 'Cyberpunk 2077'] },
  { rank: 'B Tier', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', games: ['Hades II', 'Helldivers 2'] },
  { rank: 'C Tier', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', games: ['Starfield'] },
];

export const TierListsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="TIER LIST MAKER"
        title="Custom Tier Lists"
        subtitle="Rank your favorite gaming franchises, characters, or releases across S, A, B, C, and D tiers."
        actions={
          <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
            New Tier List
          </Button>
        }
      />

      <div className="space-y-4">
        {tierRows.map((tier, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className={`w-24 shrink-0 p-4 rounded-xl text-center font-extrabold font-mono text-lg border ${tier.color}`}>
              {tier.rank}
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {tier.games.map((g, i) => (
                <div key={i} className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 font-semibold text-sm text-slate-200">
                  {g}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
