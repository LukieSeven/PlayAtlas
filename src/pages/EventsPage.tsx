import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Grid2X2, List, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { eventsWithinRange, getEventDetailPath, getEventsCatalog } from '../services/eventCatalogService';
import type { CatalogEvent } from '../types/events';

type EventRange = 30 | 90 | 365;

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [range, setRange] = useState<EventRange>(365);
  const [query, setQuery] = useState('');
  const [streamOnly, setStreamOnly] = useState(false);
  const [linkedGamesOnly, setLinkedGamesOnly] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getEventsCatalog().then(value => { if (active) setEvents(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Events could not be loaded.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleEvents = useMemo(() => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + range);
    const normalizedQuery = query.trim().toLowerCase();
    return eventsWithinRange(events, start, end).filter(event =>
      (!normalizedQuery || `${event.name} ${event.description || ''}`.toLowerCase().includes(normalizedQuery))
      && (!streamOnly || Boolean(event.liveStreamUrl))
      && (!linkedGamesOnly || event.gameIds.length > 0));
  }, [events, range, query, streamOnly, linkedGamesOnly]);

  return <div className="space-y-4 animate-in fade-in duration-300">
    <section className="atlas-dashboard-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D9C8A9] bg-[#EFE8D8]/45 px-4 py-3">
        <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#6F5B39]">Upcoming range</span>
        {([30, 90, 365] as const).map(days => <button key={days} onClick={() => setRange(days)} aria-pressed={range === days} className={`rounded-xl px-4 py-2 text-xs font-bold ${range === days ? 'bg-[#0B2B3C] text-white shadow-sm' : 'text-[#0C1D2D] hover:bg-white/60'}`}>{days === 365 ? 'Next Year' : `${days} Days`}</button>)}
      </div>
      <div className="relative m-4 flex items-center"><Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8C6D37]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events by name or description..." className="w-full rounded-xl border border-[#D9C8A9] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold" /></div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#D9C8A9] px-4 py-3">
        <button onClick={() => setStreamOnly(value => !value)} aria-pressed={streamOnly} className={`rounded-xl border px-3 py-2 text-xs font-bold ${streamOnly ? 'border-[#0B2B3C] bg-[#0B2B3C] text-white' : 'border-[#D9C8A9] bg-white text-[#0B2B3C]'}`}>Has Stream</button>
        <button onClick={() => setLinkedGamesOnly(value => !value)} aria-pressed={linkedGamesOnly} className={`rounded-xl border px-3 py-2 text-xs font-bold ${linkedGamesOnly ? 'border-[#0B2B3C] bg-[#0B2B3C] text-white' : 'border-[#D9C8A9] bg-white text-[#0B2B3C]'}`}>Has Linked Games</button>
        <span className="ml-auto text-xs font-bold text-[#47586A]">Showing {visibleEvents.length} of {events.length}</span>
        <div className="flex rounded-xl border border-[#D9C8A9] bg-white p-1"><button onClick={() => setView('grid')} aria-label="Grid view" className={`rounded-lg p-1.5 ${view === 'grid' ? 'bg-[#0B2B3C] text-white' : 'text-[#47586A]'}`}><Grid2X2 className="h-4 w-4" /></button><button onClick={() => setView('list')} aria-label="List view" className={`rounded-lg p-1.5 ${view === 'list' ? 'bg-[#0B2B3C] text-white' : 'text-[#47586A]'}`}><List className="h-4 w-4" /></button></div>
      </div>
    </section>
    {error && <div className="atlas-dashboard-panel border border-rose-300 p-4 text-sm font-bold text-rose-800">{error}</div>}
    {loading ? <div className="atlas-dashboard-panel p-10 text-center text-sm font-bold">Loading events…</div> :
      <section className={`grid gap-4 ${view === 'grid' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>{visibleEvents.map(event => <EventCard key={event.id} event={event} />)}{visibleEvents.length === 0 && !error && <div className="atlas-dashboard-panel col-span-full p-10 text-center text-sm text-[#47586A]">No events are scheduled in this range.</div>}</section>}
  </div>;
};

const EventCard: React.FC<{ event: CatalogEvent }> = ({ event }) => {
  const start = new Date(event.startTime);
  return <Link to={getEventDetailPath(event.id)} className="block"><article className="atlas-dashboard-panel flex min-h-52 overflow-hidden transition-transform hover:-translate-y-0.5">
    <div className="flex w-28 shrink-0 flex-col items-center justify-center border-r border-[#D9C8A9] bg-[#0B2B3C] p-3 text-center text-white"><span className="text-xs font-black uppercase text-[#F2D27C]">{start.toLocaleString(undefined, { month: 'short' })}</span><span className="font-serif text-4xl font-bold">{start.getDate()}</span><span className="text-[10px]">{start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></div>
    <div className="flex min-w-0 flex-1 flex-col p-4"><div className="flex items-start gap-3">{event.logoUrl ? <img src={event.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain" /> : <CalendarDays className="h-8 w-8 text-[#8C6D37]" />}<div><h2 className="font-serif text-xl font-bold text-[#0C1D2D]">{event.name}</h2><p className="text-[10px] font-bold uppercase tracking-wide text-[#8C6D37]">{event.categories.length > 0 ? event.categories.join(' · ') : (event.timeZone || 'Time shown locally')}</p>{event.venue && <p className="mt-1 text-[10px] font-semibold text-[#47586A]">{[event.venue.name, event.venue.city, event.venue.region, event.venue.country].filter(Boolean).join(', ')}</p>}</div></div><p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[#47586A]">{event.description || 'No description has been published for this event.'}</p><span className="mt-auto pt-4 text-xs font-bold text-[#0B2B3C]">View event details →</span></div>
  </article></Link>;
};

export default EventsPage;
