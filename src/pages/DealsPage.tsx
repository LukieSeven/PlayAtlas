import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ExternalLink } from 'lucide-react';

const activeDeals = [
  { title: 'Cyberpunk 2077: Phantom Liberty', discount: '50% OFF', price: '$14.99', store: 'Steam Store' },
  { title: 'Elden Ring', discount: '33% OFF', price: '$39.99', store: 'PlayStation Store' },
  { title: 'It Takes Two', discount: '65% OFF', price: '$13.99', store: 'Xbox Store' },
  { title: 'Baldur’s Gate 3', discount: '20% OFF', price: '$47.99', store: 'GOG.com' },
];

export const DealsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="DEALS & DISCOUNTS"
        title="Video Game Deals & Sale Tracker"
        subtitle="Track active game discounts, price cuts, and free weekend promotions across Steam, PlayStation, Xbox, and GOG."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeDeals.map((d, i) => (
          <Card key={i} glass className="p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="rose">{d.discount}</Badge>
                <h3 className="text-lg font-bold text-white mt-2">{d.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{d.store}</p>
              </div>
              <span className="text-xl font-extrabold font-mono text-emerald-400">{d.price}</span>
            </div>

            <Button variant="glow" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              View Store Deal
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
