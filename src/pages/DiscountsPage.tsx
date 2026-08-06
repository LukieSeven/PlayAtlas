import React from 'react';
import { ComingSoonPage } from '../components/common/ComingSoonPage';
import { Tag } from 'lucide-react';

export const DiscountsPage: React.FC = () => (
  <ComingSoonPage
    title="Discounts Coming Soon"
    description="Deal tracking, price history, and storefront comparisons will appear here when the IsThereAnyDeal integration is connected."
    icon={<Tag className="h-8 w-8" />}
  />
);

export default DiscountsPage;
