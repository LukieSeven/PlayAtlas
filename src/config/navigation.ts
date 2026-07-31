import { NavSection } from '../types/navigation';

export const navigationConfig: NavSection[] = [
  {
    title: 'Discover & Organize',
    items: [
      {
        id: 'home',
        label: 'Home Dashboard',
        path: '/',
        iconName: 'LayoutDashboard',
      },
      {
        id: 'ranked-lists',
        label: 'Ranked Lists',
        path: '/lists',
        iconName: 'Trophy',
        badge: 'TOP 10',
        badgeColor: 'amber',
      },
      {
        id: 'tier-lists',
        label: 'Tier Lists',
        path: '/tier-lists',
        iconName: 'Layers',
        badge: 'S-TIER',
        badgeColor: 'indigo',
      },
      {
        id: 'collections',
        label: 'Custom Collections',
        path: '/collections',
        iconName: 'Bookmark',
      },
      {
        id: 'backlog',
        label: 'Game Backlog',
        path: '/backlog',
        iconName: 'Gamepad2',
        badge: 12,
        badgeColor: 'cyan',
      },
    ],
  },
  {
    title: 'Sharing & Social',
    items: [
      {
        id: 'shared-lists',
        label: 'Shared Links',
        path: '/share/goty-2026',
        iconName: 'Share2',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings & Theme',
        path: '/settings',
        iconName: 'Settings',
      },
    ],
  },
];
