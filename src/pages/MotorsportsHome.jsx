import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

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
          style={{ filter: 'saturate(1.1) contrast(1.05)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,10,10,0.75) 0%, rgba(5,10,10,0.25) 40%, rgba(5,10,10,0.35) 65%, rgba(5,10,10,0.92) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(5,10,10,0.80) 0%, rgba(5,10,10,0.3) 55%, transparent 100%)' }} />
        <div className="absolute top-0 left-0 w-[600px] h-[2px] opacity-40" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[1px] opacity-30" style={{ background: 'linear-gradient(to left, #1DA1A1, transparent)' }} />
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* ── FOREGROUND ── */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24">

        {/* Top eyebrow */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-6 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#1DA1A1] uppercase opacity-70">INDEX46 · Motorsports</span>
        </div>

        {/* Hero glass card — left-aligned, not full width */}
        <div
          className="relative group w-full max-w-xl rounded-2xl p-8 md:p-10"
          style={{
            background: 'rgba(8, 16, 16, 0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(29, 161, 161, 0.18)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Subtle teal glow on left edge */}
          <div
            className="absolute left-0 top-8 bottom-8 w-[1px]"
            style={{ background: 'linear-gradient(to bottom, transparent, #1DA1A1, transparent)', opacity: 0.6 }}
          />

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-3">
            Everything racing.<br />
            <span style={{ color: '#1DA1A1' }}>One place.</span>
          </h1>

          {/* Subtext */}
          <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm">
            Find drivers, teams, tracks, and results across every discipline — all verified, all in one place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search drivers, teams, tracks…"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={e => {
                e.target.style.border = '1px solid rgba(29,161,161,0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(29,161,161,0.08)';
              }}
              onBlur={e => {
                e.target.style.border = '1px solid rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </form>

          {/* Primary CTA */}
          <button
            onClick={() => navigate('/DriverDirectory')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 hover:gap-3"
            style={{ background: '#1DA1A1', color: '#050A0A' }}
          >
            Start Exploring
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-white font-black text-lg leading-none">{s.value}</div>
                <div className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rule */}
        <div className="flex items-center gap-3 mt-10">
          <div className="w-32 h-[1px]" style={{ background: 'linear-gradient(to right, rgba(29,161,161,0.4), transparent)' }} />
        </div>

      </div>
    </div>
  );
}