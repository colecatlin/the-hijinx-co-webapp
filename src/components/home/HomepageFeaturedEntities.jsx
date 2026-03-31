import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getEntityProfileUrl } from '@/components/utils/routingContract';
import { getDriverProfileUrl } from '@/lib/driverUrl';
import { ArrowRight, Users, MapPin, Trophy, Calendar, Flag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import DriverCard from '@/components/drivers/DriverCard';

// ── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'drivers', label: 'Drivers', Icon: Users,    page: 'DriverDirectory' },
  { id: 'teams',   label: 'Teams',   Icon: Flag,     page: 'TeamDirectory' },
  { id: 'tracks',  label: 'Tracks',  Icon: MapPin,   page: 'TrackDirectory' },
  { id: 'series',  label: 'Series',  Icon: Trophy,   page: 'SeriesHome' },
  { id: 'events',  label: 'Events',  Icon: Calendar, page: 'EventDirectory' },
];

// ── Generic entity mini-card ──────────────────────────────────────────────────
// imageType: 'photo' (object-cover), 'logo' (centered on dark bg), 'none' (texture fallback)
function EntityCard({ name, sub, imageUrl, imageType = 'photo', fallbackIcon: FallbackIcon, href }) {
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?';

  const renderImage = () => {
    if (imageType === 'logo' && imageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0D1117] to-[#1A2030] p-6">
          <img src={imageUrl} alt={name} className="max-h-full max-w-full object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-400" loading="lazy" />
        </div>
      );
    }
    if (imageType === 'photo' && imageUrl) {
      return (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500" loading="lazy" />
      );
    }
    // Branded texture fallback
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0D1117] via-[#111827] to-[#0A1628] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00FFDA 0, #00FFDA 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FFDA]/50 to-transparent" />
        {FallbackIcon ? (
          <FallbackIcon className="w-8 h-8 text-[#00FFDA]/30 mb-2" />
        ) : (
          <span className="text-2xl font-black text-white/20 tracking-tight">{initials}</span>
        )}
      </div>
    );
  };

  return (
    <Link
      to={href}
      className="group bg-white border border-gray-200 hover:border-[#1DA1A1]/60 hover:shadow-[0_4px_20px_rgba(29,161,161,0.1)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="aspect-[16/9] overflow-hidden bg-[#0D1117]">
        {renderImage()}
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
  drivers = [], teams = [], tracks = [], series = [], events = [],
  allSeries = [], programsByDriver = {}, mediaByDriver = {},
  isLoading = false,
}) {
  const allEmpty = !isLoading && !drivers.length && !teams.length && !tracks.length && !series.length && !events.length;
  const [activeTab, setActiveTab] = useState('drivers');
  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white py-16 md:py-24 border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#1DA1A1]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#008080] uppercase font-bold">Discovery</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
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
            ) : activeTab === 'teams' ? (
              teams.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {teams.map((team, i) => (
                    <motion.div key={team.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <EntityCard
                        name={team.name}
                        sub={[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ') || team.primary_discipline}
                        imageUrl={team.logo_url}
                        imageType="logo"
                        fallbackIcon={Flag}
                        href={getEntityProfileUrl('Team', team)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState tab="teams" page="TeamDirectory" />
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
                        imageType={track.image_url ? 'photo' : 'logo'}
                        fallbackIcon={MapPin}
                        href={getEntityProfileUrl('Track', track)}
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
                        imageUrl={s.banner_url || s.logo_url}
                        imageType={s.banner_url ? 'photo' : 'logo'}
                        fallbackIcon={Trophy}
                        href={getEntityProfileUrl('Series', s)}
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
                        fallbackIcon={Calendar}
                        href={getEntityProfileUrl('Event', ev)}
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
    </motion.section>
  );
}

const TAB_BROWSE_LABELS = {
  drivers: 'Browse Drivers',
  teams:   'Browse Teams',
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