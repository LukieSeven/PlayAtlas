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
        badge: 'MAIN',
        badgeColor: 'indigo',
      },
    ],
  },
  {
    title: 'Discovery & Feeds',
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
    ],
  },
  {
    title: 'Personal & Lists',
    items: [
      {
        id: 'wife-coop',
        label: 'Games My Wife & I Enjoy',
        path: '/lists',
        iconName: 'Heart',
        badge: 'CO-OP',
        badgeColor: 'rose',
      },
      {
        id: 'goty-2026',
        label: 'Top 10 GOTY 2026',
        path: '/lists',
        iconName: 'Trophy',
        badge: 'TOP 10',
        badgeColor: 'amber',
      },
      {
        id: 'backlog',
        label: 'Backlog & Playing',
        path: '/backlog',
        iconName: 'Gamepad2',
        badge: 12,
        badgeColor: 'cyan',
      },
      {
        id: 'tier-studio',
        label: 'Tier List Studio',
        path: '/tier-lists',
        iconName: 'Layers',
      },
      {
        id: 'deals',
        label: 'Deals & Discounts',
        path: '/deals',
        iconName: 'Tag',
      },
    ],
  },
];
