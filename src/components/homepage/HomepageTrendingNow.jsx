/**
 * HomepageTrendingNow
 * Compact, bright, tab-driven trending section — white background.
 * Shows top drivers, tracks, series, and upcoming events as scannable pill rows.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { TrendingUp, User, MapPin, Trophy, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const TABS = [
  { key: 'drivers', label: 'Drivers',  icon: User,      href: createPageUrl('DriverDirectory'),  cta: 'Browse Drivers' },
  { key: 'tracks',  label: 'Tracks',   icon: MapPin,    href: createPageUrl('TrackDirectory'),   cta: 'Browse Tracks'  },
  { key: 'series',  label: 'Series',   icon: Trophy,    href: createPageUrl('SeriesHome'),       cta: 'Browse Series'  },
  { key: 'events',  label: 'Events',   icon: Calendar,  href: createPageUrl('EventDirectory'),   cta: 'Browse Events'  },
];

function DriverRow({ item, index }) {
  const href = item.slug
    ? `${createPageUrl('DriverProfile')}?slug=${item.slug}`
    : `${createPageUrl('DriverProfile')}?id=${item.id}`;
  const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || '—';
  const meta = [item.primary_discipline, item.career_status].filter(Boolean).join(' · ');
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={href} className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
        <span className="font-mono text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{index + 1}</span>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.image ? <img src={item.image} alt={name} className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#1DA1A1] transition-colors">{name}</p>
          {meta && <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>}
        </div>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#1DA1A1] transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

function TrackRow({ item, index }) {
  const href = item.slug ? `${createPageUrl('TrackProfile')}?slug=${item.slug}` : `${createPageUrl('TrackProfile')}?id=${item.id}`;
  const meta = [item.location_city, item.location_state].filter(Boolean).join(', ');
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={href} className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
        <span className="font-mono text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{index + 1}</span>
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <MapPin className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#1DA1A1] transition-colors">{item.name}</p>
          {meta && <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>}
        </div>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#1DA1A1] transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

function SeriesRow({ item, index }) {
  const href = item.slug ? `${createPageUrl('SeriesDetail')}?slug=${item.slug}` : `${createPageUrl('SeriesDetail')}?id=${item.id}`;
  const meta = [item.discipline, item.geographic_scope].filter(Boolean).join(' · ');
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={href} className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
        <span className="font-mono text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{index + 1}</span>
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.logo_url ? <img src={item.logo_url} alt={item.name} className="w-full h-full object-cover" /> : <Trophy className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#1DA1A1] transition-colors">{item.name}</p>
          {meta && <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>}
        </div>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#1DA1A1] transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

function EventRow({ item, index }) {
  const href = `${createPageUrl('EventProfile')}?id=${item.id}`;
  let dateStr = null;
  try { dateStr = item.event_date ? format(parseISO(item.event_date), 'MMM d') : null; } catch (_) { dateStr = item.event_date; }
  const meta = [dateStr, item.series_name].filter(Boolean).join(' · ');
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={href} className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
        <span className="font-mono text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{index + 1}</span>
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#1DA1A1] transition-colors line-clamp-1">{item.name}</p>
          {meta && <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>}
        </div>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#1DA1A1] transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

const EMPTY_MSG = {
  drivers: 'As the platform grows, active drivers will appear here.',
  tracks:  'As the platform grows, active tracks will appear here.',
  series:  'As the platform grows, active series will appear here.',
  events:  'Upcoming events will appear here.',
};

function TabContent({ tab, drivers, tracks, series, events }) {
  const items = { drivers, tracks, series, events }[tab] || [];
  const Empty = () => (
    <div className="px-3 py-8 text-center">
      <p className="text-xs text-gray-400">{EMPTY_MSG[tab]}</p>
    </div>
  );

  if (items.length === 0) return <Empty />;

  return (
    <div>
      {tab === 'drivers' && items.slice(0, 8).map((d, i) => <DriverRow key={d.id || i} item={d} index={i} />)}
      {tab === 'tracks'  && items.slice(0, 8).map((t, i) => <TrackRow  key={t.id || i} item={t} index={i} />)}
      {tab === 'series'  && items.slice(0, 8).map((s, i) => <SeriesRow key={s.id || i} item={s} index={i} />)}
      {tab === 'events'  && items.slice(0, 8).map((e, i) => <EventRow  key={e.id || i} item={e} index={i} />)}
    </div>
  );
}

export default function HomepageTrendingNow({ drivers = [], tracks = [], series = [], events = [], isLoading = false }) {
  const [activeTab, setActiveTab] = useState('drivers');
  const activeConfig = TABS.find((t) => t.key === activeTab);

  return (
    <section className="bg-white border-b border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-[#1DA1A1]" />
            <h2 className="text-base font-black tracking-tight text-gray-900 uppercase">Trending Now</h2>
          </div>
          {activeConfig && (
            <Link
              to={activeConfig.href}
              className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#1DA1A1] hover:text-[#158888] transition-colors"
            >
              {activeConfig.cta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tab list — left on desktop, top on mobile */}
          <div className="lg:col-span-1">
            {/* Mobile: horizontal tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:hidden mb-4">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wide whitespace-nowrap border transition-all ${
                      active
                        ? 'bg-[#1DA1A1] text-white border-[#1DA1A1]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop: vertical tab list */}
            <div className="hidden lg:flex flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold text-left border transition-all ${
                      active
                        ? 'bg-[#1DA1A1] text-white border-[#1DA1A1]'
                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content panel */}
          <div className="lg:col-span-2">
            <div className="border border-gray-100 bg-white">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-5 h-5 border-2 border-[#1DA1A1] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabContent
                      tab={activeTab}
                      drivers={drivers}
                      tracks={tracks}
                      series={series}
                      events={events}
                    />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}