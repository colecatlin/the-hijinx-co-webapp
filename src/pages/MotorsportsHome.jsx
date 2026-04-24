import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/1c65cd6f5_background.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

const STATS = [
  { label: 'Drivers', value: '2,400+' },
  { label: 'Teams', value: '580+' },
  { label: 'Tracks', value: '310+' },
  { label: 'Events', value: '1,100+' },
];

export default function MotorsportsHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/DriverDirectory?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/DriverDirectory');
    }
  };

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

        {/* Heavy left dark fade so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.95) 0%, rgba(4,8,8,0.75) 40%, rgba(4,8,8,0.2) 70%, transparent 100%)' }}
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
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20">

        <div className="max-w-2xl">

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

          {/* Stats row */}
          <div className="flex items-center gap-8 mt-10">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                <div>
                  <div className="text-white font-black text-xl leading-none">{s.value}</div>
                  <div className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mt-0.5">{s.label}</div>
                </div>
                {i < STATS.length - 1 && (
                  <div className="w-[1px] h-6 bg-white/10" />
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}