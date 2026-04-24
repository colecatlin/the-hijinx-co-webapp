import React, { useEffect } from 'react';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Building2, MapPin, Zap, Trophy, Flag,
  Shield, Gauge, CheckCircle2, LogIn, LayoutDashboard,
  ArrowRight, ChevronRight, Star, Calendar, ExternalLink
} from 'lucide-react';

const HERO_BG = 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1800&q=85&fit=crop';
const TRACK_FALLBACK = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80&fit=crop';
const TEAM_FALLBACK = 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=800&q=80&fit=crop';

function SectionHeader({ label, title, href, linkText }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <span className="font-mono text-[10px] tracking-[0.35em] text-[#E5FF00] uppercase font-bold">{label}</span>
        <h2 className="text-3xl font-black text-white tracking-tight mt-1">{title}</h2>
      </div>
      {href && (
        <Link to={href} className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors font-mono tracking-wider uppercase">
          {linkText} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function DriverCard({ driver }) {
  const name = `${driver.first_name} ${driver.last_name}`;
  const slug = driver.slug || driver.id;
  return (
    <Link to={`/drivers/${slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group relative overflow-hidden rounded-lg cursor-pointer"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      >
        {/* Image */}
        <div className="h-48 overflow-hidden bg-[#111] relative">
          {driver.hero_image_url || driver.profile_image_url ? (
            <img
              src={driver.hero_image_url || driver.profile_image_url}
              alt={name}
              className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users className="w-12 h-12 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {driver.primary_number && (
            <div className="absolute top-3 right-3 font-mono text-xs font-black text-white/60 bg-black/40 px-2 py-0.5 rounded">
              #{driver.primary_number}
            </div>
          )}
          {driver.primary_color && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: driver.primary_color }} />
          )}
        </div>
        {/* Info */}
        <div className="p-4">
          <h3 className="font-black text-white text-sm tracking-tight group-hover:text-[#E5FF00] transition-colors">{name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {driver.primary_discipline && (
              <span className="text-[9px] font-mono tracking-wider text-white/40 uppercase">{driver.primary_discipline}</span>
            )}
            {driver.career_status && (
              <span className="text-[9px] font-mono tracking-wider text-white/40 uppercase border-l border-white/10 pl-2">{driver.career_status}</span>
            )}
          </div>
          {(driver.hometown_city || driver.racing_base_city) && (
            <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {driver.racing_base_city || driver.hometown_city}
              {(driver.racing_base_state || driver.hometown_state) && `, ${driver.racing_base_state || driver.hometown_state}`}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function TeamCard({ team }) {
  return (
    <Link to={createPageUrl('TeamDirectory')}>
      <motion.div
        whileHover={{ y: -4 }}
        className="group overflow-hidden rounded-lg cursor-pointer"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="h-36 overflow-hidden bg-[#111] relative">
          {team.logo_url || team.cover_image_url ? (
            <img
              src={team.logo_url || team.cover_image_url}
              alt={team.name}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
              <Building2 className="w-10 h-10 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <div className="p-4">
          <h3 className="font-black text-white text-sm tracking-tight group-hover:text-[#E5FF00] transition-colors">{team.name}</h3>
          {team.location_city && (
            <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {team.location_city}{team.location_state ? `, ${team.location_state}` : ''}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function TrackCard({ track }) {
  return (
    <Link to={createPageUrl('TrackDirectory')}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="group relative overflow-hidden rounded-lg h-44 cursor-pointer"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img
          src={track.image_url || TRACK_FALLBACK}
          alt={track.name}
          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-mono text-[8px] tracking-widest text-[#E5FF00] uppercase mb-1">{track.track_type || 'Track'}</p>
          <h3 className="font-black text-white text-sm group-hover:text-[#E5FF00] transition-colors">{track.name}</h3>
          <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {track.location_city}{track.location_state ? `, ${track.location_state}` : ''}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

function SeriesCard({ series }) {
  return (
    <Link to={`/series/${series.slug || series.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="group flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all"
        style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
          {series.logo_url ? (
            <img src={series.logo_url} alt={series.name} className="w-full h-full object-contain" />
          ) : (
            <Zap className="w-5 h-5 text-[#E5FF00]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm truncate group-hover:text-[#E5FF00] transition-colors">{series.name}</h3>
          <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider mt-0.5">
            {series.discipline || series.primary_discipline || 'Motorsports'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#E5FF00] flex-shrink-0 transition-colors" />
      </motion.div>
    </Link>
  );
}

function EventCard({ event }) {
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Link to={createPageUrl('EventDirectory')}>
      <motion.div
        whileHover={{ y: -2 }}
        className="group p-4 rounded-lg cursor-pointer transition-all"
        style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-center w-12 pt-0.5">
            {dateStr && (
              <>
                <div className="font-mono text-[10px] text-[#E5FF00] uppercase tracking-wider">
                  {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="font-black text-white text-xl leading-none">
                  {new Date(event.event_date).getDate()}
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm truncate group-hover:text-[#E5FF00] transition-colors">{event.name}</h3>
            {event.series_name && (
              <p className="text-[10px] text-white/40 mt-0.5 font-mono uppercase tracking-wider truncate">{event.series_name}</p>
            )}
            {event.location_note && (
              <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                {event.location_note}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function MotorsportsHome() {
  const { data: isAuthenticated } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['motorsports-drivers'],
    queryFn: () => base44.entities.Driver.filter({ visibility_status: 'live' }, '-created_date', 12),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['motorsports-teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 8),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['motorsports-tracks'],
    queryFn: () => base44.entities.Track.filter({ visibility_status: 'live' }, '-created_date', 8),
    staleTime: 5 * 60 * 1000,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['motorsports-series'],
    queryFn: () => base44.entities.Series.list('-created_date', 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['motorsports-events'],
    queryFn: () => base44.entities.Event.filter({ public_status: 'published' }, 'event_date', 8),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers-count-total'],
    queryFn: () => base44.entities.Driver.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events-count-total'],
    queryFn: () => base44.entities.Event.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allResults = [] } = useQuery({
    queryKey: ['results-count-total'],
    queryFn: () => base44.entities.Results.list(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => { Analytics.pageView('MotorsportsHome'); }, []);

  const stats = [
    { label: 'Drivers', value: allDrivers.length },
    { label: 'Events', value: allEvents.length },
    { label: 'Results', value: allResults.length },
    { label: 'Series', value: series.length },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SeoMeta
        title="Index46 | Motorsports"
        description="The home of competitive motorsports on HIJINX — drivers, teams, tracks, series, events, and verified results all in one place."
      />

      {/* ── HERO ── */}
      <div className="relative h-[60vh] min-h-[480px] overflow-hidden flex items-end">
        <img
          src={HERO_BG}
          alt="Racing"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ filter: 'contrast(1.1) saturate(0.8)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 pb-16 w-full">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-[2px] bg-[#E5FF00]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold">HIJINX · INDEX46</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-none mb-4">
              MOTOR<br />
              <span style={{ color: '#E5FF00' }}>SPORTS</span>
            </h1>
            <p className="text-white/50 text-lg max-w-lg leading-relaxed mb-8">
              The definitive home for competitive motorsports. Drivers, teams, tracks, series, and verified results — all in one place.
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-black text-3xl text-white">{s.value}</div>
                  <div className="font-mono text-[9px] tracking-widest text-white/30 uppercase mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── DRIVERS ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <SectionHeader label="Index46 · Athletes" title="Featured Drivers" href={createPageUrl('DriverDirectory')} linkText="All Drivers" />
        {drivers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {drivers.map((driver, i) => (
              <motion.div key={driver.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <DriverCard driver={driver} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/20 text-sm font-mono">No drivers published yet</div>
        )}
        <div className="mt-6 text-center">
          <Link
            to={createPageUrl('DriverDirectory')}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-mono tracking-widest uppercase text-white/50 hover:text-[#E5FF00] transition-colors border border-white/10 hover:border-[#E5FF00]/40 rounded-sm"
          >
            View All Drivers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ── TEAMS ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <SectionHeader label="Index46 · Organizations" title="Teams" href={createPageUrl('TeamDirectory')} linkText="All Teams" />
        {teams.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {teams.map((team, i) => (
              <motion.div key={team.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TeamCard team={team} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/20 text-sm font-mono">No teams yet</div>
        )}
      </section>

      {/* ── TRACKS ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <SectionHeader label="Index46 · Venues" title="Tracks" href={createPageUrl('TrackDirectory')} linkText="All Tracks" />
        {tracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tracks.map((track, i) => (
              <motion.div key={track.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TrackCard track={track} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/20 text-sm font-mono">No tracks published yet</div>
        )}
      </section>

      {/* ── SERIES + EVENTS (side by side) ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Series */}
          <div>
            <SectionHeader label="Index46 · Leagues" title="Series" href={createPageUrl('SeriesHome')} linkText="All Series" />
            {series.length > 0 ? (
              <div className="space-y-2">
                {series.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <SeriesCard series={s} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-white/20 text-sm font-mono">No series yet</div>
            )}
          </div>

          {/* Events */}
          <div>
            <SectionHeader label="Index46 · Calendar" title="Upcoming Events" href={createPageUrl('EventDirectory')} linkText="All Events" />
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((e, i) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <EventCard event={e} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-white/20 text-sm font-mono">No upcoming events</div>
            )}
          </div>
        </div>
      </section>

      {/* ── GALLERY STRIP ── */}
      <section className="py-16 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <SectionHeader label="Index46 · Visual" title="The Grid" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-6">
          {[
            'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=600&q=80&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&fit=crop',
          ].map((url, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex-shrink-0 w-64 h-44 overflow-hidden rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img
                src={url}
                alt="Racing"
                className="w-full h-full object-cover opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-500"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── RACE CORE CTA ── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div
          className="relative overflow-hidden rounded-xl p-10 md:p-16"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Accent lines */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #E5FF00 0%, transparent 50%)' }} />
          <div className="absolute top-0 left-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(180deg, #E5FF00 0%, transparent 50%)' }} />

          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-[2px] bg-[#E5FF00]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold">Race Core · Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
              Get on the grid.<br />
              <span className="text-white/30">Your data. Your story.</span>
            </h2>
            <p className="text-white/50 text-base leading-relaxed mb-8">
              Race Core is the operational backbone of Index46. Drivers, teams, tracks, and series can register their official profiles, run events, submit entries, post results, and build a permanent, verified record — all in one place.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { icon: Users, label: 'Drivers', desc: 'Build your portfolio. Track your results. Establish your legacy.' },
                { icon: Building2, label: 'Teams', desc: 'Showcase your program. Manage your roster and history.' },
                { icon: MapPin, label: 'Tracks', desc: 'List your venue, run events, and grow your presence.' },
                { icon: Zap, label: 'Series', desc: 'Manage seasons, standings, classes, and championships.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex gap-3 p-4 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(229,255,0,0.08)' }}>
                      <Icon className="w-4 h-4 text-[#E5FF00]" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs mb-0.5">{item.label}</div>
                      <div className="text-white/30 text-xs leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 font-black text-sm tracking-wider uppercase transition-all"
                  style={{ background: '#E5FF00', color: '#0A0A0A' }}
                >
                  <LogIn className="w-4 h-4" /> Join Index46
                </button>
              ) : (
                <Link
                  to={createPageUrl('MyDashboard')}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 font-black text-sm tracking-wider uppercase transition-all"
                  style={{ background: '#E5FF00', color: '#0A0A0A' }}
                >
                  <LayoutDashboard className="w-4 h-4" /> Go to My Dashboard
                </Link>
              )}
              <Link
                to={createPageUrl('Registration')}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 font-bold text-sm tracking-wider uppercase text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/30"
              >
                Race Core <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}