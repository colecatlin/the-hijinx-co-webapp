import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Trophy, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  Published: { label: 'Upcoming',  color: 'text-[#00FFDA]', dot: 'bg-[#00FFDA]' },
  published:  { label: 'Upcoming',  color: 'text-[#00FFDA]', dot: 'bg-[#00FFDA]' },
  Live:       { label: 'Live Now',  color: 'text-[#EF4444]', dot: 'bg-[#EF4444] animate-pulse' },
  live:       { label: 'Live Now',  color: 'text-[#EF4444]', dot: 'bg-[#EF4444] animate-pulse' },
  Completed:  { label: 'Results',   color: 'text-amber-400', dot: 'bg-amber-400' },
  completed:  { label: 'Results',   color: 'text-amber-400', dot: 'bg-amber-400' },
};

const getStatusCfg = (status) =>
  STATUS_CONFIG[status] || { label: status || 'Event', color: 'text-white/50', dot: 'bg-white/30' };

export default function HomepageEventSpotlight({ event }) {
  if (!event) return null;

  const eventUrl = `/EventProfile?id=${event.id}`;
  const statusCfg = getStatusCfg(event.status);

  let formattedDate = null;
  try { formattedDate = event.event_date ? format(parseISO(event.event_date), 'EEE, MMM d yyyy') : null; }
  catch (_) { formattedDate = event.event_date; }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.1 }}
      className="relative overflow-hidden bg-[#0D0A0A] border border-[#EF4444]/25 hover:border-[#EF4444]/70 hover:shadow-[0_8px_40px_rgba(239,68,68,0.1)] transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#EF4444] via-[#EF4444]/40 to-transparent" />

      {/* Background image */}
      {event.image ? (
        <>
          <img
            src={event.image}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0A0A]/95 via-[#0D0A0A]/75 to-[#0D0A0A]/40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#150D0D] to-[#0D0A0A]" />
      )}

      {/* Ambient glow */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 w-32 h-32 bg-[#EF4444]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative p-7 md:p-8 flex flex-col justify-between min-h-[260px]">
        {/* Header tag */}
        <div className="flex items-center gap-2 mb-5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          <span className={`font-mono text-[9px] tracking-[0.4em] uppercase font-bold ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          <span className="font-mono text-[9px] text-white/25 tracking-widest">·</span>
          <span className="font-mono text-[9px] tracking-[0.3em] text-white/40 uppercase">Event Spotlight</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight group-hover:text-red-400 transition-colors duration-300">
            {event.name}
          </h3>

          {event.subtitle && (
            <p className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase mt-2">
              {event.subtitle}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-col gap-1.5 mt-4">
            {formattedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <span className="font-mono text-[10px] text-white/55">{formattedDate}</span>
              </div>
            )}
            {(event.track_name || event.location) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <span className="font-mono text-[10px] text-white/55 line-clamp-1">
                  {event.track_name || event.location}
                </span>
              </div>
            )}
            {event.series_name && (
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <span className="font-mono text-[10px] text-white/55 line-clamp-1">{event.series_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={eventUrl}
          className="inline-flex items-center gap-2 mt-6 text-xs font-bold tracking-wider uppercase text-red-400 group-hover:gap-3 transition-all"
        >
          View Event <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}