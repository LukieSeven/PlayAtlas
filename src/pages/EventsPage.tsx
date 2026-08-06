import React from 'react';
import { CalendarHeart } from 'lucide-react';
import { ComingSoonPage } from '../components/common/ComingSoonPage';

export const EventsPage: React.FC = () => (
  <ComingSoonPage
    title="Events Coming Soon"
    description="Upcoming showcases, conventions, announcements, and community events will be charted here once the events feed is connected."
    icon={<CalendarHeart className="h-8 w-8" />}
  />
);

export default EventsPage;
