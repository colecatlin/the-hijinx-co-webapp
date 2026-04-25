import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, CalendarDays, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Shared helpers ────────────────────────────────────────────────────────────

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Placeholder({ char }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <span className="text-white/20 text-3xl font-black uppercase">{char}</span>
    </div>
  );
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────

function DiscoveryRow({ label, viewAllHref, children, isLoading }) {
  const scrollRef = useRef(null);

  return (
    <div className="py-5 px-8 md:px-12 lg:px-20" style={{ background: 'rgba(4,8,8,0.55)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Row header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[9px] tracking-[0.4em] text-white/50 uppercase">{label}</span>
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase text-white/30 hover:text-[#1DA1A1] transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 h-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))
          : children
        }
      </div>
    </div>
  );
}

// ── Card base ─────────────────────────────────────────────────────────────────

function GlassCard({ to, children, className = '' }) {
  return (
    <Link to={to || '#'}>
      <motion.div
        whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(29,161,161,0.18)' }}
        transition={{ duration: 0.18 }}
        className={`flex-shrink-0 rounded-xl overflow-hidden cursor-pointer ${className}`}
        style={{ ...glass }}
      >
        {children}
      </motion.div>
    </Link>
  );
}

// ── Driver Card ───────────────────────────────────────────────────────────────

function DriverCard({ driver }) {
  const name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
  const img = driver.profile_image_url || driver.hero_image_url;
  const slug = driver.slug || driver.id;

  return (
    <GlassCard to={`/drivers/${slug}`} className="w-36">
      <div className="h-24 overflow-hidden relative">
        {img
          ? <img src={img} alt={name} className="w-full h-full object-cover object-top" />
          : <Placeholder char={name[0]} />
        }
        {driver.primary_number && (
          <span className="absolute top-1.5 right-1.5 font-black text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
            #{driver.primary_number}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="text-white font-bold text-xs leading-tight truncate">{name}</div>
        {driver.primary_discipline && (
          <div className="text-white/40 text-[9px] truncate mt-0.5">{driver.primary_discipline}</div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team }) {
  const img = team.logo_url;
  const slug = team.slug || team.id;

  return (
    <GlassCard to={`/TeamProfile?id=${team.id}`} className="w-36">
      <div className="h-20 overflow-hidden relative flex items-center justify-center bg-white/3">
        {img
          ? <img src={img} alt={team.name} className="w-full h-full object-contain p-3" />
          : <Placeholder char={(team.name || 'T')[0]} />
        }
      </div>
      <div className="px-2.5 py-2">
        <div className="text-white font-bold text-xs leading-tight truncate">{team.name}</div>
        {team.primary_discipline && (
          <div className="text-white/40 text-[9px] truncate mt-0.5">{team.primary_discipline}</div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Track Card ────────────────────────────────────────────────────────────────

function TrackCard({ track }) {
  const img = track.image_url;
  const location = [track.location_city, track.location_state].filter(Boolean).join(', ');

  return (
    <GlassCard to={`/TrackProfile?id=${track.id}`} className="w-44">
      <div className="h-24 overflow-hidden relative">
        {img
          ? <img src={img} alt={track.name} className="w-full h-full object-cover" />
          : <Placeholder char={(track.name || 'T')[0]} />
        }
      </div>
      <div className="px-2.5 py-2">
        <div className="text-white font-bold text-xs leading-tight truncate">{track.name}</div>
        {location && (
          <div className="flex items-center gap-1 text-white/40 text-[9px] mt-0.5 truncate">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            {location}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event }) {
  const date = formatDate(event.event_date);

  return (
    <GlassCard to={`/EventProfile?id=${event.id}`} className="w-48">
      <div className="px-3 pt-3 pb-2.5">
        {date && (
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays className="w-3 h-3 text-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-widest text-[#1DA1A1] uppercase">{date}</span>
          </div>
        )}
        <div className="text-white font-bold text-xs leading-snug line-clamp-2 mb-1">{event.name}</div>
        {event.series_name && (
          <div className="text-white/35 text-[9px] truncate">{event.series_name}</div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DiscoveryRows() {
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['discovery-drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(dr => dr.visibility_status === 'live').slice(0, 20),
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['discovery-teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(t => t.visibility_status === 'live').slice(0, 20),
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
      return (upcoming.length >= 5 ? upcoming : d).slice(0, 20);
    },
  });

  return (
    <div className="relative z-10">
      <DiscoveryRow label="Trending Drivers" viewAllHref="/DriverDirectory" isLoading={loadingDrivers}>
        {drivers.map(d => <DriverCard key={d.id} driver={d} />)}
        {!loadingDrivers && drivers.length === 0 && (
          <span className="text-white/20 text-xs italic py-4">No drivers yet</span>
        )}
      </DiscoveryRow>

      <DiscoveryRow label="Top Teams" viewAllHref="/TeamDirectory" isLoading={loadingTeams}>
        {teams.map(t => <TeamCard key={t.id} team={t} />)}
        {!loadingTeams && teams.length === 0 && (
          <span className="text-white/20 text-xs italic py-4">No teams yet</span>
        )}
      </DiscoveryRow>

      <DiscoveryRow label="Tracks Around the World" viewAllHref="/TrackDirectory" isLoading={loadingTracks}>
        {tracks.map(t => <TrackCard key={t.id} track={t} />)}
        {!loadingTracks && tracks.length === 0 && (
          <span className="text-white/20 text-xs italic py-4">No tracks yet</span>
        )}
      </DiscoveryRow>

      <DiscoveryRow label="Upcoming Events" viewAllHref="/EventDirectory" isLoading={loadingEvents}>
        {events.map(e => <EventCard key={e.id} event={e} />)}
        {!loadingEvents && events.length === 0 && (
          <span className="text-white/20 text-xs italic py-4">No upcoming events</span>
        )}
      </DiscoveryRow>
    </div>
  );
}