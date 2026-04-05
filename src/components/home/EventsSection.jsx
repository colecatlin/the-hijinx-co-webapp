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

export default function EventsSection() {
  const { data: events = [] } = useQuery({
    queryKey: ['homepageEvents'],
    queryFn: () => base44.entities.Event.filter(
      { public_status: 'published' },
      'event_date',
      8
    ),
    staleTime: 5 * 60 * 1000,
  });

  // Filter to upcoming events
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.event_date >= today).slice(0, 6);
  const displayEvents = upcoming.length > 0 ? upcoming : events.slice(0, 6);

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section label */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-6 h-[2px] bg-[#FF6B35]" />
            <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
              Events
            </span>
          </div>
          <Link
            to={createPageUrl('EventDirectory')}
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] text-white/30 hover:text-[#FF6B35] transition-colors uppercase"
          >
            All Events <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
            UPCOMING<br />
            <span style={{ color: '#FF6B35' }}>EVENTS</span>
          </h2>
        </div>

        {displayEvents.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Calendar className="w-8 h-8 text-white/15 mb-4" />
            <p className="font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">Events calendar coming soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ y: 20 }} whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <Link
                  to={createPageUrl('EventProfile') + `?id=${event.id}`}
                  className="group flex flex-col h-full relative overflow-hidden transition-all duration-300 block"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Event cover image or date block */}
                  {event.event_cover_image_url ? (
                    <div className="relative overflow-hidden" style={{ height: 160 }}>
                      <img
                        src={event.event_cover_image_url}
                        alt={event.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-[1.04] transition-all duration-700"
                        style={{ filter: 'contrast(1.1) saturate(0.7)' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      {event.event_date && (
                        <div className="absolute top-3 left-3 px-2 py-1" style={{ background: '#FF6B35' }}>
                          <span className="font-mono text-[10px] font-black text-black tracking-wider">
                            {formatEventDate(event.event_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{ height: 80, background: 'rgba(255,107,53,0.08)', borderBottom: '1px solid rgba(255,107,53,0.12)' }}
                    >
                      {event.event_date && (
                        <span className="font-mono text-2xl font-black" style={{ color: '#FF6B35' }}>
                          {formatEventDate(event.event_date)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {event.series_name && (
                      <span className="font-mono text-[8px] tracking-[0.4em] text-white/35 uppercase font-bold mb-2 block">
                        {event.series_name}
                      </span>
                    )}
                    <h3 className="text-base font-black text-white tracking-tight leading-snug mb-3 group-hover:text-[#FF6B35] transition-colors line-clamp-2">
                      {event.name}
                    </h3>

                    <div className="mt-auto flex items-center justify-between">
                      {(event.location_note || event.season) && (
                        <div className="flex items-center gap-1.5 text-white/30">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono text-[8px] tracking-wide truncate max-w-[140px]">
                            {event.location_note || event.season}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>

                  {/* Top accent line on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#FF6B35' }}
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile all events link */}
        <div className="mt-8 flex md:hidden">
          <Link
            to={createPageUrl('EventDirectory')}
            className="flex items-center gap-2 font-mono text-[9px] tracking-[0.4em] text-white/30 hover:text-[#FF6B35] transition-colors uppercase"
          >
            All Events <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </section>
  );
}