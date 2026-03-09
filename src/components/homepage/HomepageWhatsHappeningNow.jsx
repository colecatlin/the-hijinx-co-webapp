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
    <div className="group bg-white border border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3 h-full">
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
      <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1DA1A1] transition-colors">
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.description}</p>
      )}

      {/* CTA */}
      {item.href && (
        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-gray-400 group-hover:text-[#1DA1A1] mt-auto transition-colors">
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
  const placeholders = [
    { badge: 'Event', title: 'Events are being scheduled for the season ahead.', icon: '📅' },
    { badge: 'Registration', title: 'Drivers are setting up their profiles on Index46.', icon: '🏎' },
    { badge: 'Story', title: 'Editorial coverage arrives through The Outlet.', icon: '📰' },
    { badge: 'Track', title: 'Tracks and circuits are coming online.', icon: '🛣' },
    { badge: 'Series', title: 'Series operators are configuring their seasons.', icon: '🏆' },
    { badge: 'Update', title: 'Live race results will appear here as they drop.', icon: '⚡' },
  ];
  const BADGE_COLORS_PH = {
    Registration: 'bg-blue-100 text-blue-800',
    Story: 'bg-purple-100 text-purple-800',
    Event: 'bg-green-100 text-green-800',
    Track: 'bg-teal-100 text-teal-800',
    Series: 'bg-indigo-100 text-indigo-800',
    Update: 'bg-gray-100 text-gray-700',
  };
  return (
    <>
      {placeholders.map((p, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }} className="h-full">
          <div className="bg-white border border-gray-200 p-5 flex flex-col gap-3 h-full opacity-70">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded text-xl">{p.icon}</div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${BADGE_COLORS_PH[p.badge] || 'bg-gray-100 text-gray-700'}`}>{p.badge}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 leading-snug">{p.title}</p>
          </div>
        </motion.div>
      ))}
    </>
  );
}

export default function HomepageWhatsHappeningNow({ items = [] }) {
  return (
    <section className="bg-[#F5F9FA] border-b border-[#D8EAED] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-[#1DA1A1]" />
            <h2 className="text-lg font-black tracking-tight text-gray-900">What's Happening Now</h2>
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