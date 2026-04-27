import React, { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, ChevronRight, Flag, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import BehindTheScenesCarousel from './BehindTheScenesCarousel';

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
    </div>);

}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label, viewAllHref }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-white font-black text-sm uppercase tracking-widest">{label}</h2>
      {viewAllHref &&
      <Link to={viewAllHref} className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-[#1DA1A1] transition-colors uppercase tracking-wider">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      }
    </div>);

}

// ── Scroll Row ────────────────────────────────────────────────────────────────

function ScrollRow({ children, isLoading, aspectRatio = '3/2' }) {
  const ref = useRef(null);
  return (
    <div ref={ref} className="flex gap-3">
      {isLoading ?
      Array.from({ length: 5 }).map((_, i) =>
      <div key={i} className="flex-1 rounded-xl animate-pulse bg-white/5" style={{ aspectRatio }} />
      ) :
      children}
    </div>);

}

// ── Driver Card ───────────────────────────────────────────────────────────────

function DriverCard({ driver, seriesMap }) {
  const name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
  const img = driver.profile_image_url || driver.hero_image_url;
  const slug = driver.slug || driver.id;
  const series = seriesMap && driver.primary_series_id ? seriesMap[driver.primary_series_id] : null;

  return (
    <Link to={`/drivers/${slug}`} className="flex-1 min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full rounded-xl overflow-hidden relative cursor-pointer"
        style={{ aspectRatio: '4/3', background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}>
        
        {/* Background image */}
        {img &&
        <img src={img} alt={name} className="absolute inset-0 w-full h-full object-cover object-top" />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }} />

        {/* Number */}
        {driver.primary_number &&
        <div className="absolute top-2 left-3 font-black text-white text-2xl leading-none opacity-90">
            {driver.primary_number}
          </div>
        }

        {/* Name + series */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-white font-bold text-xs leading-tight truncate">{name}</div>
          {series &&
          <div className="text-white/50 text-[9px] truncate mt-0.5">{series.name}</div>
          }
        </div>
      </motion.div>
    </Link>);

}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, topSeries }) {
  const img = team.logo_url;

  return (
    <Link to={`/TeamProfile?id=${team.id}`} className="flex-1 min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className="w-full rounded-xl overflow-hidden cursor-pointer relative"
        style={{ aspectRatio: '3/2', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 0 12px rgba(0,0,0,0.06)' }}>
        
        {/* Logo centered and contained */}
        {img && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img src={img} alt={team.name} className="max-w-full max-h-full object-contain" style={{ maxHeight: '60%' }} />
          </div>
        )}

        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5">
          <div
            className="text-[#1A1A1A] font-bold leading-tight flex items-center gap-2"
            style={{ fontSize: 'clamp(9px, 2.2vw, 15px)' }}>
            
            <span className="flex-1 min-w-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</span>
            {team.manufacturer && (
              <span className="text-[9px] text-[#666] flex-shrink-0 whitespace-nowrap">{team.manufacturer}</span>
            )}
          </div>
          {topSeries &&
          <div className="text-[#999] text-[9px] truncate mt-0.5">{topSeries.name}</div>
          }
        </div>
      </motion.div>
    </Link>);

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
        style={{ height: '72px', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 10px rgba(255,255,255,0.06)' }}>
        
        {/* Full-bleed image */}
        {img ?
        <img src={img} alt={track.name} className="absolute inset-0 w-full h-full object-cover" /> :
        <div className="absolute inset-0"><Placeholder char={(track.name || 'T')[0]} /></div>
        }
        {/* Gradient overlay from bottom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)' }} />
        {/* Text pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
          <div
            className="text-white font-black text-xs leading-tight"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            
            {track.name}
          </div>
          {location &&
          <div className="flex items-center gap-1 mt-0.5" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <MapPin className="w-2 h-2 flex-shrink-0 text-white/40" />
              <span className="text-white/40 text-[9px]">{location}</span>
            </div>
          }
        </div>
      </motion.div>
    </Link>);

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
        style={{ aspectRatio: '2/3', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}>
        
        {/* Full-bleed image */}
        {img ?
        <img src={img} alt={track.name} className="absolute inset-0 w-full h-full object-cover" /> :
        <div className="absolute inset-0"><Placeholder char={(track.name || 'T')[0]} /></div>
        }
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2.5">
          <div className="text-white font-bold text-xs leading-tight truncate">{track.name}</div>
          {location &&
          <div className="flex items-center gap-1 text-white/50 text-[9px] mt-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {location}
            </div>
          }
        </div>
      </motion.div>
    </Link>);

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
        style={{ border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 10px rgba(255,255,255,0.06)' }}>
        
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
          {(event.location_note || '') &&
          <div className="text-white/40 text-[9px] mt-0.5 truncate">{event.location_note}</div>
          }
        </div>

        {/* Class badge */}
        {event.series_name &&
        <div className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white/60"
        style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            {event.series_name.split(' ').slice(0, 2).join(' ')}
          </div>
        }
      </motion.div>
    </Link>);

}

// ── Championship Leaders ──────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ChampionshipLeaderCard({ leader, isEmpty, manufacturerLogo }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl overflow-hidden relative"
      style={{ aspectRatio: '4/3', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,15,15,0.9)' }}>
      
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/10 font-black text-3xl">—</div>
        </div>
      ) : (
        <>
          {/* Background image or abbreviation */}
          {leader.image ? (
            <img src={leader.image} alt={leader.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/20 font-black text-4xl">{getInitials(leader.name)}</span>
            </div>
          )}

          {/* Gradient overlay from bottom to top */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

          {/* Manufacturer logo - top left */}
          {manufacturerLogo && (
            <img src={manufacturerLogo} alt="manufacturer" className="absolute top-2 left-2.5 h-3.5 w-auto object-contain" />
          )}

          {/* Driver name and points - bottom */}
          <div className="absolute bottom-2 left-2.5 right-2.5">
            <div className="text-white font-bold text-[10px] leading-tight truncate">{leader.name}</div>
            <div className="text-white/70 text-[9px] mt-1">{leader.points} pts</div>
          </div>
        </>
      )}
    </div>);

}

// ── Series Spotlight ──────────────────────────────────────────────────────────

function SeriesSpotlightCard({ series }) {
  return (
    <Link to={`/series/${series.slug || series.id}`}>
      <motion.div
        whileHover={{ y: -2 }} className="px-4 py-10 rounded-xl flex items-center gap-4 cursor-pointer"

        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 0 12px rgba(255,255,255,0.08)' }}>
        
        {series.logo_url &&
        <img src={series.logo_url} alt={series.name} className="w-16 h-16 object-contain flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{series.name}</div>
          {series.description &&
          <div className="text-white/50 text-[10px] mt-1 line-clamp-2">{series.description}</div>
          }
          <div className="mt-2 text-[#1DA1A1] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            Explore Series <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </motion.div>
    </Link>);

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
    </div>);

}

// ── Main export ───────────────────────────────────────────────────────────────

function getCompetitionLevel(series) {
  return series?.override_competition_level ?? series?.derived_competition_level ?? 0;
}

// Resolve pinned IDs against a pool; return pinned subset in order
function resolvePinned(ids, pool) {
  if (!ids?.length || !pool?.length) return [];
  const map = Object.fromEntries(pool.map(r => [r.id, r]));
  return ids.map(id => map[id]).filter(Boolean);
}

export default function DiscoveryRows() {
  // ── Settings ──────────────────────────────────────────────────────────────
  const { data: settingsList = [] } = useQuery({
    queryKey: ['motorsports-home-settings'],
    queryFn: () => base44.entities.MotorsportsHomeSettings.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsList[0] || null;

  // ── All Series (for competition level lookup) ─────────────────────────────
  const { data: allSeries = [], isLoading: loadingAllSeries } = useQuery({
    queryKey: ['discovery-all-series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });

  const seriesMap = React.useMemo(() => {
    const map = {};
    allSeries.forEach(s => { map[s.id] = s; });
    return map;
  }, [allSeries]);

  // ── Drivers ───────────────────────────────────────────────────────────────
  const { data: rawDrivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['discovery-drivers'],
    queryFn: () => base44.entities.Driver.filter({ visibility_status: 'live' }, '-created_date', 100),
    staleTime: 5 * 60 * 1000,
  });

  const drivers = React.useMemo(() => {
    if (settings && !settings.trending_drivers_use_auto && settings.trending_driver_ids?.length) {
      return resolvePinned(settings.trending_driver_ids, rawDrivers).slice(0, 5);
    }
    return [...rawDrivers]
      .sort((a, b) => {
        const aLevel = getCompetitionLevel(seriesMap[a.primary_series_id]);
        const bLevel = getCompetitionLevel(seriesMap[b.primary_series_id]);
        return bLevel - aLevel;
      })
      .slice(0, 5);
  }, [rawDrivers, seriesMap, settings]);

  // ── Teams ─────────────────────────────────────────────────────────────────
  const { data: rawTeams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['discovery-teams'],
    queryFn: () => base44.entities.Team.filter({ visibility_status: 'live' }, '-trending_score', 100),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamDrivers = [] } = useQuery({
    queryKey: ['discovery-team-drivers'],
    queryFn: () => base44.entities.Driver.filter({ visibility_status: 'live' }),
    staleTime: 10 * 60 * 1000,
    enabled: rawTeams.length > 0,
  });

  const { teams, teamTopSeriesMap } = React.useMemo(() => {
    const topSeriesMap = {};
    teamDrivers.forEach(driver => {
      if (!driver.team_id || !driver.primary_series_id) return;
      const s = seriesMap[driver.primary_series_id];
      if (!s) return;
      const existing = topSeriesMap[driver.team_id];
      if (!existing || getCompetitionLevel(s) > getCompetitionLevel(existing)) {
        topSeriesMap[driver.team_id] = s;
      }
    });

    let sorted;
    if (settings && !settings.top_teams_use_auto && settings.top_team_ids?.length) {
      sorted = resolvePinned(settings.top_team_ids, rawTeams).slice(0, 5);
    } else {
      sorted = [...rawTeams]
        .sort((a, b) => {
          const aLevel = getCompetitionLevel(topSeriesMap[a.id]);
          const bLevel = getCompetitionLevel(topSeriesMap[b.id]);
          return bLevel - aLevel;
        })
        .slice(0, 5);
    }

    return { teams: sorted, teamTopSeriesMap: topSeriesMap };
  }, [rawTeams, teamDrivers, seriesMap, settings]);

  // ── Tracks ────────────────────────────────────────────────────────────────
  const { data: rawTracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['discovery-tracks'],
    queryFn: () => base44.entities.Track.filter({ visibility_status: 'live' }, '-created_date', 100),
    staleTime: 5 * 60 * 1000,
  });

  const tracks = React.useMemo(() => {
    if (settings && !settings.tracks_use_auto && settings.featured_track_ids?.length) {
      return resolvePinned(settings.featured_track_ids, rawTracks).slice(0, 5);
    }
    return rawTracks.slice(0, 5);
  }, [rawTracks, settings]);

  // ── Events ────────────────────────────────────────────────────────────────
  const { data: rawEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['discovery-events'],
    queryFn: () => base44.entities.Event.list('-event_date', 100),
    staleTime: 5 * 60 * 1000,
  });

  const events = React.useMemo(() => {
    if (settings && !settings.events_use_auto && settings.featured_event_ids?.length) {
      return resolvePinned(settings.featured_event_ids, rawEvents).slice(0, 5);
    }
    const today = new Date().toISOString().split('T')[0];
    const upcoming = rawEvents.filter((e) => e.event_date >= today && e.public_status !== 'archived');
    return (upcoming.length >= 4 ? upcoming : rawEvents).slice(0, 5);
  }, [rawEvents, settings]);

  // ── Series Spotlight ──────────────────────────────────────────────────────
  const { data: series = [], isLoading: loadingSeries } = useQuery({
    queryKey: ['discovery-series'],
    queryFn: () => base44.entities.Series.filter({ visibility_status: 'live' }, '-created_date', 1),
    staleTime: 5 * 60 * 1000,
  });

  // ── Championship Leaders ──────────────────────────────────────────────────
  const useAutoChampLeaders = settings?.championship_leaders_use_auto ?? false;

  // Fetch all series that have standings_url (so we know which ones have synced data)
  const { data: seriesWithStandings = [] } = useQuery({
    queryKey: ['discovery-series-with-standings'],
    queryFn: () => base44.entities.Series.filter({ visibility_status: 'live' }),
    enabled: useAutoChampLeaders,
    staleTime: 10 * 60 * 1000,
    select: (d) => d.filter(s => s.standings_url),
  });

  const currentYearNum = new Date().getFullYear();

  const { data: autoLeaderStandings = [] } = useQuery({
    queryKey: ['discovery-champ-leaders-standings', currentYearNum],
    queryFn: async () => {
      // Fetch top-1 for each series with a standings_url
      const results = await Promise.all(
        seriesWithStandings.map(async s => {
          const standings = await base44.entities.DriverStanding.filter(
            { series_id: s.id, season_year: currentYearNum },
            'position',
            1
          );
          if (standings[0]) {
            // Fetch fresh series data to ensure logo_url is present
            const freshSeries = await base44.entities.Series.get(s.id);
            return { series: freshSeries, standing: standings[0] };
          }
          return null;
        })
      );
      return results.filter(Boolean);
    },
    enabled: useAutoChampLeaders && seriesWithStandings.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch driver profile images for auto leaders that have a driver_id
  const leaderDriverIds = autoLeaderStandings
    .map(({ standing }) => standing.driver_id)
    .filter(Boolean);

  const { data: leaderDrivers = [] } = useQuery({
    queryKey: ['discovery-leader-drivers', leaderDriverIds.join(',')],
    queryFn: () => Promise.all(leaderDriverIds.map(id => base44.entities.Driver.get(id))),
    enabled: useAutoChampLeaders && leaderDriverIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const leaderDriverMap = React.useMemo(() => {
    const map = {};
    leaderDrivers.forEach(d => { if (d) map[d.id] = d; });
    return map;
  }, [leaderDrivers]);

  const leaderTeamIds = leaderDrivers
    .map(d => d?.team_id)
    .filter(Boolean);

  const { data: leaderTeams = [] } = useQuery({
    queryKey: ['discovery-leader-teams', leaderTeamIds.join(',')],
    queryFn: () => Promise.all(leaderTeamIds.map(id => base44.entities.Team.get(id))),
    enabled: leaderTeamIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const leaderTeamMap = React.useMemo(() => {
    const map = {};
    leaderTeams.forEach(t => { if (t) map[t.id] = t; });
    return map;
  }, [leaderTeams]);

  const rawChampLeaders = useAutoChampLeaders
    ? autoLeaderStandings.map(({ series, standing }) => {
        const driverRecord = standing.driver_id ? leaderDriverMap[standing.driver_id] : null;
        const teamRecord = driverRecord?.team_id ? leaderTeamMap[driverRecord.team_id] : null;
        const image = driverRecord?.profile_image_url || driverRecord?.hero_image_url || series.banner_url || series.logo_url || null;
        const manufacturerLogo = teamRecord?.manufacturer_logo_url || null;
        return {
          class: series.name,
          name: standing.driver_name,
          points: standing.points,
          image,
          series_id: series.id,
          series_logo: series.logo_url || null,
          manufacturerLogo,
        };
      })
    : (settings?.championship_leader_entries || []).map(e => ({
        class: e.class_name,
        name: e.driver_name,
        points: e.points,
        image: e.image_url || null,
        series_logo: null,
        manufacturerLogo: null,
      }));

  // Always pad to 5 slots
  const championshipLeaders = [
    ...rawChampLeaders,
    ...Array.from({ length: Math.max(0, 5 - rawChampLeaders.length) }, () => null),
  ];

  const rowStyle = {
    borderTop: '1px solid rgba(255,255,255,0.06)'
  };

  return (
    <div className="relative z-10 bg-transparent" id="champ-leaders">

      {/* ── TRENDING DRIVERS ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20" style={rowStyle}>
        <SectionHeader label="Trending Drivers" viewAllHref="/DriverDirectory?sort=trending" />
        <ScrollRow isLoading={loadingDrivers || loadingAllSeries} aspectRatio="4/3">
          {drivers.map((d) => <DriverCard key={d.id} driver={d} seriesMap={seriesMap} />)}
          {!loadingDrivers && drivers.length === 0 &&
          <span className="text-white/20 text-xs italic py-4">No drivers yet</span>
          }
        </ScrollRow>
      </div>

      {/* ── TOP TEAMS ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20" style={rowStyle}>
        <SectionHeader label="Top Teams" viewAllHref="/TeamDirectory?sort=trending" />
        <ScrollRow isLoading={loadingTeams || loadingAllSeries} aspectRatio="3/2">
          {teams.map((t) => <TeamCard key={t.id} team={t} topSeries={teamTopSeriesMap[t.id]} />)}
          {!loadingTeams && teams.length === 0 &&
          <span className="text-white/20 text-xs italic py-4">No teams yet</span>
          }
        </ScrollRow>
      </div>

      {/* ── TRACKS + EVENTS (side by side) ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-8" style={rowStyle}>
        {/* Tracks */}
        <div>
          <SectionHeader label="Tracks Around the World" viewAllHref="/TrackDirectory" />
          {loadingTracks ?
          <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5" />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5" />)}
              </div>
            </div> :
          tracks.length === 0 ?
          <span className="text-white/20 text-xs italic py-4">No tracks yet</span> :
          <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {tracks.slice(0, 3).map((t) => <TrackCard key={t.id} track={t} />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tracks.slice(3, 5).map((t) => <TrackGridCard key={t.id} track={t} />)}
              </div>
            </div>
          }
        </div>

        {/* Upcoming Events - list style */}
        <div>
          <SectionHeader label="Upcoming Events" viewAllHref="/EventDirectory" />
          {loadingEvents ?
          Array.from({ length: 4 }).map((_, i) =>
          <div key={i} className="h-14 rounded-lg animate-pulse bg-white/5 mb-2" />
          ) :
          <div className="flex flex-col gap-2">
            {events.map((e) => <EventListItem key={e.id} event={e} />)}
            {events.length === 0 &&
              <span className="text-white/20 text-xs italic py-4">No upcoming events</span>
            }
          </div>
          }
        </div>
      </div>

      {/* ── CHAMPIONSHIP LEADERS + SERIES SPOTLIGHT ── */}
      <div className="py-6 px-8 md:px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8" style={rowStyle}>
        {/* Championship Leaders — always show 5 slots when configured */}
        {(useAutoChampLeaders || (settings?.championship_leader_entries?.length > 0)) && (
          <div>
            <SectionHeader label="Championship Leaders" viewAllHref="/StandingsHome" />
            <div className="flex gap-2">
              {championshipLeaders.map((leader, idx) =>
                <div key={leader?.class || idx} className="flex-1 min-w-0 flex flex-col">
                  <ChampionshipLeaderCard
                    leader={leader || {}}
                    isEmpty={!leader}
                    manufacturerLogo={leader?.manufacturerLogo}
                  />
                  {leader && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {leader.series_logo && (
                        <div className="bg-white/10 rounded px-1.5 py-1 backdrop-blur-sm flex-shrink-0">
                          <img src={leader.series_logo} alt={leader.class} className="h-4 w-auto object-contain" />
                        </div>
                      )}
                      <div className="text-white font-black text-[9px] uppercase tracking-wider truncate">{leader.class}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Series Spotlight */}
        {(series.length > 0 || loadingSeries) &&
        <div>
            <SectionHeader label="Series Spotlight" viewAllHref="/SeriesHome" />
            {loadingSeries ?
          <div className="h-24 rounded-xl animate-pulse bg-white/5" /> :
          series.map((s) => <SeriesSpotlightCard key={s.id} series={s} />)
          }
          </div>
        }
      </div>

      {/* ── BEHIND THE SCENES CAROUSEL ── */}
      <BehindTheScenesCarousel />

      {/* ── CTA BANNER ── */}
      <div style={rowStyle} className="pt-4 pb-8">
        <CTABanner />
      </div>

    </div>);

}