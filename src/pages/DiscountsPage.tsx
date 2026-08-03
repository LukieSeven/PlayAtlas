import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { UnavailableIntegrationNotice } from '../components/common/UnavailableIntegrationNotice';
import { Tag } from 'lucide-react';

export const DiscountsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="DISCOUNTS & PRICING"
        title="Game Discounts & Sales Tracker"
        subtitle="Track active game discounts, price cuts, and free promotional events across PC and console storefronts."
      />

      <div className="py-8">
        <UnavailableIntegrationNotice
          title="External Discounts & Pricing Integration Currently Unavailable"
          description="Play Atlas does not yet have a connected pricing provider. Current discounts, historical prices, and store comparisons will appear here after a reliable external pricing integration is added."
          icon={<Tag className="w-6 h-6 text-purple-400" />}
          futureRequirement="External Pricing API Provider Integration"
        />
      </div>
    </div>
  );
};

export default DiscountsPage;
