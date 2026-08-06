import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Filter, Plus, Trash2, X } from 'lucide-react';
import { GameCard } from '../components/common/GameCard';
import { GameDetailModal } from '../components/widgets/GameDetailModal';
import { usePersonalGameLibrary } from '../hooks/usePersonalGameLibrary';
import {
  convertReleaseRecordToCompactRecord,
  getExactCalendarReleaseDates,
  getReleaseRecordsForMonth,
  ReleaseListingRecord,
} from '../services/releaseCatalogService';
import {
  addPersonalCalendarItem,
  addLikedGameToCalendar,
  loadPersonalCalendarItems,
  removePersonalCalendarItem,
  savePersonalCalendarItems,
} from '../services/personalCalendarService';
import { CompactGameLookupRecord } from '../types/catalog';
import { PersonalCalendarItem } from '../types/personalCalendar';
import { calculateCatalogImportance } from '../utils/catalogRanking';
import { getYuckedNumericIds } from '../utils/personalGameVisibility';

type CalendarMode = 'games' | 'events' | 'personal';
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2024, month, 1)),
);
const formatYMD = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

interface GameReleaseItemProps {
  record: ReleaseListingRecord;
  date: string;
  viewType: 'first_release' | 'platform_release';
  onExpand: (record: ReleaseListingRecord, date: string) => void;
}

const GameReleaseItem: React.FC<GameReleaseItemProps> = ({ record, date, viewType, onExpand }) => (
  <button type="button" onClick={() => onExpand(record, date)} className="block w-full rounded-lg border border-[#D9C8A9] bg-[#FDFBF7] p-1.5 text-left transition hover:border-[#B89228] hover:bg-white hover:shadow-sm" aria-label={`Expand ${record.name}`}>
    <span className="line-clamp-2 text-[10px] font-bold text-[#0C1D2D]">{record.name}</span>
    <span className="mt-0.5 block truncate text-[9px] text-[#718294]">
      {viewType === 'platform_release' ? 'Platform release · ' : ''}
      {record.platforms.slice(0, 2).map(platform => platform.abbreviation || platform.name).join(', ') || record.gameTypeLabel}
    </span>
  </button>
);

