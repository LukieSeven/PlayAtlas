import { NavSection } from '../types/navigation';

export const navigationConfig: NavSection[] = [
  {
    title: 'Primary',
    items: [
      {
        id: 'home',
        label: 'Homepage',
        path: '/',
        iconName: 'Home',
        badge: 'PRIMARY',
        badgeColor: 'indigo',
      },
    ],
  },
  {
    title: 'Personal Library',
    items: [
      {
        id: 'my-games',
        label: 'My Games',
        path: '/my-games',
        iconName: 'Gamepad2',
        badge: 'LIBRARY',
        badgeColor: 'indigo',
      },
    ],
  },
  {
    title: 'Discovery Feeds',
    items: [
      {
        id: 'new-releases',
        label: 'New Releases',
        path: '/new-releases',
        iconName: 'Rocket',
        badge: 'NEW',
        badgeColor: 'cyan',
      },
      {
        id: 'upcoming',
        label: 'Major Upcoming Games',
        path: '/upcoming',
        iconName: 'Flame',
        badge: 'SPOTLIGHT',
        badgeColor: 'amber',
      },
      {
        id: 'calendar',
        label: 'Games Calendar',
        path: '/calendar',
        iconName: 'CalendarDays',
      },
      {
        id: 'discounts',
        label: 'Discounts',
        path: '/discounts',
        iconName: 'Tag',
      },
    ],
  },
];
