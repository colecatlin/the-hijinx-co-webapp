/**
 * HomepageTrendingNow
 * Compact, bright, tab-driven trending section — white background.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { TrendingUp, User, MapPin, Trophy, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const TABS = [
  { key: 'drivers', label: 'Drivers', icon: User,     href: createPageUrl('DriverDirectory'), cta: 'Browse Drivers' },
  { key: 'tracks',  label: 'Tracks',  icon: MapPin,   href: createPageUrl('TrackDirectory'),  cta: 'Browse Tracks'  },
  { key: 'series',  label: 'Series',  icon: Trophy,   href: createPageUrl('SeriesHome'),      cta: 'Browse Series'  },
  { key: 'events',  label: 'Events',  icon: Calendar, href: createPageUrl('EventDirectory'),  cta: 'Explore Motorsports' },
];

const EMPTY_MSG = {
  drivers: 'As activity grows, trending drivers will appear here.',
  tracks:  'As activity grows, trending tracks will appear here.',
  series:  'As activity grows, trending series will appear here.',
  events:  'Upcoming events will appear here as the schedule fills in.',
};

function RowShell({ href, index, children }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
      <Link to={href} className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
        <span className="font-mono text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{index + 1}</span>
        {children}
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-[#1DA1A1] transition-colors flex-shrink-0" />
      </Link>
    </motion.div>
  );
}

function Avatar({ src, alt, Icon }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : <Icon className="w-3.5 h-3.5 text-gray-400" />}
    </div>
  );
}

function ItemMeta({ name, meta }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-[#1DA1A1] transition-colors line-clamp-1">{name}</p>
      {meta && <p className="text-[10px] text-gray-400 mt-0.5">{meta}</p>}
    </div>
  );
}

function TabContent({ tab, drivers, tracks, series, events }) {
  const dataMap = { drivers, tracks, series, events };
  const items = dataMap[tab] || [];

  if (items.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-xs text-gray-400">{EMPTY_MSG[tab]}</p>
      </div>
    );
  }

  return (
    <div>
      {tab === 'drivers' && items.slice(0, 8).map((d, i) => {
        const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.name || '—';
        const href = d.slug ? `${createPageUrl('DriverProfile')}?slug=${d.slug}` : `${createPageUrl('DriverProfile')}?id=${d.id}`;
        return (
          <RowShell key={d.id || i} href={href} index={i}>
            <Avatar src={d.image} alt={name} Icon={User} />
            <ItemMeta name={name} meta={[d.primary_discipline, d.career_status].filter(Boolean).join(' · ')} />
          </RowShell>
        );
      })}
      {tab === 'tracks' && items.slice(0, 8).map((t, i) => {
        const href = t.slug ? `${createPageUrl('TrackProfile')}?slug=${t.slug}` : `${createPageUrl('TrackProfile')}?id=${t.id}`;
        return (
          <RowShell key={t.id || i} href={href} index={i}>
            <Avatar src={t.image_url} alt={t.name} Icon={MapPin} />
            <ItemMeta name={t.name} meta={[t.location_city, t.location_state].filter(Boolean).join(', ')} />
          </RowShell>
        );
      })}
      {tab === 'series' && items.slice(0, 8).map((s, i) => {
        const href = s.slug ? `${createPageUrl('SeriesDetail')}?slug=${s.slug}` : `${createPageUrl('SeriesDetail')}?id=${s.id}`;
        return (
          <RowShell key={s.id || i} href={href} index={i}>
            <Avatar src={s.logo_url} alt={s.name} Icon={Trophy} />
            <ItemMeta name={s.name} meta={[s.discipline, s.geographic_scope].filter(Boolean).join(' · ')} />
          </RowShell>
        );
      })}
      {tab === 'events' && items.slice(0, 8).map((e, i) => {
        let dateStr = null;
        try { dateStr = e.event_date ? format(parseISO(e.event_date), 'MMM d') : null; } catch (_) { dateStr = e.event_date; }
        const href = `${createPageUrl('EventProfile')}?id=${e.id}`;
        return (
          <RowShell key={e.id || i} href={href} index={i}>
            <Avatar src={null} alt={e.name} Icon={Calendar} />
            <ItemMeta name={e.name} meta={[dateStr, e.series_name].filter(Boolean).join(' · ')} />
          </RowShell>
        );
      })}
    </div>
  );
}

export default function HomepageTrendingNow({ drivers = [], tracks = [], series = [], events = [], isLoading = false }) {
  const [activeTab, setActiveTab] = useState('drivers');
  const activeConfig = TABS.find((t) => t.key === activeTab);

  return (
    <section className="bg-white border-b border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-[#1DA1A1]" />
            <h2 className="text-base font-black tracking-tight text-gray-900 uppercase">Trending Now</h2>
          </div>
          {activeConfig && (
            <Link to={activeConfig.href} className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#1DA1A1] hover:text-[#158888] transition-colors">
              {activeConfig.cta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tab buttons */}
          <div className="lg:col-span-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:hidden mb-4 pb-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wide whitespace-nowrap border transition-all ${active ? 'bg-[#1DA1A1] text-white border-[#1DA1A1]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                    <Icon className="w-3 h-3" />{tab.label}
                  </button>
                );
              })}
            </div>
            <div className="hidden lg:flex flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold text-left border transition-all ${active ? 'bg-[#1DA1A1] text-white border-[#1DA1A1]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}>
                    <Icon className="w-4 h-4" />{tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content panel */}
          <div className="lg:col-span-2 border border-gray-100 bg-white">
            {isLoading ? (
              <div className="divide-y divide-gray-50">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-3">
                    <Skeleton className="w-5 h-3 rounded" />
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-3/4 mb-1.5" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <TabContent tab={activeTab} drivers={drivers} tracks={tracks} series={series} events={events} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}