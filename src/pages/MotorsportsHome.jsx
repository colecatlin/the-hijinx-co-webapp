import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/motorsports/StatCard';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/1c65cd6f5_background.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

function useCount(entity) {
  return useQuery({
    queryKey: ['count', entity],
    queryFn: () => base44.entities[entity].list(null, 1),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length : 0,
  });
}

export default function MotorsportsHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: drivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ['motorsports-count-drivers'],
    queryFn: () => base44.entities.Driver.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length.toLocaleString() : '—',
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['motorsports-count-teams'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length.toLocaleString() : '—',
  });

  const { data: tracks, isLoading: loadingTracks } = useQuery({
    queryKey: ['motorsports-count-tracks'],
    queryFn: () => base44.entities.Track.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length.toLocaleString() : '—',
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['motorsports-count-events'],
    queryFn: () => base44.entities.Event.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length.toLocaleString() : '—',
  });

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['motorsports-count-results'],
    queryFn: () => base44.entities.Results.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data.length.toLocaleString() : '—',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/DriverDirectory?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/DriverDirectory');
    }
  };

  const stats = [
    { label: 'Drivers', count: drivers, isLoading: loadingDrivers },
    { label: 'Teams',   count: teams,   isLoading: loadingTeams },
    { label: 'Tracks',  count: tracks,  isLoading: loadingTracks },
    { label: 'Events',  count: events,  isLoading: loadingEvents },
    { label: 'Results', count: results, isLoading: loadingResults },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050A0A]">

      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-center"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />

        {/* Heavy left dark fade */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.96) 0%, rgba(4,8,8,0.80) 38%, rgba(4,8,8,0.30) 65%, rgba(4,8,8,0.55) 100%)' }}
        />

        {/* Top-to-bottom gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.6) 0%, rgba(4,8,8,0.1) 35%, rgba(4,8,8,0.5) 80%, rgba(4,8,8,0.95) 100%)' }}
        />

        {/* Teal accent streaks */}
        <div className="absolute top-0 left-0 w-[500px] h-[2px] opacity-50" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute top-0 left-0 w-[2px] h-40 opacity-40" style={{ background: 'linear-gradient(to bottom, #1DA1A1, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[1px] opacity-25" style={{ background: 'linear-gradient(to left, #1DA1A1, transparent)' }} />

        {/* Grain */}
        <div className="absolute inset-0 opacity-25 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 min-h-screen flex items-center px-8 md:px-12 lg:px-20 py-16">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-8 items-center">

          {/* LEFT: Hero text + search */}
          <div className="lg:col-span-3 max-w-2xl">

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-[1px] bg-[#1DA1A1]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#1DA1A1] uppercase">INDEX46 · Motorsports</span>
            </div>

            {/* Main headline */}
            <h1
              className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.92] tracking-tight uppercase mb-2"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
            >
              THE WORLD<br />OF RACING.
            </h1>

            {/* Teal italic line */}
            <p
              className="text-4xl md:text-5xl lg:text-6xl font-black italic uppercase mb-6 leading-tight"
              style={{ color: '#1DA1A1', textShadow: '0 0 40px rgba(29,161,161,0.4)' }}
            >
              All in one place.
            </p>

            {/* Subtext */}
            <p className="text-white/60 text-base md:text-lg leading-relaxed mb-10 max-w-md">
              Drivers. Teams. Tracks. Events. Results.<br />
              The most comprehensive motorsports data platform, built for the culture.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-0 max-w-lg">
              <div
                className="flex items-center flex-1 px-4 py-4 rounded-l-xl"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRight: 'none',
                }}
              >
                <Search className="w-5 h-5 text-white/40 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search drivers, teams, tracks, events..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 rounded-r-xl text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110 flex-shrink-0"
                style={{ background: '#1DA1A1', color: '#050A0A' }}
              >
                Explore
              </button>
            </form>
          </div>

          {/* RIGHT: Live stat cards */}
          <div className="lg:col-span-2 flex flex-col gap-2.5 max-w-xs w-full ml-auto">
            {stats.map((s, i) => (
              <StatCard
                key={s.label}
                label={s.label}
                count={s.count}
                isLoading={s.isLoading}
                delay={i * 0.08}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}