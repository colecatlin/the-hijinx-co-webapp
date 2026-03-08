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
      className="group border border-white/5 hover:border-[#00FFDA]/25 bg-[#0C0C0C] hover:bg-[#0F0F0F] transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="aspect-[16/9] overflow-hidden bg-[#161616]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/5" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h4 className="text-sm font-bold text-white/70 group-hover:text-white transition-colors tracking-tight leading-snug line-clamp-2">
          {name}
        </h4>
        {sub && (
          <p className="font-mono text-[9px] tracking-[0.2em] text-white/25 uppercase line-clamp-1">{sub}</p>
        )}
        <div className="flex items-center gap-1 mt-auto pt-2 text-[10px] font-bold text-[#00FFDA]/30 group-hover:text-[#00FFDA]/70 uppercase tracking-wider transition-colors">
          View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default function HomepageFeaturedEntities() {
  const [activeTab, setActiveTab] = useState('drivers');

  // Drivers
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['featuredDriversHome'],
    queryFn: () => base44.entities.Driver.filter({ featured: true, profile_status: 'live' }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.slice(0, 4),
  });
  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
    select: (d) => d.slice(0, 8),
  });
  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Tracks
  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['featuredTracksHome'],
    queryFn: () => base44.entities.Track.filter({ status: 'Active' }, '-created_date', 8),
    staleTime: 10 * 60 * 1000,
    select: (d) => d.slice(0, 8),
  });

  // Events
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['featuredEventsHome'],
    queryFn: () => base44.entities.Event.filter({ status: 'Published' }, '-event_date', 8),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.slice(0, 8),
  });

  const programsByDriver = useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const mediaByDriver = useMemo(() => {
    const map = {};
    allMedia.forEach(m => { map[m.driver_id] = m; });
    return map;
  }, [allMedia]);

  const activeTabConfig = TABS.find(t => t.id === activeTab);
  const isLoading = activeTab === 'drivers' ? loadingDrivers
    : activeTab === 'tracks' ? loadingTracks
    : activeTab === 'events' ? loadingEvents
    : false;

  return (
    <section className="bg-white py-20 md:py-28 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#232323]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#232323]/35 uppercase">Discovery</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#232323] tracking-tight">
              Featured Motorsports
            </h2>
          </div>
          <Link
            to={createPageUrl(activeTabConfig?.page || 'MotorsportsHome')}
            className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-[#232323]/30 hover:text-[#00FFDA] transition-colors uppercase self-end"
          >
            View All <ArrowRight className="w-3 h-3" />
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
                    ? 'bg-[#232323] text-white border-[#232323]'
                    : 'border-gray-200 text-[#232323]/40 hover:border-[#232323]/30 hover:text-[#232323]/70'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
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
              allSeries.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allSeries.map((s, i) => (
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
                        sub={ev.series_name || ev.event_date}
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

        {/* Mobile view-all */}
        <div className="mt-8 sm:hidden">
          <Link
            to={createPageUrl(activeTabConfig?.page || 'MotorsportsHome')}
            className="flex items-center justify-center gap-2 border border-[#232323]/10 hover:border-[#00FFDA] py-3.5 text-xs font-bold tracking-wider uppercase text-[#232323]/40 hover:text-[#00FFDA] transition-all"
          >
            View All {activeTabConfig?.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ tab, page }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200">
      <p className="text-sm text-gray-400 mb-3">No featured {tab} yet</p>
      <Link
        to={createPageUrl(page)}
        className="text-xs font-bold text-[#00FFDA] hover:underline flex items-center gap-1"
      >
        Browse all {tab} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}