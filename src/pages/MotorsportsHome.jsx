import React, { useEffect } from 'react';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/1c65cd6f5_background.png';

// Grain texture via SVG data URI
const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

function GlassPanel({ label, className = '' }) {
  return (
    <div
      className={`relative group rounded-2xl p-6 transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(10, 20, 20, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(29, 161, 161, 0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Teal edge glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: '0 0 24px rgba(29, 161, 161, 0.25), inset 0 0 24px rgba(29, 161, 161, 0.05)' }}
      />
      <div className="relative">
        <div className="w-8 h-[1px] bg-[#1DA1A1] mb-4 opacity-60" />
        <p className="font-mono text-[10px] tracking-[0.4em] text-white/30 uppercase">{label}</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 bg-white/5 rounded-full w-3/4" />
          <div className="h-2 bg-white/5 rounded-full w-1/2" />
          <div className="h-2 bg-white/5 rounded-full w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function MotorsportsHome() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050A0A]">

      {/* ── BACKGROUND IMAGE ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-center"
          style={{ filter: 'saturate(1.1) contrast(1.05)' }}
        />

        {/* Primary dark overlay — heavier at top and bottom, lighter over truck */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(5,10,10,0.75) 0%, rgba(5,10,10,0.25) 40%, rgba(5,10,10,0.35) 65%, rgba(5,10,10,0.92) 100%)',
          }}
        />

        {/* Left-side readability vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(5,10,10,0.7) 0%, transparent 50%)',
          }}
        />

        {/* Teal streak — top left accent */}
        <div
          className="absolute top-0 left-0 w-[600px] h-[2px] opacity-40"
          style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }}
        />

        {/* Teal streak — bottom right accent */}
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[1px] opacity-30"
          style={{ background: 'linear-gradient(to left, #1DA1A1, transparent)' }}
        />

        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* ── FOREGROUND CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 md:px-12 py-16">

        {/* Top label */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#1DA1A1] uppercase opacity-70">Index46 · Motorsports</span>
        </div>

        {/* Center — placeholder glass panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-auto py-16 max-w-5xl mx-auto w-full">
          <GlassPanel label="Section Alpha" className="md:col-span-2" />
          <GlassPanel label="Section Beta" />
          <GlassPanel label="Section Gamma" className="md:col-span-3" />
        </div>

        {/* Bottom teal rule */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-[#1DA1A1]/40 to-transparent" />
          <span className="font-mono text-[9px] tracking-[0.35em] text-white/20 uppercase">Foundation Layer</span>
        </div>

      </div>
    </div>
  );
}