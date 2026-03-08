import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const BADGE_COLORS = {
  Registration: 'bg-blue-100   text-blue-800',
  Story:        'bg-purple-100 text-purple-800',
  Media:        'bg-pink-100   text-pink-800',
  Results:      'bg-amber-100  text-amber-800',
  Event:        'bg-green-100  text-green-800',
  Track:        'bg-teal-100   text-teal-800',
  Series:       'bg-indigo-100 text-indigo-800',
  Update:       'bg-gray-100   text-gray-700',
};

const ACTIVITY_ICONS = {
  driver_registration: '🏎',
  driver_registered:   '🏎',
  story_published:     '📰',
  media_uploaded:      '📷',
  results_posted:      '🏆',
  event_created:       '📅',
  track_added:         '🛣',
  series_updated:      '🔁',
};

function ActivityCard({ item, index }) {
  const badge = BADGE_COLORS[item.badge_label] || BADGE_COLORS.Update;
  const icon  = ACTIVITY_ICONS[item.activity_type] || '⚡';

  const cardInner = (
    <div className="group bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3 h-full">
      {/* Thumbnail or icon placeholder */}
      {item.thumbnail ? (
        <div className="w-full h-32 overflow-hidden rounded bg-gray-50">
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded text-xl">
          {icon}
        </div>
      )}

      {/* Badge + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${badge}`}>
          {item.badge_label}
        </span>
        {item.timestamp && (
          <span className="text-[10px] text-gray-400 font-mono">{item.timestamp}</span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#232323] transition-colors">
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
      )}

      {/* CTA */}
      {item.href && (
        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-gray-400 group-hover:text-gray-900 mt-auto transition-colors">
          View Update <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="h-full"
    >
      {item.href ? <Link to={item.href} className="block h-full">{cardInner}</Link> : cardInner}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full border border-dashed border-gray-200 p-12 text-center">
      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap className="w-5 h-5 text-gray-300" />
      </div>
      <h4 className="text-sm font-bold text-gray-500 mb-1">The platform is coming alive</h4>
      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
        Fresh updates from drivers, events, media, and results will appear here.
      </p>
    </div>
  );
}

export default function HomepageWhatsHappeningNow({ items = [] }) {
  return (
    <section className="bg-[#F5F9FA] border-b border-[#E0EDEF] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-gray-900" />
            <h2 className="text-base font-black tracking-tight text-gray-900 uppercase">What's Happening Now</h2>
          </div>
          {items.length > 0 && (
            <span className="font-mono text-[9px] tracking-wider text-gray-400 uppercase">{items.length} updates</span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            items.slice(0, 6).map((item, i) => (
              <ActivityCard key={item.id || i} item={item} index={i} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}