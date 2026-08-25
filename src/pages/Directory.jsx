import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import SeoMeta from '@/components/system/seoMeta';
import {
  Users, Building2, MapPin, Trophy, CalendarDays, Database, ArrowRight, Camera, Newspaper, Truck, Handshake,
} from 'lucide-react';
import RacerDirectory from './RacerDirectory';
import TeamDirectory from './TeamDirectory';
import TrackDirectory from './TrackDirectory';
import SeriesHome from './SeriesHome';
import EventDirectory from './EventDirectory';
import CreatorDirectory from './CreatorDirectory';
import MediaOutletDirectory from './MediaOutletDirectory';
import VehicleDirectory from './VehicleDirectory';
import SponsorDirectory from './SponsorDirectory';
import { isEventPublic } from '@/components/system/publishHelpers';

const ACCENT = 'hsl(var(--motion))';
const ACCENT_MUTED = 'hsl(var(--motion-muted))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const DIV = 'hsl(var(--divider))';
const SURF = 'hsl(var(--surface-elevated))';

// Category registry — order = display order in the switcher
const CATEGORIES = [
  { key: 'drivers', label: 'Racers',  icon: Users,        Component: RacerDirectory },
  { key: 'teams',   label: 'Teams',   icon: Building2,    Component: TeamDirectory },
  { key: 'tracks',  label: 'Tracks',  icon: MapPin,       Component: TrackDirectory },
  { key: 'series',  label: 'Series',  icon: Trophy,       Component: SeriesHome },
  { key: 'events',  label: 'Events',  icon: CalendarDays, Component: EventDirectory },
  { key: 'vehicles', label: 'Vehicles', icon: Truck,       Component: VehicleDirectory },
  { key: 'sponsors', label: 'Sponsors', icon: Handshake,    Component: SponsorDirectory },
  { key: 'creators', label: 'Creators', icon: Camera,      Component: CreatorDirectory },
  { key: 'outlets',  label: 'Outlets',  icon: Newspaper,    Component: MediaOutletDirectory },
];

const VALID_KEYS = new Set(CATEGORIES.map(c => c.key));

function useCount(entityName) {
  return useQuery({
    queryKey: ['directory-count', entityName],
    queryFn: () => base44.entities[entityName].list('-created_date', 500),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export default function Directory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('cat');
  const [active, setActive] = useState(VALID_KEYS.has(rawCat) ? rawCat : 'drivers');

  // Live counts for the switcher pills (+ monthly nuance skipped for simplicity here)
  const drivers   = useCount('RacerProfile');
  const teams     = useCount('Team');
  const tracks    = useCount('Track');
  const series    = useCount('Series');
  const events    = useCount('Event');
  const vehicles  = useCount('Vehicle');
  const sponsors  = useQuery({ queryKey: ['directory-count', 'SponsorOrg'], queryFn: async () => { const all = await base44.entities.Organization.list('-created_date', 500); return all.filter(o => o.type === 'Sponsor' && !o.is_archived); }, staleTime: 10 * 60 * 1000 });
  const creators  = useCount('MediaProfile');
  const outlets   = useCount('MediaOutlet');
  const counts = useMemo(() => ({
    drivers: drivers.data?.length,
    teams: teams.data?.length,
    tracks: tracks.data?.length,
    series: series.data?.length,
    events: events.data?.filter(isEventPublic).length,
    vehicles: vehicles.data?.filter(v => v.visibility_status !== 'draft' && !v.is_archived)?.length,
    sponsors: sponsors.data?.length,
    creators: creators.data?.length,
    outlets: outlets.data?.length,
  }), [drivers.data, teams.data, tracks.data, series.data, events.data, vehicles.data, sponsors.data, creators.data, outlets.data]);

  const totalCount = Object.values(counts).reduce((a, n) => a + (n || 0), 0);

  const ActiveComponent = CATEGORIES.find(c => c.key === active)?.Component;

  const selectCategory = (key) => {
    setActive(key);
    setSearchParams({ cat: key }, { replace: true });
  };

  return (
    <div className="relative hijinx-canvas-bg" style={{ minHeight: '100vh' }}>
      <SeoMeta
        title="Directory · INDEX46"
        description="The INDEX46 directory — a master database of drivers, teams, tracks, series, events and media."
      />

      {/* ── MASTHEAD ── */}
      <div className="px-5 sm:px-8 md:px-12 lg:px-20 pt-20 md:pt-24 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
          <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>Index46 · Directory</span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-[0.95]"
          style={{ color: FG }}
        >
          The Directory.
        </motion.h1>
        <p className="mt-3 text-sm sm:text-base max-w-2xl leading-relaxed" style={{ color: FG_SEC }}>
          One master database for the entire ecosystem — drivers, teams, tracks, series, events and media. Pick a category and start exploring.
        </p>
        <div className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: FG_QUIET }}>
          <Database className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          {totalCount.toLocaleString()} records indexed
        </div>
      </div>

      {/* ── CATEGORY SWITCHER (in-flow, above search/filters) ── */}
      <div
        className="mx-3 sm:mx-4 mb-2 rounded-2xl"
        style={{
          background: 'hsl(var(--surface-elevated))',
          border: `1px solid ${DIV}`,
          boxShadow: '0 8px 28px hsl(0 0% 0% / 0.10)',
        }}
      >
        <div className="flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = cat.key === active;
            const count = counts[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => selectCategory(cat.key)}
                className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-black tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={{
                  background: isActive ? ACCENT : 'transparent',
                  color: isActive ? '#fff' : FG_SEC,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = ACCENT_MUTED; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {count != null && (
                  <span
                    className="font-mono text-[9px] tracking-normal px-1.5 py-0.5 rounded-md"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.22)' : 'hsl(var(--surface-interactive))',
                      color: isActive ? '#fff' : FG_QUIET,
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE CATEGORY CONTENT ── */}
      <div className="px-5 sm:px-8 md:px-12 lg:px-20 pt-6 pb-20">
        <div key={active} className="-mx-5 sm:-mx-8 md:-mx-12 lg:-mx-20">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}