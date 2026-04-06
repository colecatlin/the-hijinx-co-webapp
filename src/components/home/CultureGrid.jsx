import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const GRAIN_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '128px 128px',
};

const TILES = [
  {
    id: 'action',
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85&fit=crop',
    label: 'Motion',
    accent: '#00FFDA',
    span: 'col-span-2 row-span-2',
  },
  {
    id: 'garage',
    src: 'https://images.unsplash.com/photo-1590650046871-92c887180603?w=700&q=85&fit=crop',
    label: 'Built',
    accent: '#FF4500',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 'crew',
    src: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=700&q=85&fit=crop',
    label: 'Crew',
    accent: '#FF8C00',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 'apparel',
    src: 'https://images.unsplash.com/photo-1622445272461-c6580cab8755?w=700&q=85&fit=crop',
    label: 'Worn',
    accent: '#E5FF00',
    span: 'col-span-1 row-span-2',
  },
  {
    id: 'pit',
    src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=700&q=85&fit=crop',
    label: 'Behind the Scenes',
    accent: '#00FFDA',
    span: 'col-span-1 row-span-1',
  },
];

function ImageTile({ tile }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl cursor-pointer group ${tile.span}`}
      style={{ minHeight: 200 }}
    >
      <img
        src={tile.src}
        alt={tile.label}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04]"
        style={{ filter: 'contrast(1.15) saturate(0.5) brightness(0.68)' }}
      />
      {/* Grain */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={GRAIN_STYLE} />
      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {/* Neon accent line — bottom edge on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: tile.accent, boxShadow: `0 0 12px ${tile.accent}99` }}
      />
      {/* Bloom glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${tile.accent}18 0%, transparent 65%)` }}
      />
      {/* Label */}
      <span
        className="absolute bottom-4 left-4 text-[9px] font-bold tracking-[0.4em] uppercase"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {tile.label}
      </span>
    </div>
  );
}

export default function CultureGrid() {
  return (
    <section className="bg-[#0C0C0B] py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-5 h-px" style={{ background: '#00FFDA', boxShadow: '0 0 8px #00FFDA88' }} />
          <span className="text-[9px] font-bold tracking-[0.45em] uppercase" style={{ color: 'rgba(0,255,218,0.45)' }}>
            HIJINX · Culture
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

          {/* ANCHOR CARD — Glass culture card (col-span-1 row-span-2) */}
          <div
            className="col-span-1 row-span-2 relative rounded-xl overflow-hidden flex flex-col justify-between p-7"
            style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(0,255,218,0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(0,255,218,0.04)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, #00FFDA55 0%, transparent 70%)' }} />
            <div>
              <span className="text-[9px] font-bold tracking-[0.45em] uppercase block mb-6" style={{ color: '#00FFDA88' }}>
                Culture
              </span>
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight mb-4">
                Born from<br />the garage.
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Built for the track.<br />
                Worn everywhere else.<br />
                Where racing culture meets<br />real life — on and off the grid.
              </p>
            </div>
            <Link
              to={createPageUrl('ApparelHome')}
              className="inline-flex items-center gap-2 text-sm font-semibold pb-0.5 hover:gap-3 transition-all w-fit"
              style={{ color: '#00FFDA', borderBottom: '1px solid rgba(0,255,218,0.3)' }}
            >
              Shop Apparel <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* TILE 5 — Pit / BTS */}
          <ImageTile tile={TILES[4]} />

          {/* EDITORIAL TEXT TILE (col-span-2 row-span-1) */}
          <div
            className="col-span-2 row-span-1 relative rounded-xl overflow-hidden flex flex-col justify-between p-6"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-40" style={GRAIN_STYLE} />
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, rgba(229,255,0,0.3) 0%, transparent 60%)' }} />
            <div className="relative">
              <span className="text-[9px] font-bold tracking-[0.45em] uppercase block mb-3" style={{ color: 'rgba(229,255,0,0.4)' }}>
                Editorial
              </span>
              <p className="text-xl font-black text-white tracking-tight leading-snug">
                We document what others overlook.
              </p>
            </div>
            <Link
              to={createPageUrl('OutletHome')}
              className="relative inline-flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors w-fit mt-3"
            >
              Read the Outlet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}