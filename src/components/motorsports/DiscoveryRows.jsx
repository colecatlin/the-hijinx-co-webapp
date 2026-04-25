import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, ChevronRight, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(startStr, endStr) {
  if (!startStr) return null;
  const s = new Date(startStr);
  const month = s.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const startDay = s.getDate();
  if (!endStr) return `${month} ${startDay}`;
  const e = new Date(endStr);
  const endDay = e.getDate();
  return `${month} ${startDay}-${endDay}`;
}

function Placeholder({ char }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <span className="text-white/20 text-3xl font-black uppercase">{char}</span>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label, viewAllHref }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-white font-black text-sm uppercase tracking-widest">{label}</h2>
      {viewAllHref && (
        <Link to={viewAllHref} className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-[#1DA1A1] transition-colors uppercase tracking-wider">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── Scroll Row ────────────────────────────────────────────────────────────────

function ScrollRow({ children, isLoading, aspectRatio = '3/2' }) {
  const ref = useRef(null);
  return (
    <div ref={ref} className="flex gap-3">
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-xl animate-pulse bg-white/5" style={{ aspectRatio }} />
          ))
        : children}
    </div>
  );
}

// ── Driver Card ───────────────────────────────────────────────────────────────

function DriverCard({ driver }) {
  const name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
  const img = driver.profile_image_url || driver.hero_image_url;
  const slug = driver.slug || driver.id;

  return (
    <Link to={`/drivers/${slug}`} className="flex-1 min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full rounded-xl overflow-hidden relative cursor-pointer"
        style={{ aspectRatio: '3/2', background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}
      >
        {/* Background image */}
        {img && (
          <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover object-top opacity-60" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }} />

        {/* Number */}
        {driver.primary_number && (
          <div className="absolute top-2 left-3 font-black text-white text-2xl leading-none opacity-90">
            {driver.primary_number}
          </div>
        )}

        {/* Name + class */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-white font-bold text-xs leading-tight truncate">{name}</div>
          {driver.primary_discipline && (
            <div className="text-white/50 text-[9px] truncate mt-0.5">{driver.primary_discipline}</div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team }) {
  const img = team.logo_url;

  return (
    <Link to={`/TeamProfile?id=${team.id}`} className="flex-1 min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full rounded-xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/2', background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-1 flex items-center justify-center bg-white/95 px-4">
          {img
            ? <img src={img} alt={team.name} className="w-full h-full object-contain" />
            : <span className="text-black font-black text-lg">{(team.name || 'T')[0]}</span>
          }
        </div>
        <div className="px-3 py-2">
          <div className="text-white font-bold text-xs truncate">{team.name}</div>
          {team.primary_discipline && (
            <div className="text-white/40 text-[9px] truncate mt-0.5">{team.primary_discipline}</div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Track Grid Card (matches event item height) ───────────────────────────────

function TrackGridCard({ track }) {
  const img = track.image_url;
  const city = track.location_city;
  const state = track.location_state;
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <Link to={`/TrackProfile?id=${track.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="relative rounded-lg overflow-hidden cursor-pointer"
        style={{ height: '72px', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 10px rgba(255,255,255,0.06)' }}
      >
        {/* Full-bleed image */}
        {img
          ? <img src={img} alt={track.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0"><Placeholder char={(track.name || 'T')[0]} /></div>
        }
        {/* Gradient overlay from bottom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)' }} />
        {/* Text pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
          <div
            className="text-white font-black text-xs leading-tight"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
          >
            {track.name}
          </div>
          {location && (
            <div className="flex items-center gap-1 mt-0.5" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <MapPin className="w-2 h-2 flex-shrink-0 text-white/40" />
              <span className="text-white/40 text-[9px]">{location}</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Track Card ────────────────────────────────────────────────────────────────

function TrackCard({ track }) {
  const img = track.image_url;
  const city = track.location_city;
  const state = track.location_state;
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <Link to={`/TrackProfile?id=${track.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full rounded-xl overflow-hidden cursor-pointer relative"
        style={{ aspectRatio: '2/3', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}
      >
        {/* Full-bleed image */}
        {img
          ? <img src={img} alt={track.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0"><Placeholder char={(track.name || 'T')[0]} /></div>
        }
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2.5">
          <div className="text-white font-bold text-xs leading-tight truncate">{track.name}</div>
          {location && (
            <div className="flex items-center gap-1 text-white/50 text-[9px] mt-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {location}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Event List Row ─────────────────────────────────────────────────────────────

function EventListItem({ event }) {
  const dateRange = formatDateRange(event.event_date, event.end_date);
  const [month, days] = dateRange ? dateRange.split(' ') : ['', ''];

  return (
    <Link to={`/EventProfile?id=${event.id}`}>
      <motion.div
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        className="flex items-center gap-4 px-4 py-4 rounded-lg transition-colors cursor-pointer"
        style={{ border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 10px rgba(255,255,255,0.06)' }}
      >
        {/* Date */}
        <div className="flex-shrink-0 text-center w-14">
          <div className="text-[#1DA1A1] font-black text-[10px] uppercase tracking-wider">{month}</div>
          <div className="text-white font-black text-lg leading-none">{days}</div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 flex-shrink-0" />

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-xs leading-tight truncate">{event.name}</div>
          {(event.location_note || '') && (
            <div className="text-white/40 text-[9px] mt-0.5 truncate">{event.location_note}</div>
          )}
        </div>

        {/* Class badge */}
        {event.series_name && (
          <div className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white/60"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {event.series_name.split(' ').slice(0, 2).join(' ')}
          </div>
        )}
      </motion.div>
    </Link>
  );
}

// ── Series Spotlight ──────────────────────────────────────────────────────────

function SeriesSpotlightCard({ series }) {
  return (
    <Link to={`/series/${series.slug || series.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}
      >
        {series.logo_url && (
          <img src={series.logo_url} alt={series.name} className="w-16 h-16 object-contain flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{series.name}</div>
          {series.description && (
            <div className="text-white/50 text-[10px] mt-1 line-clamp-2">{series.description}</div>
          )}
          <div className="mt-2 text-[#1DA1A1] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            Explore Series <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <div className="mx-8 md:mx-12 lg:mx-20 my-6 rounded-2xl overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #111 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)' }} />
      <div className="relative flex flex-col md:flex-row items-center justify-between px-8 py-8 gap-6">
        <div>
          <h2 className="text-white font-black text-2xl md:text-3xl uppercase leading-tight">
            GET ON THE GRID.
          </h2>
          <p className="font-black italic text-[#1DA1A1] text-lg uppercase mt-1">
            THIS IS YOUR WORLD. BE PART OF IT.
          </p>
          <p className="text-white/50 text-xs mt-2 max-w-sm">
            Race Core is the center of motorsports data. Create your profile, manage your results, connect with teams, events, and more.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link to="/DriverProfileSetup"
            className="px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-[#050A0A] transition-all hover:brightness-110"
            style={{ background: '#1DA1A1' }}>
            Create Profile
          </Link>
          <Link to="/MotorsportsHome"
            className="px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            Explore First
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DiscoveryRows() {
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['discovery-drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(dr => dr.visibility_status === 'live').slice(0, 5),
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['discovery-teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(t => t.visibility_status === 'live').slice(0, 5),
  });

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['discovery-tracks'],
    queryFn: () => base44.entities.Track.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(t => t.visibility_status === 'live').slice(0, 20),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['discovery-events'],
    queryFn: () => base44.entities.Event.list('-event_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = d.filter(e => e.event_date >= today && e.public_status !== 'archived');
      return (upcoming.length >= 4 ? upcoming : d).slice(0, 5);
    },
  });

  const { data: series = [], isLoading: loadingSeries } = useQuery({
    queryKey: ['discovery-series'],
    queryFn: () => base44.entities.Series.list('-created_date', 10),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(s => s.visibility_status === 'live').slice(0, 1),
  });

  const rowStyle = {
    borderTop: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <div className="relative z-10 bg-[#080C0C]">

      {/* ── TRENDING DRIVERS ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20" style={rowStyle}>
        <SectionHeader label="Trending Drivers" viewAllHref="/DriverDirectory" />
        <ScrollRow isLoading={loadingDrivers}>
          {drivers.map(d => <DriverCard key={d.id} driver={d} />)}
          {!loadingDrivers && drivers.length === 0 && (
            <span className="text-white/20 text-xs italic py-4">No drivers yet</span>
          )}
        </ScrollRow>
      </div>

      {/* ── TOP TEAMS ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20" style={rowStyle}>
        <SectionHeader label="Top Teams" viewAllHref="/TeamDirectory" />
        <ScrollRow isLoading={loadingTeams} aspectRatio="3/2">
          {teams.map(t => <TeamCard key={t.id} team={t} />)}
          {!loadingTeams && teams.length === 0 && (
            <span className="text-white/20 text-xs italic py-4">No teams yet</span>
          )}
        </ScrollRow>
      </div>

      {/* ── TRACKS + EVENTS (side by side) ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-8" style={rowStyle}>
        {/* Tracks */}
        <div>
          <SectionHeader label="Tracks Around the World" viewAllHref="/TrackDirectory" />
          {loadingTracks ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5" />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5" />)}
              </div>
            </div>
          ) : tracks.length === 0 ? (
            <span className="text-white/20 text-xs italic py-4">No tracks yet</span>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {tracks.slice(0, 3).map(t => <TrackCard key={t.id} track={t} />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tracks.slice(3, 5).map(t => <TrackGridCard key={t.id} track={t} />)}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Events - list style */}
        <div>
          <SectionHeader label="Upcoming Events" viewAllHref="/EventDirectory" />
          {loadingEvents
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5 mb-2" />
              ))
            : (
              <div className="flex flex-col gap-2">
                {events.map(e => <EventListItem key={e.id} event={e} />)}
                {events.length === 0 && (
                  <span className="text-white/20 text-xs italic py-4">No upcoming events</span>
                )}
              </div>
            )
          }
        </div>
      </div>

      {/* ── SERIES SPOTLIGHT ── */}
      {(series.length > 0 || loadingSeries) && (
        <div className="py-6 px-8 md:px-12 lg:px-20" style={rowStyle}>
          <SectionHeader label="Series Spotlight" viewAllHref="/SeriesHome" />
          {loadingSeries
            ? <div className="h-24 rounded-xl animate-pulse bg-white/5" />
            : series.map(s => <SeriesSpotlightCard key={s.id} series={s} />)
          }
        </div>
      )}

      {/* ── CTA BANNER ── */}
      <div style={rowStyle} className="pt-4 pb-8">
        <CTABanner />
      </div>

    </div>
  );
}