export type PersonalCalendarItemKind = 'game' | 'event' | 'custom';

export interface PersonalCalendarItem {
  id: string;
  date: string;
  title: string;
  kind: PersonalCalendarItemKind;
  sourceId?: number;
  notes?: string;
}
