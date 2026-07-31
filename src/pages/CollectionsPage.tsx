import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Plus, Heart, Users, Sparkles } from 'lucide-react';

const collections = [
  { title: 'Couch Co-Op Gems', count: 8, icon: <Users className="w-5 h-5 text-indigo-400" />, badge: 'Co-Op' },
  { title: 'Must-Play RPG Masterpieces', count: 14, icon: <Sparkles className="w-5 h-5 text-amber-400" />, badge: 'RPG' },
  { title: 'Relaxing Weekend Games', count: 6, icon: <Heart className="w-5 h-5 text-rose-400" />, badge: 'Casual' },
];

export const CollectionsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="COLLECTIONS"
        title="Curated Game Collections"
        subtitle="Organize games by theme, multiplayer mood, platform, or personal recommendation playlists."
        actions={
          <Button variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
            New Collection
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((c, i) => (
          <Card key={i} interactive glass className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">{c.icon}</div>
              <Badge variant="indigo">{c.badge}</Badge>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{c.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{c.count} Games saved in collection</p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Collection
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
