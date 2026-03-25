import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function HeroSection({ stats, featuredDrivers = [], featuredStory }) {
  const heroDriver = featuredDrivers[0];
  const heroImage = heroDriver?.hero_image_url || heroDriver?.profile_image_url || null;

  return (
    <section style={{ background: '#232323' }} className="relative overflow-hidden">

      {/* Background image layer */}
      {heroImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.25) contrast(1.2)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #232323 55%, transparent 100%)' }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>
              The Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none tracking-tight mb-6" style={{ color: '#FFF8F5', fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
            Motorsports,<br />
            <span style={{ color: '#00FFDA' }}>Culture,</span><br />
            and Competition.
          </h1>

          {/* Sub */}
          <p className="text-base font-medium mb-10 max-w-md leading-relaxed" style={{ color: 'rgba(255,248,245,0.6)' }}>
            HIJINX — the platform where motorsports, media, and culture collide. Drivers, teams, tracks, series, and verified results.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to={createPageUrl('MotorsportsHome')}
              className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase transition-all"
              style={{ background: '#00FFDA', color: '#232323' }}
            >
              Explore Motorsports
            </Link>
            <Link
              to={createPageUrl('DriverDirectory')}
              className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase border transition-all"
              style={{ border: '1px solid rgba(255,248,245,0.2)', color: '#FFF8F5' }}
            >
              Browse Drivers
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-16 pt-8 border-t flex flex-wrap gap-8" style={{ borderColor: 'rgba(255,248,245,0.1)' }}>
            {[
              { label: 'Drivers',  value: stats.driver_count },
              { label: 'Series',   value: stats.series_count },
              { label: 'Tracks',   value: stats.track_count },
              { label: 'Events',   value: stats.event_count },
            ].filter(s => s.value != null).map(stat => (
              <div key={stat.label}>
                <div className="font-black text-3xl leading-none mb-1" style={{ color: '#FFF8F5' }}>
                  {stat.value.toLocaleString()}
                </div>
                <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,248,245,0.4)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom edge accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: '#00FFDA', opacity: 0.3 }} />
    </section>
  );
}