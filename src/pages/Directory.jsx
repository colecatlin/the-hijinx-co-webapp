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
import ComingSoonPlaceholder from '@/components/directory/ComingSoonPlaceholder';
import { isEventPublic } from '@/components/system/publishHelpers';

const ACCENT = 'hsl(var(--motion))';
const ACCENT_MUTED = 'hsl(var(--motion-muted))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const DIV = 'hsl(var(--divider))';
const SURF = 'hsl(var(--surface-elevated))';

// Category registry — order = display order in the switcher.
// Phase rollout: only Racers (drivers) and Events are live; all other
// categories render a Coming Soon placeholder until their phase ships.
const CATEGORIES = [
  { key: 'drivers', label: 'Racers',  icon: Users,        Component: RacerDirectory },
  { key: 'teams',   label: 'Teams',   icon: Building2,    Component: TeamDirectory,   comingSoon: true },
  { key: 'tracks',  label: 'Tracks',  icon: MapPin,       Component: TrackDirectory,  comingSoon: true },
  { key: 'series',  label: 'Series',  icon: Trophy,       Component: SeriesHome,      comingSoon: true },
  { key: 'events',  label: 'Events',  icon: CalendarDays, Component: EventDirectory },
  { key: 'vehicles', label: 'Vehicles', icon: Truck,       Component: VehicleDirectory, comingSoon: true },
  { key: 'sponsors', label: 'Sponsors', icon: Handshake,    Component: SponsorDirectory, comingSoon: true },
  { key: 'creators', label: 'Creators', icon: Camera,      Component: CreatorDirectory, comingSoon: true },
  { key: 'outlets',  label: 'Outlets',  icon: Newspaper,    Component: MediaOutletDirectory, comingSoon: true },
];

const VALID_KEYS = new Set(CATEGORIES.map(c => c.key));

function useCount(entityName, options = {}) {
  return useQuery({
    queryKey: ['directory-count', entityName],
    queryFn: () => base44.entities[entityName].list('-created_date', 500),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: options.enabled !== false,
  });
}

export default function Directory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('cat');
  const [active, setActive] = useState(VALID_KEYS.has(rawCat) ? rawCat : 'drivers');

  // Live counts for the switcher pills. Coming Soon categories skip their
  // count query entirely (enabled: false) and show 'Soon' instead of a number.
  const drivers   = useCount('RacerProfile');
  const teams     = useCount('Team',     { enabled: false });
  const tracks    = useCount('Track',    { enabled: false });
  const series    = useCount('Series',   { enabled: false });
  const events    = useCount('Event');
  const vehicles  = useCount('Vehicle',  { enabled: false });
  const sponsors  = useQuery({ queryKey: ['directory-count', 'SponsorOrg'], queryFn: async () => { const all = await base44.entities.Organization.list('-created_date', 500); return all.filter(o => o.type === 'Sponsor' && !o.is_archived); }, staleTime: 10 * 60 * 1000, enabled: false });
  const creators  = useCount('MediaProfile', { enabled: false });
  const outlets   = useCount('MediaOutlet', { enabled: false });
  const counts = useMemo(() => ({
    drivers: drivers.data?.length,
    teams: 'Soon',
    tracks: 'Soon',
    series: 'Soon',
    events: events.data?.filter(isEventPublic).length,
    vehicles: 'Soon',
    sponsors: 'Soon',
    creators: 'Soon',
    outlets: 'Soon',
  }), [drivers.data, events.data]);

  const totalCount = Object.values(counts).reduce((a, n) => a + (typeof n === 'number' ? n : 0), 0);

  const activeCategory = CATEGORIES.find(c => c.key === active);
  const ActiveComponent = activeCategory?.Component;

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
            const isSoon = cat.comingSoon;
            return (
              <button
                key={cat.key}
                onClick={() => selectCategory(cat.key)}
                className="relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-black tracking-[0.12em] uppercase whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={{
                  background: isActive ? (isSoon ? 'hsl(var(--surface-interactive))' : ACCENT) : 'transparent',
                  color: isActive
                    ? (isSoon ? FG : '#fff')
                    : (isSoon ? FG_QUIET : FG_SEC),
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = ACCENT_MUTED; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {isSoon ? (
                  <span
                    className="font-mono text-[8px] tracking-[0.2em] px-1.5 py-0.5 rounded-md uppercase"
                    style={{
                      background: isActive ? ACCENT : 'hsl(var(--motion-muted))',
                      color: isActive ? '#fff' : ACCENT,
                    }}
                  >
                    Soon
                  </span>
                ) : count != null && (
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
      <div className="px-5 sm:px-8 md:px-12 lg:px-20 pt-2 pb-20">
        <div key={active} className="-mx-5 sm:-mx-8 md:-mx-12 lg:-mx-20">
          {activeCategory?.comingSoon ? (
            <ComingSoonPlaceholder category={activeCategory} />
          ) : (
            ActiveComponent && <ActiveComponent />
          )}
        </div>
      </div>
    </div>
  );
}