export const CalendarPage: React.FC = () => {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [mode, setMode] = useState<CalendarMode>('games');
  const [releases, setReleases] = useState<ReleaseListingRecord[]>([]);
  const [personalItems, setPersonalItems] = useState<PersonalCalendarItem[]>(loadPersonalCalendarItems);
  const [selectedGame, setSelectedGame] = useState<CompactGameLookupRecord | null>(null);
  const [expandedGame, setExpandedGame] = useState<{ record: ReleaseListingRecord; date: string } | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewType, setViewType] = useState<'first_release' | 'platform_release'>('first_release');
  const [platform, setPlatform] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [minimumRating, setMinimumRating] = useState(0);
  const [maximumGames, setMaximumGames] = useState(30);
  const [customDate, setCustomDate] = useState(() => formatYMD(today.getFullYear(), today.getMonth(), today.getDate()));
  const [customTitle, setCustomTitle] = useState('');
  const personalGameRecords = usePersonalGameLibrary();
  const yuckedIds = useMemo(() => getYuckedNumericIds(personalGameRecords), [personalGameRecords]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const calendarMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    getReleaseRecordsForMonth(year, month + 1, { viewType })
      .then(records => { if (active) setReleases(records); })
      .catch(value => {
        if (!active) return;
        setReleases([]);
        setError(value instanceof Error ? value.message : 'Calendar releases could not be loaded.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [year, month, viewType]);

  const filteredReleases = useMemo(() => releases
    .filter(record => {
      if (getExactCalendarReleaseDates(record, viewType, calendarMonthKey).length === 0) return false;
      if (platform !== 'all' && !record.platforms.some(item => item.name === platform)) return false;
      if (gameType !== 'all' && record.gameType !== gameType) return false;
      if (yuckedIds.has(record.sourceId)) return false;
      const rating = record.rank?.totalRating ?? record.rank?.userRating ?? record.rank?.criticRating ?? 0;
      return rating >= minimumRating;
    })
    .sort((left, right) => calculateCatalogImportance(convertReleaseRecordToCompactRecord(right)) - calculateCatalogImportance(convertReleaseRecordToCompactRecord(left)))
    .slice(0, maximumGames),
  [releases, viewType, calendarMonthKey, platform, gameType, minimumRating, maximumGames, yuckedIds]);

  const platformOptions = useMemo(() =>
    Array.from(new Set(releases.flatMap(record => record.platforms.map(item => item.name)))).sort(),
  [releases]);
  const typeOptions = useMemo(() => Array.from(new Set(releases.map(record => record.gameType))).sort(), [releases]);

  const releaseDates = (record: ReleaseListingRecord) => getExactCalendarReleaseDates(
    record,
    viewType,
    calendarMonthKey,
  );

  const releasesByDate = useMemo(() => {
    const map = new Map<string, ReleaseListingRecord[]>();
    filteredReleases.forEach(record => releaseDates(record).forEach(date => map.set(date, [...(map.get(date) || []), record])));
    return map;
  }, [filteredReleases, viewType, year, month]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const moveMonth = (amount: number) => setCursor(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const persistPersonal = (next: PersonalCalendarItem[]) => {
    setPersonalItems(next);
    savePersonalCalendarItems(next);
  };
  const importGameSafely = (record: ReleaseListingRecord, date: string) => {
    setPersonalItems(current => {
      const next = addLikedGameToCalendar(current, { releaseDate: date, title: record.name, sourceId: record.sourceId });
      if (next !== current) savePersonalCalendarItems(next);
      return next;
    });
  };
  const importGame = (record: ReleaseListingRecord, date: string) =>
    importGameSafely(record, date);
  const addCustom = () => {
    if (!customTitle.trim() || !customDate) return;
    persistPersonal(addPersonalCalendarItem(personalItems, { date: customDate, title: customTitle.trim(), kind: 'custom' }));
    setCustomTitle('');
  };
  const expandGame = (record: ReleaseListingRecord, date: string) => setExpandedGame({ record, date });

  const expandedReleases = expandedDate ? releasesByDate.get(expandedDate) || [] : [];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <section className="atlas-dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9C8A9] bg-[#EFE8D8]/45 px-4 py-3">
          <div className="flex items-center gap-1" role="group" aria-label="Calendar source">
            {([['games', 'Games'], ['events', 'Events'], ['personal', 'My Calendar']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-xl px-4 py-2 text-xs font-bold ${mode === value ? 'bg-[#0B2B3C] text-white shadow-sm' : 'text-[#0C1D2D] hover:bg-white/60'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#C5A059] bg-white px-3 py-2 text-xs font-bold text-[#0B2B3C]">
            <Filter className="h-4 w-4" /> Calendar Settings
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => moveMonth(-1)} className="atlas-widget-control" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <select value={month} onChange={event => setCursor(new Date(year, Number(event.target.value), 1))} className="rounded-xl border border-[#C8B584] bg-white px-3 py-2 font-serif text-lg font-bold text-[#0C1D2D]">
              {monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
            <input type="number" min="1970" max="2100" value={year} onChange={event => setCursor(new Date(Number(event.target.value), month, 1))} className="w-24 rounded-xl border border-[#C8B584] bg-white px-3 py-2 font-mono text-sm font-bold" aria-label="Calendar year" />
            <input type="date" value={formatYMD(year, month, 1)} onChange={event => { const [nextYear, nextMonth] = event.target.value.split('-').map(Number); setCursor(new Date(nextYear, nextMonth - 1, 1)); }} className="rounded-xl border border-[#C8B584] bg-white px-3 py-2 text-xs font-bold" aria-label="Jump to exact date" />
          </div>
          <button type="button" onClick={() => moveMonth(1)} className="atlas-widget-control" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </section>

      {mode === 'personal' && (
        <section className="atlas-dashboard-panel flex flex-wrap items-center gap-2 p-3">
          <CalendarPlus className="h-4 w-4 text-[#8C6D37]" />
          <input type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} className="rounded-xl border border-[#C8B584] bg-white px-3 py-2 text-xs font-bold" />
          <input value={customTitle} onChange={event => setCustomTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addCustom(); }} placeholder="Add a custom calendar item..." className="min-w-56 flex-1 rounded-xl border border-[#C8B584] bg-white px-3 py-2 text-xs font-semibold" />
          <button type="button" onClick={addCustom} className="flex items-center gap-1 rounded-xl bg-[#0B2B3C] px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Add</button>
        </section>
      )}

      {mode === 'events' ? (
        <div className="atlas-dashboard-panel p-8 text-center">
          <h2 className="font-serif text-2xl font-bold text-[#0C1D2D]">Events Calendar</h2>
          <p className="mt-2 text-sm text-[#47586A]">Event dates will appear here when the events API is connected. The calendar structure is ready for that feed.</p>
        </div>
      ) : (
        <section className="atlas-dashboard-panel relative overflow-x-auto p-3">
          {error && <p className="mb-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7">
              {weekdays.map(day => <div key={day} className="border-b border-[#C8B584] px-2 py-2 text-center font-serif text-sm font-bold text-[#0B2B3C]">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 border-l border-t border-[#D9C8A9]">
              {cells.map((day, index) => {
                const date = day ? formatYMD(year, month, day) : '';
                const dayReleases = date ? releasesByDate.get(date) || [] : [];
                const dayPersonal = date ? personalItems.filter(item => item.date === date) : [];
                const isToday = day && date === formatYMD(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <div key={index} className={`min-h-32 border-b border-r border-[#D9C8A9] p-2 ${day ? 'bg-white/55' : 'bg-[#EFE8D8]/45'}`}>
                    {day && <>
                      <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-black ${isToday ? 'bg-[#0B2B3C] text-white' : 'text-[#0C1D2D]'}`}>{day}</div>
                      <div className="space-y-1.5">
                        {mode === 'games'
                          ? dayReleases.slice(0, 5).map(record => <GameReleaseItem key={`${record.sourceId}:${date}`} record={record} date={date} viewType={viewType} onExpand={expandGame} />)
                          : dayPersonal.map(item => (
                            <div key={item.id} className="flex items-start justify-between gap-1 rounded-lg border border-[#D9C8A9] bg-[#FDFBF7] p-1.5">
                              <span><span className="block line-clamp-2 text-[10px] font-bold text-[#0C1D2D]">{item.title}</span><span className="text-[9px] uppercase text-[#8C6D37]">{item.kind}</span></span>
                              <button type="button" onClick={() => persistPersonal(removePersonalCalendarItem(personalItems, item.id))} className="text-rose-700" aria-label={`Remove ${item.title}`}><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ))}
                      </div>
                      {mode === 'games' && dayReleases.length > 5 && (
                        <button type="button" onClick={() => setExpandedDate(date)} className="mt-1 text-[9px] font-bold text-[#0B2B3C] hover:underline">+{dayReleases.length - 5} more</button>
                      )}
                    </>}
                  </div>
                );
              })}
            </div>
          </div>
          {isLoading && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/30"><span className="rounded-xl bg-[#0B2B3C] px-4 py-2 text-xs font-bold text-white">Loading releases…</span></div>}
        </section>
      )}

      {expandedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C1D2D]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="calendar-day-title">
          <div className="atlas-dashboard-panel max-h-[80vh] w-full max-w-xl overflow-auto p-5">
            <div className="flex items-start justify-between border-b border-[#D9C8A9] pb-4">
              <div><h2 id="calendar-day-title" className="font-serif text-2xl font-bold text-[#0C1D2D]">{expandedDate}</h2><p className="text-xs text-[#47586A]">{expandedReleases.length} game releases</p></div>
              <button type="button" onClick={() => setExpandedDate(null)} className="atlas-widget-control" aria-label="Close day details"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2">
              {expandedReleases.map(record => <GameReleaseItem key={`${record.sourceId}:${expandedDate}`} record={record} date={expandedDate} viewType={viewType} onExpand={expandGame} />)}
            </div>
          </div>
        </div>
      )}

      {expandedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C1D2D]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${expandedGame.record.name} calendar card`} onClick={() => setExpandedGame(null)}>
          <div className="relative w-full max-w-[360px]" onClick={event => event.stopPropagation()}>
            <button type="button" onClick={() => setExpandedGame(null)} className="atlas-widget-control absolute -right-2 -top-2 z-30 bg-white" aria-label="Close expanded game"><X className="h-4 w-4" /></button>
            <GameCard
              game={convertReleaseRecordToCompactRecord(expandedGame.record)}
              onSelect={record => { setExpandedGame(null); setSelectedGame(record); }}
              onLikeChange={liked => { if (liked) importGameSafely(expandedGame.record, expandedGame.date); }}
              className="w-full"
            />
            <button type="button" onClick={() => importGame(expandedGame.record, expandedGame.date)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#C5A059] bg-white px-4 py-2 text-xs font-bold text-[#0B2B3C] shadow-sm">
              <CalendarPlus className="h-4 w-4" /> Add to My Calendar
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C1D2D]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="calendar-settings-title">
          <div className="atlas-dashboard-panel w-full max-w-xl p-5">
            <div className="flex items-start justify-between border-b border-[#D9C8A9] pb-4">
              <div><h2 id="calendar-settings-title" className="font-serif text-2xl font-bold text-[#0C1D2D]">Calendar Settings</h2><p className="mt-1 text-xs text-[#47586A]">Limit which game releases appear in the month grid.</p></div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="atlas-widget-control" aria-label="Close calendar settings"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">Release context<select value={viewType} onChange={event => setViewType(event.target.value as typeof viewType)} className="mt-1 w-full rounded-xl border border-[#C8B584] bg-white px-3 py-2"><option value="first_release">First Release</option><option value="platform_release">Platform Release</option></select></label>
              <label className="text-xs font-bold">Platform<select value={platform} onChange={event => setPlatform(event.target.value)} className="mt-1 w-full rounded-xl border border-[#C8B584] bg-white px-3 py-2"><option value="all">All Platforms</option>{platformOptions.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="text-xs font-bold">Format<select value={gameType} onChange={event => setGameType(event.target.value)} className="mt-1 w-full rounded-xl border border-[#C8B584] bg-white px-3 py-2"><option value="all">All Formats</option>{typeOptions.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-bold">Minimum rating: {minimumRating || 'Any'}<input type="range" min="0" max="10" step="1" value={minimumRating} onChange={event => setMinimumRating(Number(event.target.value))} className="mt-3 w-full accent-[#0B6777]" /></label>
              <label className="text-xs font-bold">Maximum games<select value={maximumGames} onChange={event => setMaximumGames(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[#C8B584] bg-white px-3 py-2"><option value="30">Top 30</option><option value="50">Top 50</option><option value="100">Top 100</option><option value="250">Top 250</option></select></label>
            </div>
            <button type="button" onClick={() => setSettingsOpen(false)} className="mt-5 w-full rounded-xl bg-[#0B2B3C] px-4 py-2 text-xs font-bold text-white">Apply</button>
          </div>
        </div>
      )}

      <GameDetailModal selectedGame={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
};
