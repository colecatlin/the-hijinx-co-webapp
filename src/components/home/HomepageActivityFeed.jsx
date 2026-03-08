import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserCheck, MapPin, Trophy, Newspaper, Flag, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const TYPE_CONFIG = {
  driver_registered:   { Icon: UserCheck, color: 'text-[#008080]',   bg: 'bg-teal-50',     label: 'Registration' },
  driver_registration: { Icon: UserCheck, color: 'text-[#008080]',   bg: 'bg-teal-50',     label: 'Registration' },
  track_added:         { Icon: MapPin,    color: 'text-blue-600',     bg: 'bg-blue-50',     label: 'New Track' },
  series_updated:      { Icon: Trophy,    color: 'text-amber-600',    bg: 'bg-amber-50',    label: 'Series Update' },
  story_published:     { Icon: Newspaper, color: 'text-gray-600',     bg: 'bg-gray-100',    label: 'Story' },
  results_posted:      { Icon: Flag,      color: 'text-red-500',      bg: 'bg-red-50',      label: 'Results' },
  event_created:       { Icon: Flag,      color: 'text-blue-600',     bg: 'bg-blue-50',     label: 'Event' },
  media_uploaded:      { Icon: Camera,    color: 'text-purple-600',   bg: 'bg-purple-50',   label: 'Media' },
};

const ENTITY_PAGE = {
  driver: 'DriverDirectory', track: 'TrackDirectory', series: 'SeriesHome',
  event: 'EventDirectory', story: 'OutletHome', results: 'EventDirectory', media: 'MediaPortal',
};

function FeedCard({ item }) {
  const type = item.activity_type || item.type;
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.story_published;
  const Icon = cfg.Icon;
  const page = item.page || ENTITY_PAGE[item.entity_type] || 'MotorsportsHome';
  const time = item.created_at ? new Date(item.created_at) : (item.time || new Date());

  return (
    <Link
      to={createPageUrl(page)}
      className="group flex-shrink-0 w-64 sm:w-72 bg-white border border-gray-200 hover:border-[#00FFDA] hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 ${cfg.bg} flex items-center justify-center rounded-sm`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <span className={`font-mono text-[8px] tracking-[0.3em] ${cfg.color} uppercase font-bold`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <h4 className="text-sm font-bold text-[#111] group-hover:text-[#008080] transition-colors leading-snug line-clamp-2">
          {item.title}
        </h4>
        {(item.description || item.desc) && (
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-2">
            {item.description || item.desc}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="font-mono text-[9px] text-gray-400">
          {formatDistanceToNow(time, { addSuffix: true })}
        </span>
        <div className="w-4 h-px bg-[#00FFDA]/50 group-hover:bg-[#00FFDA] group-hover:w-6 transition-all" />
      </div>
    </Link>
  );
}

export default function HomepageActivityFeed({ items = [], isLoading }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 310, behavior: 'smooth' });
  };

  return (
    <section className="bg-white py-10 border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#EF4444] font-bold uppercase">Live Feed</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-gray-400 uppercase">Recent Platform Activity</span>
          </div>

          <div className="hidden sm:flex gap-1.5">
            <button
              onClick={() => scroll(-1)}
              className="w-8 h-8 border border-gray-200 hover:border-[#00FFDA] flex items-center justify-center text-gray-400 hover:text-[#008080] transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-8 h-8 border border-gray-200 hover:border-[#00FFDA] flex items-center justify-center text-gray-400 hover:text-[#008080] transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide"
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <FeedCard item={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}