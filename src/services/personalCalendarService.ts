import { PersonalCalendarItem } from '../types/personalCalendar';

const STORAGE_KEY = 'playatlas_personal_calendar_v1';

export function loadPersonalCalendarItems(): PersonalCalendarItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string' && typeof item.date === 'string' && typeof item.title === 'string') : [];
  } catch (error) {
    console.warn('Unable to load personal calendar:', error);
    return [];
  }
}

export function savePersonalCalendarItems(items: PersonalCalendarItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addPersonalCalendarItem(items: PersonalCalendarItem[], item: Omit<PersonalCalendarItem, 'id'>): PersonalCalendarItem[] {
  if (item.sourceId && items.some(existing => existing.sourceId === item.sourceId && existing.date === item.date && existing.kind === item.kind)) return items;
  return [...items, { ...item, id: `calendar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }];
}

export function addLikedGameToCalendar(
  items: PersonalCalendarItem[],
  game: { sourceId: number; title: string; releaseDate: string },
): PersonalCalendarItem[] {
  return addPersonalCalendarItem(items, {
    date: game.releaseDate,
    title: game.title,
    kind: 'game',
    sourceId: game.sourceId,
  });
}

export function removePersonalCalendarItem(items: PersonalCalendarItem[], id: string): PersonalCalendarItem[] {
  return items.filter(item => item.id !== id);
}
