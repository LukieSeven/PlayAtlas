export interface NavItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  badge?: string | number;
  badgeColor?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  isExternal?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
