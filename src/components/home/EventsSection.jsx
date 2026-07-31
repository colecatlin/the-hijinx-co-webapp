import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function formatEventDate(dateStr, endStr) {
  if (!dateStr) return null;
  try {
    const start = format(parseISO(dateStr), 'MMM d');
    if (!endStr) return start;
    const end = parseISO(endStr);
    if (isNaN(end.getTime()) || endStr === dateStr) return start;
    return `${start} – ${format(end, 'MMM d')}`;
  } catch { return null; }
}

export default function EventsSection() {
  const { data: events = [] } = useEventsQuery();
  const seriesIds = [...new Set(events.map(e => e.series_id).filter(Boolean))];
  const seriesMap = useSeriesMap(seriesIds);

  const today = new Date().toISOString().split('T')[0];
  const displayEvents = events.filter(e => (e.end_date || e.event_date) >= today).slice(0, 6);

  return (
    <section className="relative pt-16 md:pt-20 pb-20 md:pb-28 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="relative max-w-7xl mx-auto px-6">

        {/* Section label row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-[1px] bg-motion" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-foreground-quiet uppercase font-bold">
              Events
            </span>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <Link
              to={createPageUrl('EventDirectory')}
              className="flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-foreground-secondary hover:text-motion transition-colors uppercase"
            >
              All Events <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              to={`${createPageUrl('EventDirectory')}?tab=map`}
              className="flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-foreground hover:text-motion transition-colors uppercase font-bold border-b pb-0.5 border-motion/40"
            >
              Events Near Me <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-none">
            UPCOMING<br />
            <span className="text-foreground-quiet/40">EVENTS</span>
          </h2>
        </div>

        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-divider bg-surface-interactive">
            <Calendar className="w-7 h-7 mb-3 text-foreground-quiet" />
            <p className="font-mono text-[10px] tracking-[0.3em] text-foreground-quiet uppercase">Events calendar coming soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ y: 16 }} whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <Link
                  to={createPageUrl('EventProfile') + `?id=${event.id}`}
                  className="group flex flex-col h-full relative overflow-hidden rounded-xl block transition-all duration-300 bg-surface-elevated border border-divider hover:border-motion/40 hover:-translate-y-0.5"
                >
                  {/* Image or date strip */}
                  {event.event_cover_image_url ? (
                    <div className="relative overflow-hidden" style={{ height: 140 }}>
                      <img
                        src={event.event_cover_image_url}
                        alt={event.name}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
                        style={{ filter: 'contrast(1.08) saturate(0.95) brightness(0.95)' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {event.event_date && (
                          <div className="px-2 py-0.5 rounded bg-black/80 border border-white/10">
                            <span className="font-mono text-[9px] font-black text-white tracking-wider">
                              {formatEventDate(event.event_date, event.end_date)}
                            </span>
                          </div>
                        )}
                        {event.series_id && seriesMap[event.series_id]?.discipline && (
                          <div className="px-2 py-0.5 rounded bg-black/70">
                            <span className="font-mono text-[8px] text-white/70 tracking-wider uppercase">
                              {seriesMap[event.series_id].discipline}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 h-[52px] bg-surface-interactive border-b border-divider">
                      {event.event_date && (
                        <span className="font-mono text-sm font-black text-foreground-secondary tracking-wide">
                          {formatEventDate(event.event_date, event.end_date)}
                        </span>
                      )}
                      {event.series_id && seriesMap[event.series_id]?.discipline && (
                        <span className="font-mono text-[8px] text-foreground-quiet tracking-wider uppercase">
                          {seriesMap[event.series_id].discipline}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {event.series_name && (
                      <span className="font-mono text-[8px] tracking-[0.4em] text-foreground-quiet uppercase font-bold mb-1.5 block">
                        {event.series_name}
                      </span>
                    )}
                    <h3 className="text-sm font-black text-foreground tracking-tight leading-snug mb-2 group-hover:opacity-70 transition-opacity">
                      {event.name}
                    </h3>

                    <div className="mt-auto flex items-start justify-between gap-2">
                      {(event.location_note || event.season) && (
                        <div className="flex items-start gap-1.5 min-w-0 text-foreground-quiet">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-px" />
                          <span className="font-mono text-[8px] tracking-wide leading-relaxed">
                            {event.location_note || event.season}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-3 h-3 flex-shrink-0 mt-px transition-all group-hover:translate-x-0.5 text-foreground-quiet" />
                    </div>
                  </div>

                  {/* Teal top accent on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, hsl(var(--motion)), transparent)' }} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile link */}
        <div className="mt-6 flex md:hidden">
          <Link
            to={createPageUrl('EventDirectory')}
            className="flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-foreground-quiet hover:text-foreground transition-colors uppercase"
          >
            All Events <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </section>
  );
}

// Hooks kept here to preserve original wiring without extra imports.

function useEventsQuery() {
  return useQuery({
    queryKey: ['homepageEvents'],
    queryFn: () => base44.entities.Event.filter({ public_status: { $in: ['published', 'live', 'completed'] } }, 'event_date', 8),
    staleTime: 5 * 60 * 1000,
  });
}

function useSeriesMap(seriesIds) {
  const { data: seriesList = [] } = useQuery({
    queryKey: ['homepageEventSeries', seriesIds.join(',')],
    queryFn: () => Promise.all(seriesIds.map(id => base44.entities.Series.filter({ id }, '-created_date', 1).then(r => r[0]).catch(() => null))).then(r => r.filter(Boolean)),
    enabled: seriesIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  return Object.fromEntries(seriesList.map(s => [s.id, s]));
}