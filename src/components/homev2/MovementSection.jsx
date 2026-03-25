import React from 'react';

export default function MovementSection() {
  return (
    <section
      style={{ background: '#1A3249', borderBottom: '1px solid rgba(0,255,218,0.12)' }}
      className="py-20 md:py-28"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>The Movement</span>
          </div>

          <blockquote className="font-black leading-none mb-8" style={{ color: '#FFF8F5', fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            "Motorsports isn't just a sport.{' '}
            <span style={{ color: '#00FFDA' }}>It's a culture.</span>"
          </blockquote>

          <p className="text-base leading-relaxed max-w-xl" style={{ color: 'rgba(255,248,245,0.5)' }}>
            We built HIJINX for the drivers who grind, the teams who sacrifice, the tracks that shape legends, and the media that captures it all. This is the platform the culture deserves.
          </p>

          {/* Decorative teal rule */}
          <div className="mt-12 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: 'rgba(0,255,218,0.2)' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(0,255,218,0.4)' }}>HIJINX</span>
            <div className="h-px flex-1" style={{ background: 'rgba(0,255,218,0.2)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}