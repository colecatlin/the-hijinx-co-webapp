import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, Users, MapPin, Trophy, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import DriverCard from '@/components/drivers/DriverCard';

// ── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'drivers', label: 'Drivers', Icon: Users,    page: 'DriverDirectory' },
  { id: 'tracks',  label: 'Tracks',  Icon: MapPin,   page: 'TrackDirectory' },
  { id: 'series',  label: 'Series',  Icon: Trophy,   page: 'SeriesHome' },
  { id: 'events',  label: 'Events',  Icon: Calendar, page: 'EventDirectory' },
];

// ── Generic entity mini-card for tracks / series / events ──────────────────
function EntityCard({ name, sub, imageUrl, linkPage, linkId }) {
  const href = linkId ? `${createPageUrl(linkPage)}?id=${linkId}` : createPageUrl(linkPage);
  return (
    <Link
      to={href}
      className="group bg-white border border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="aspect-[16/9] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#1DA1A1] transition-colors tracking-tight leading-snug line-clamp-2">
          {name}
        </h4>
        {sub && (
          <p className="font-mono text-[9px] tracking-[0.2em] text-gray-400 uppercase line-clamp-1">{sub}</p>
        )}
        <div className="flex items-center gap-1 mt-auto pt-2 text-[10px] font-bold text-gray-400 group-hover:text-[#1DA1A1] uppercase tracking-wider transition-colors">
          View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default function HomepageFeaturedEntities({
  drivers = [], tracks = [], series = [], events = [],
  allSeries = [], programsByDriver = {}, mediaByDriver = {},
  isLoading = false,
}) {
  const allEmpty = !isLoading && !drivers.length && !tracks.length && !series.length && !events.length;
  const [activeTab, setActiveTab] = useState('drivers');
  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <section className="bg-[#F5F9FA] py-16 md:py-24 border-b border-[#E0EDEF]">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#232323]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#008080] uppercase font-bold">Discovery</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#111] tracking-tight">
              Featured Motorsports
            </h2>
          </div>
          <Link
            to={createPageUrl(activeTabConfig?.page || 'MotorsportsHome')}
            className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-gray-500 hover:text-[#1DA1A1] transition-colors uppercase self-end font-bold"
          >
            Explore Motorsports <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const TabIcon = tab.Icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
                  active
                    ? 'bg-[#1DA1A1] text-white border-[#1DA1A1] shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#1DA1A1] hover:text-[#1DA1A1] hover:bg-[#F0FAFA]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* All-empty discovery fallback */}
        {allEmpty && <AllEmptyDiscovery />}

        {/* Tab content */}
        {!allEmpty && (
          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[260px]" />)}
              </div>
            ) : activeTab === 'drivers' ? (
              drivers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {drivers.map((driver, i) => (
                    <motion.div key={driver.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <DriverCard
                        driver={driver}
                        programs={programsByDriver[driver.id] || []}
                        media={mediaByDriver[driver.id]}
                        allSeries={allSeries}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState tab="drivers" page="DriverDirectory" />
              )
            ) : activeTab === 'tracks' ? (
              tracks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tracks.map((track, i) => (
                    <motion.div key={track.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <EntityCard
                        name={track.name}
                        sub={[track.location_city, track.location_state].filter(Boolean).join(', ')}
                        imageUrl={track.image_url || track.logo_url}
                        linkPage="TrackDirectory"
                        linkId={track.id}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState tab="tracks" page="TrackDirectory" />
              )
            ) : activeTab === 'series' ? (
              series.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {series.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <EntityCard
                        name={s.name}
                        sub={s.discipline}
                        imageUrl={s.logo_url || s.banner_url}
                        linkPage="SeriesHome"
                        linkId={s.id}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState tab="series" page="SeriesHome" />

              )
            ) : activeTab === 'events' ? (
              events.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {events.map((ev, i) => (
                    <motion.div key={ev.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <EntityCard
                        name={ev.name}
                        sub={ev.series_name || (ev.event_date && !isNaN(new Date(ev.event_date)) ? new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null)}
                        imageUrl={null}
                        linkPage="EventDirectory"
                        linkId={ev.id}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState tab="events" page="EventDirectory" />
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
        )}

        {/* Mobile view-all */}
        <div className="mt-8 sm:hidden">
          <Link
            to={createPageUrl(activeTabConfig?.page || 'MotorsportsHome')}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-[#1DA1A1] hover:bg-[#F0FAFA] py-3.5 text-xs font-bold tracking-wider uppercase text-gray-500 hover:text-[#1DA1A1] transition-all"
          >
            {TAB_BROWSE_LABELS[activeTab] || 'Explore Motorsports'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

const TAB_BROWSE_LABELS = {
  drivers: 'Browse Drivers',
  tracks:  'Browse Tracks',
  series:  'Browse Series',
  events:  'Explore Motorsports',
};

function EmptyState({ tab, page }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 text-center px-6">
      <p className="text-sm text-gray-500 font-semibold mb-1">Nothing here yet</p>
      <p className="text-xs text-gray-400 mb-4 max-w-xs leading-relaxed">
        As activity grows, featured {tab} will appear here.
      </p>
      <Link
        to={createPageUrl(page)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00FFDA] hover:underline uppercase tracking-wider"
      >
        {TAB_BROWSE_LABELS[tab] || `Browse ${tab}`} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function AllEmptyDiscovery() {
  return (
    <div className="border border-dashed border-gray-300 p-12 text-center">
      <p className="text-sm font-bold text-gray-500 mb-2">The motorsports platform is growing</p>
      <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
        As activity grows, trending drivers, tracks, series, and events will appear here.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {[
          { label: 'Browse Drivers', page: 'DriverDirectory' },
          { label: 'Browse Tracks',  page: 'TrackDirectory' },
          { label: 'Browse Series',  page: 'SeriesHome' },
        ].map(({ label, page }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 hover:border-[#00FFDA] text-xs font-bold text-gray-500 hover:text-[#008080] uppercase tracking-wider transition-all"
          >
            {label} <ArrowRight className="w-3 h-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}