import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, ChevronRight } from 'lucide-react';
import NextUpEventCard from './NextUpEventCard';

function useNextUpEvents() {
  const { data: events = [] } = useQuery({
    queryKey: ['home1NextUpEvents'],
    queryFn: () =>
      base44.entities.Event.filter(
        { public_status: { $in: ['published', 'live'] } },
        'event_date',
        40
      ),
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events
    .filter((e) => !e.is_archived && (e.end_date || e.event_date) >= today)
    .slice(0, 10);

  const seriesIds = [...new Set(upcoming.map((e) => e.series_id).filter(Boolean))];
  const trackIds = [...new Set(upcoming.map((e) => e.track_id).filter(Boolean))];

  const { data: seriesList = [] } = useQuery({
    queryKey: ['home1NextUpSeries', seriesIds.join(',')],
    queryFn: () =>
      Promise.all(
        seriesIds.map((id) =>
          base44.entities.Series.filter({ id }, '-created_date', 1)
            .then((r) => r[0])
            .catch(() => null)
        )
      ).then((r) => r.filter(Boolean)),
    enabled: seriesIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: trackList = [] } = useQuery({
    queryKey: ['home1NextUpTracks', trackIds.join(',')],
    queryFn: () =>
      Promise.all(
        trackIds.map((id) =>
          base44.entities.Track.filter({ id }, '-created_date', 1)
            .then((r) => r[0])
            .catch(() => null)
        )
      ).then((r) => r.filter(Boolean)),
    enabled: trackIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['home1NextUpDisciplines'],
    queryFn: () => base44.entities.Discipline.list('-sort_order', 100),
    staleTime: 30 * 60 * 1000,
  });

  const seriesMap = Object.fromEntries(seriesList.map((s) => [s.id, s]));
  const trackMap = Object.fromEntries(trackList.map((t) => [t.id, t]));
  const disciplineMap = Object.fromEntries(disciplines.map((d) => [d.id, d]));

  return { upcoming, seriesMap, trackMap, disciplineMap };
}

export default function Home1NextUp() {
  const scrollerRef = useRef(null);
  const { upcoming, seriesMap, trackMap, disciplineMap } = useNextUpEvents();

  const scrollByCards = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const presentDisciplines = [
    ...new Set(
      upcoming.map((e) => {
        const s = seriesMap[e.series_id];
        const d = s?.discipline_id ? disciplineMap[s.discipline_id] : null;
        return d?.name || s?.discipline;
      }).filter(Boolean)
    ),
  ];

  return (
    <section className="relative w-full pt-3 md:pt-5 pb-8 md:pb-12" style={{ background: '#F9F7F2' }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 mb-5 md:mb-7">
          <div className="flex items-end gap-4 md:gap-6 flex-wrap">
            <h2
              className="font-serif italic font-black leading-[0.9] tracking-[-0.02em]"
              style={{ color: '#232323', fontSize: 'clamp(2.75rem, 6vw, 5rem)' }}
            >
              NEXT UP
            </h2>
            <p
              className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase pb-2"
              style={{ color: 'rgba(35,35,35,0.6)' }}
            >
              WHERE MOTORSPORTS HAPPENS.
            </p>
          </div>
          <Link
            to="/Directory?cat=events"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 font-mono text-[10px] tracking-[0.25em] uppercase font-bold border bg-white transition-colors hover:bg-[#232323] hover:text-[#F9F7F2]"
            style={{ color: '#232323', borderColor: '#232323' }}
          >
            VIEW FULL CALENDAR <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Cards row */}
        {upcoming.length === 0 ? (
          <div
            className="flex items-center justify-center py-20 border"
            style={{ borderColor: '#232323' }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.3em] uppercase"
              style={{ color: 'rgba(35,35,35,0.5)' }}
            >
              No upcoming events — check back soon.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={scrollerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0 pb-2"
            >
              {upcoming.map((event) => {
                const s = seriesMap[event.series_id];
                const discipline = s?.discipline_id
                  ? disciplineMap[s.discipline_id]
                  : null;
                return (
                  <NextUpEventCard
                    key={event.id}
                    event={event}
                    series={s}
                    track={trackMap[event.track_id]}
                    discipline={discipline}
                  />
                );
              })}
            </div>
            {upcoming.length > 4 && (
              <button
                onClick={() => scrollByCards(1)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center shadow-sm transition-transform hover:scale-105"
                style={{ background: '#232323', color: '#F9F7F2' }}
                aria-label="Next events"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Mobile full calendar link */}
        <div className="mt-6 sm:hidden">
          <Link
            to="/Directory?cat=events"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase font-bold border-b pb-1"
            style={{ color: '#232323', borderColor: '#232323' }}
          >
            VIEW FULL CALENDAR <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bottom editorial detail */}
        <div
          className="mt-7 md:mt-10 pt-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          style={{ borderColor: 'rgba(35,35,35,0.15)' }}
        >
          <p className="font-serif italic text-lg md:text-xl" style={{ color: '#232323' }}>
            Different disciplines. Same passion.
          </p>
          {presentDisciplines.length > 0 && (
            <p
              className="font-mono text-[9px] md:text-[10px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(35,35,35,0.5)' }}
            >
              {presentDisciplines.map((d) => d.toUpperCase()).join(' // ')} // MORE
            </p>
          )}
        </div>
      </div>
    </section>
  );
}