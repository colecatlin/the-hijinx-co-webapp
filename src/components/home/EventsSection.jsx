import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight, MapPin, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function formatEventDate(dateStr) {
  if (!dateStr) return null;
  try { return format(parseISO(dateStr), 'MMM d'); } catch { return null; }
}

const paperGrain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  backgroundSize: '256px 256px',
};

export default function EventsSection() {
  const { data: events = [] } = useQuery({
    queryKey: ['homepageEvents'],
    queryFn: () => base44.entities.Event.filter({ public_status: 'published' }, 'event_date', 8),
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.event_date >= today).slice(0, 6);
  const displayEvents = upcoming.length > 0 ? upcoming : events.slice(0, 6);

  return (
    <section className="relative py-16 md:py-20 overflow-hidden" style={{ background: '#F5F0E8' }}>
      {/* Paper grain */}
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={paperGrain} />

      <div className="relative max-w-7xl mx-auto px-6">

        {/* Section label row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-[2px] bg-black" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-black/60 uppercase font-bold">
              Events
            </span>
          </div>
          <Link
            to={createPageUrl('EventDirectory')}
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-black/40 hover:text-black transition-colors uppercase"
          >
            All Events <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight leading-none">
            UPCOMING<br />
            <span className="text-black/20">EVENTS</span>
          </h2>
        </div>

        {displayEvents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <Calendar className="w-7 h-7 text-black/15 mb-3" />
            <p className="font-mono text-[10px] tracking-[0.3em] text-black/25 uppercase">Events calendar coming soon</p>
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
                  className="group flex flex-col h-full relative overflow-hidden block transition-all duration-200"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  {/* Image or date strip */}
                  {event.event_cover_image_url ? (
                    <div className="relative overflow-hidden" style={{ height: 140 }}>
                      <img
                        src={event.event_cover_image_url}
                        alt={event.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
                        style={{ filter: 'contrast(1.1) saturate(0.75)' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {event.event_date && (
                        <div className="absolute top-3 left-3 px-2 py-0.5" style={{ background: '#0A0A0A' }}>
                          <span className="font-mono text-[9px] font-black text-white tracking-wider">
                            {formatEventDate(event.event_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex items-center px-4"
                      style={{ height: 52, background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                    >
                      {event.event_date && (
                        <span className="font-mono text-sm font-black text-black/60 tracking-wide">
                          {formatEventDate(event.event_date)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {event.series_name && (
                      <span className="font-mono text-[8px] tracking-[0.4em] text-black/35 uppercase font-bold mb-1.5 block">
                        {event.series_name}
                      </span>
                    )}
                    <h3 className="text-sm font-black text-black tracking-tight leading-snug mb-3 group-hover:opacity-50 transition-opacity line-clamp-2">
                      {event.name}
                    </h3>

                    <div className="mt-auto flex items-center justify-between">
                      {(event.location_note || event.season) && (
                        <div className="flex items-center gap-1.5 text-black/30">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono text-[8px] tracking-wide truncate max-w-[140px]">
                            {event.location_note || event.season}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-3 h-3 text-black/20 group-hover:text-black group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  </div>

                  {/* Top accent on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-black" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile link */}
        <div className="mt-6 flex md:hidden">
          <Link
            to={createPageUrl('EventDirectory')}
            className="flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-black/40 hover:text-black transition-colors uppercase"
          >
            All Events <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </section>
  );
}