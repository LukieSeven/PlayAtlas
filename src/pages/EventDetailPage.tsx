import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Radio } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getEventsCatalog } from '../services/eventCatalogService';
import type { CatalogEvent } from '../types/events';

export const EventDetailPage: React.FC = () => {
  const { eventId = '' } = useParams();
  const decodedId = useMemo(() => { try { return decodeURIComponent(eventId); } catch { return eventId; } }, [eventId]);
  const [event, setEvent] = useState<CatalogEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getEventsCatalog()
      .then(events => { if (active) setEvent(events.find(candidate => candidate.id === decodedId) || null); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Event details could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [decodedId]);

  if (loading) return <div className="atlas-dashboard-panel p-10 text-center text-sm font-bold">Loading event details…</div>;
  if (error || !event) return <div className="atlas-dashboard-panel p-8"><p className="text-sm font-bold text-rose-800">{error || 'This event is no longer present in the current catalog.'}</p><Link to="/events" className="mt-4 inline-flex text-xs font-bold text-[#0B2B3C] hover:underline">← Return to Events</Link></div>;

  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : undefined;
  const venue = event.venue ? [event.venue.name, event.venue.city, event.venue.region, event.venue.country].filter(Boolean).join(', ') : '';

  return <div className="mx-auto max-w-5xl space-y-5">
    <Link to="/events" className="inline-flex items-center gap-2 text-xs font-bold text-[#0B2B3C] hover:underline"><ArrowLeft className="h-4 w-4" /> Back to Events</Link>
    <article className="atlas-dashboard-panel overflow-hidden">
      <div className="grid md:grid-cols-[280px_1fr]">
        <div className="flex min-h-64 items-center justify-center bg-[#0B2B3C] p-6">{event.logoUrl ? <img src={event.logoUrl} alt="" className="max-h-56 w-full rounded-xl object-contain" /> : <CalendarDays className="h-20 w-20 text-[#C5A059]" />}</div>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">{event.categories.map(category => <span key={category} className="rounded-full border border-[#C5A059] bg-[#EFE8D8] px-3 py-1 text-[10px] font-black uppercase text-[#0B2B3C]">{category}</span>)}</div>
          <h1 className="mt-3 font-serif text-4xl font-bold text-[#0C1D2D]">{event.name}</h1>
          <div className="mt-4 space-y-2 text-sm font-semibold text-[#47586A]">
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#8C6D37]" /><span>{event.allDay ? start.toLocaleDateString(undefined, { dateStyle: 'long' }) : start.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}{end ? ` – ${event.allDay ? end.toLocaleDateString(undefined, { dateStyle: 'long' }) : end.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}` : ''}{event.timeZone ? ` (${event.timeZone})` : ''}</span></p>
            {venue && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8C6D37]" /><span>{venue}</span></p>}
          </div>
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-[#47586A]">{event.description || 'No description has been published for this event.'}</p>
          {event.gameIds.length > 0 && <p className="mt-5 text-xs font-bold text-[#8C6D37]">Linked to {event.gameIds.length} game{event.gameIds.length === 1 ? '' : 's'} in the IGDB catalog.</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {event.liveStreamUrl && <a href={event.liveStreamUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#0B2B3C] px-4 py-2.5 text-xs font-bold text-white"><Radio className="h-4 w-4" /> Watch stream</a>}
            {event.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059] bg-[#FDFBF7] px-4 py-2.5 text-xs font-bold text-[#0B2B3C]">{link.label || 'Event link'} <ExternalLink className="h-4 w-4" /></a>)}
          </div>
          <p className="mt-6 border-t border-[#D9C8A9] pt-4 text-[10px] font-bold uppercase tracking-wide text-[#718294]">Sources: {event.sources.map(source => source === 'events_for_gamers' ? 'Events for Gamers' : 'IGDB').join(' + ')}</p>
        </div>
      </div>
    </article>
  </div>;
};

export default EventDetailPage;
