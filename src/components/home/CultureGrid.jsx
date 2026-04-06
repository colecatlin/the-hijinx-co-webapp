import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const GRAIN_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '128px 128px',
};

const TILES = [
  {
    id: 'action',
    src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=90&fit=crop',
    label: 'Motion',
    accent: '#00FFDA',
    glowColor: 'rgba(0,255,218,0.28)',
    span: 'col-span-2 row-span-2',
  },
  {
    id: 'garage',
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&q=90&fit=crop',
    label: 'Built',
    accent: '#FF6B00',
    glowColor: 'rgba(255,107,0,0.28)',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 'crew',
    src: 'https://images.unsplash.com/photo-1541447270539-4df1aa6d8e0e?w=700&q=90&fit=crop',
    label: 'Crew',
    accent: '#FF2D55',
    glowColor: 'rgba(255,45,85,0.28)',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 'apparel',
    src: 'https://images.unsplash.com/photo-1524069290683-0457abfe42c3?w=700&q=90&fit=crop',
    label: 'Worn',
    accent: '#E5FF00',
    glowColor: 'rgba(229,255,0,0.28)',
    span: 'col-span-1 row-span-2',
  },
  {
    id: 'pit',
    src: 'https://images.unsplash.com/photo-1590650046871-92c887180603?w=700&q=90&fit=crop',
    label: 'Behind the Scenes',
    accent: '#00FFDA',
    glowColor: 'rgba(0,255,218,0.28)',
    span: 'col-span-1 row-span-1',
  },
];

function ImageTile({ tile }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl cursor-pointer group ${tile.span}`}
      style={{
        minHeight: 200,
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 16px 48px ${tile.glowColor}, 0 2px 12px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <img
        src={tile.src}
        alt={tile.label}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.05]"
        style={{ filter: 'contrast(1.18) saturate(0.45) brightness(0.65)' }}
      />
      {/* Grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={GRAIN_STYLE} />
      {/* Dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/15 to-transparent" />
      {/* Neon accent line — bottom on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: tile.accent, boxShadow: `0 0 16px ${tile.accent}CC` }}
      />
      {/* Bloom glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${tile.accent}22 0%, transparent 65%)` }}
      />
      {/* Label */}
      <span
        className="absolute bottom-4 left-4 text-[9px] font-bold tracking-[0.4em] uppercase transition-colors duration-300"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        {tile.label}
      </span>
    </div>
  );
}

export default function CultureGrid() {
  return (
    <section
      style={{ background: 'linear-gradient(180deg, #F5F7FA 0%, #E9EEF3 100%)' }}
      className="py-20 md:py-28 overflow-hidden"
    >
      {/* Top neon edge — separates from dark hero above */}
      <div className="h-[2px] w-full mb-0" style={{ background: 'linear-gradient(90deg, transparent 0%, #00FFDA44 30%, #00FFDA22 70%, transparent 100%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-5 h-px" style={{ background: '#00FFDA' }} />
          <span className="text-[9px] font-bold tracking-[0.5em] uppercase" style={{ color: '#00CCAA' }}>
            HIJINX · Culture &amp; Identity
          </span>
        </div>

        {/* Grid */}
        <div
          className="grid grid-cols-4 gap-2.5"
          style={{ gridAutoRows: '220px' }}
        >
          {/* TILE 1 — Large action (col-span-2 row-span-2) */}
          <ImageTile tile={TILES[0]} />

          {/* TILE 2 — Garage / built */}
          <ImageTile tile={TILES[1]} />

          {/* TILE 3 — Crew */}
          <ImageTile tile={TILES[2]} />

          {/* TILE 4 — Apparel in context (col-span-1 row-span-2) */}
          <ImageTile tile={TILES[3]} />

          {/* ANCHOR GLASS CARD — (col-span-1 row-span-2) */}
          <div
            className="col-span-1 row-span-2 relative rounded-2xl overflow-hidden flex flex-col justify-between p-7 group"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              transition: 'box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 0 32px rgba(0,255,218,0.18), 0 16px 48px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.08)';
            }}
          >
            {/* Teal top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #00FFDA 0%, #00FFDA44 50%, transparent 100%)' }} />
            {/* Subtle grain */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={GRAIN_STYLE} />
            <div className="relative">
              <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-6" style={{ color: '#00CCAA' }}>
                Culture
              </span>
              <h2 className="text-4xl font-black tracking-tight leading-tight mb-4" style={{ color: '#0A0A0A' }}>
                Born from<br />the garage.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#4A4F55' }}>
                Built for the track.<br />
                Worn everywhere else.<br />
                Where motorsports culture<br />meets real life.
              </p>
            </div>
            <Link
              to={createPageUrl('ApparelHome')}
              className="relative inline-flex items-center gap-2 text-sm font-semibold pb-0.5 hover:gap-3 transition-all w-fit group-hover:opacity-100"
              style={{ color: '#009980', borderBottom: '1px solid rgba(0,153,128,0.35)' }}
            >
              Shop Apparel <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* TILE 5 — Pit / BTS */}
          <ImageTile tile={TILES[4]} />

          {/* EDITORIAL GLASS TILE (col-span-2 row-span-1) */}
          <div
            className="col-span-2 row-span-1 relative rounded-2xl overflow-hidden flex flex-col justify-between p-6 group"
            style={{
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.07)',
              transition: 'box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 0 28px rgba(229,255,0,0.15), 0 12px 40px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.07)';
            }}
          >
            {/* Grain */}
            <div className="absolute inset-0 pointer-events-none opacity-25" style={GRAIN_STYLE} />
            {/* Yellow-tinted top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #E5FF0066 0%, transparent 60%)' }} />
            <div className="relative">
              <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-3" style={{ color: '#8A7000' }}>
                Editorial
              </span>
              <p className="text-xl font-black tracking-tight leading-snug" style={{ color: '#0A0A0A' }}>
                We document what others overlook.
              </p>
            </div>
            <Link
              to={createPageUrl('OutletHome')}
              className="relative inline-flex items-center gap-2 text-xs font-semibold transition-colors w-fit mt-3"
              style={{ color: '#8A9096' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
              onMouseLeave={e => e.currentTarget.style.color = '#8A9096'}
            >
              Read the Outlet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}