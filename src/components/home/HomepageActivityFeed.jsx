import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserCheck, MapPin, Trophy, Newspaper, Flag, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Feed item type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  driver_registered: { Icon: UserCheck, color: 'text-[#00FFDA]', bg: 'bg-[#00FFDA]/8', label: 'Registration' },
  track_added:       { Icon: MapPin,    color: 'text-blue-400',   bg: 'bg-blue-400/8',  label: 'New Track' },
  series_updated:    { Icon: Trophy,    color: 'text-amber-400',  bg: 'bg-amber-400/8', label: 'Series Update' },
  story_published:   { Icon: Newspaper, color: 'text-white/60',   bg: 'bg-white/5',     label: 'Story' },
  results_posted:    { Icon: Flag,      color: 'text-[#00FFDA]',  bg: 'bg-[#00FFDA]/8', label: 'Results' },
  media_uploaded:    { Icon: Camera,    color: 'text-purple-400', bg: 'bg-purple-400/8', label: 'Media' },
};

// page routing by entity type
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
      className="group flex-shrink-0 w-64 sm:w-72 border border-white/5 hover:border-[#00FFDA]/20 bg-[#0C0C0C] hover:bg-[#0F0F0F] transition-all duration-200 p-5 flex flex-col gap-3"
    >
      {/* Icon + label */}
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 ${cfg.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <span className={`font-mono text-[8px] tracking-[0.3em] ${cfg.color} uppercase opacity-60`}>
          {cfg.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <h4 className="text-sm font-bold text-white/75 group-hover:text-white transition-colors leading-snug line-clamp-2">
          {item.title}
        </h4>
        {item.desc && (
          <p className="text-white/30 text-xs mt-1.5 leading-relaxed line-clamp-2">
            {item.desc}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="font-mono text-[9px] text-white/20">
          {formatDistanceToNow(item.time, { addSuffix: true })}
        </span>
        <div className="w-4 h-px bg-[#00FFDA]/20 group-hover:bg-[#00FFDA]/50 group-hover:w-6 transition-all" />
      </div>
    </Link>
  );
}

export default function HomepageActivityFeed() {
  const scrollRef = useRef(null);

  // Real data hooks — stories and events are live; drivers can be wired later
  const { data: stories = [] } = useQuery({
    queryKey: ['activityFeedStories'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 4),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['activityFeedEvents'],
    queryFn: () => base44.entities.Event.list('-created_date', 4),
    staleTime: 5 * 60 * 1000,
  });

  // Merge real data with placeholders
  const liveItems = [
    ...stories.map(s => ({
      id: `story-${s.id}`,
      type: 'story_published',
      title: s.title || 'Story published',
      desc: s.category || 'The Outlet',
      time: s.published_date ? new Date(s.published_date) : new Date(s.created_date),
      page: 'OutletHome',
    })),
    ...recentEvents.map(e => ({
      id: `event-${e.id}`,
      type: 'results_posted',
      title: e.name || 'Event added',
      desc: e.series_name || 'Motorsports event',
      time: new Date(e.created_date),
      page: 'EventDirectory',
    })),
    ...PLACEHOLDER_ITEMS,
  ].sort((a, b) => b.time - a.time).slice(0, 12);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 310, behavior: 'smooth' });
  };

  return (
    <section className="bg-[#080808] py-10 border-b border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header row */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FFDA] animate-pulse" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase">Live Feed</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-white/20 uppercase">Recent Platform Activity</span>
          </div>

          {/* Scroll arrows */}
          <div className="hidden sm:flex gap-1.5">
            <button
              onClick={() => scroll(-1)}
              className="w-8 h-8 border border-white/8 hover:border-[#00FFDA]/30 flex items-center justify-center text-white/25 hover:text-[#00FFDA] transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-8 h-8 border border-white/8 hover:border-[#00FFDA]/30 flex items-center justify-center text-white/25 hover:text-[#00FFDA] transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable feed */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide"
        >
          {liveItems.map((item, i) => (
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