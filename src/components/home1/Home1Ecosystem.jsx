import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';
const RASP = '#D33F49';

const TILES = [
  {
    to: '/ApparelHome',
    descriptor: 'APPAREL + COLLECTIONS',
    name: ['SHOP', 'HIJINX'],
    support: 'Gear for the ones who keep it moving.',
    cta: 'SHOP NOW',
    image:
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
    alt: 'HIJINX apparel — hoodie and cap laid out race weekend',
    large: true,
    ctaStyle: 'solid',
  },
  {
    to: '/OutletHome',
    descriptor: 'STORIES + MEDIA + CULTURE',
    name: ['THE', 'OUTLET'],
    support: 'The pulse of motorsports.',
    cta: 'READ STORIES',
    image:
      'https://images.unsplash.com/photo-1502920917128-1aa1c652f298?auto=format&fit=crop&w=1200&q=80',
    alt: 'Photographer with camera covering a race event in the paddock',
    large: true,
    ctaStyle: 'outline',
  },
  {
    to: '/MotorsportsHome',
    descriptor: 'MOTORSPORTS INFORMATION',
    name: ['INDEX46'],
    support: 'Drivers. Teams. Tracks. Series. Events.',
    cta: 'EXPLORE',
    image:
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab8b7?auto=format&fit=crop&w=900&q=80',
    alt: 'Off-road truck mid-air at a desert race',
    accent: '46',
    large: false,
    ctaStyle: 'ghost',
  },
  {
    to: '/MarketplaceHome',
    descriptor: 'BUY // SELL // BUILD',
    name: ['MARKETPLACE'],
    support: 'Parts. Builds. Equipment. Opportunity.',
    cta: 'BROWSE',
    image:
      'https://images.unsplash.com/photo-1601362840410-2f0b3a4a7e76?auto=format&fit=crop&w=900&q=80',
    alt: 'Race trailer interior with tires and parts',
    large: false,
    ctaStyle: 'ghost',
  },
  {
    to: '/racecore',
    descriptor: 'RACER TOOLS + OPERATIONS',
    name: ['RACE', 'CORE'],
    support: 'Built for competitors.',
    cta: 'GET STARTED',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    alt: 'Laptop displaying race timing and operations data',
    accent: 'CORE',
    large: false,
    ctaStyle: 'ghost',
  },
  {
    to: '/join',
    descriptor: 'PEOPLE + OPPORTUNITY',
    name: ['COMMUNITY'],
    support: 'Racers. Creators. Fans. All in motion.',
    cta: 'JOIN IN',
    image:
      'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=80',
    alt: 'Group of racers and crew gathered together in the paddock',
    large: false,
    ctaStyle: 'ghost',
  },
];

function EcosystemTile({ tile }) {
  const isSolidCta = tile.ctaStyle === 'solid';
  return (
    <Link
      to={tile.to}
      aria-label={`${tile.name.join(' ')} — ${tile.cta}`}
      className="group relative block overflow-hidden focus:outline-none"
      style={{
        background: OIL,
        aspectRatio: tile.large ? '16 / 10' : '4 / 5',
      }}
    >
      {/* Image */}
      <img
        src={tile.image}
        alt={tile.alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(35,35,35,0.15) 0%, rgba(35,35,35,0.35) 45%, rgba(35,35,35,0.82) 100%)',
        }}
      />
      {/* Teal accent reveal on hover */}
      <div
        className="absolute left-0 bottom-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 ease-out"
        style={{ background: TEAL }}
      />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 lg:p-7">
        <p
          className="font-mono text-[9px] md:text-[10px] tracking-[0.25em] uppercase font-bold mb-2"
          style={{ color: TEAL }}
        >
          {tile.descriptor}
        </p>
        <h3
          className="font-black uppercase leading-[0.92] tracking-[-0.01em]"
          style={{
            color: '#FFFFFF',
            fontSize: tile.large
              ? 'clamp(2rem, 4vw, 3.25rem)'
              : 'clamp(1.5rem, 2.4vw, 2rem)',
          }}
        >
          {tile.name.map((line, i) => (
            <span key={i} className="block">
              {line === tile.accent ? (
                <span style={{ color: TEAL }}>{line}</span>
              ) : (
                line
              )}
            </span>
          ))}
        </h3>
        <p
          className="mt-2 text-[12px] md:text-[13px] leading-snug max-w-[16rem]"
          style={{ color: 'rgba(255,255,255,0.82)' }}
        >
          {tile.support}
        </p>
        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase font-bold transition-colors"
            style={
              isSolidCta
                ? { background: TEAL, color: OIL }
                : {
                    background: 'transparent',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.55)',
                  }
            }
          >
            {tile.cta}
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home1Ecosystem() {
  return (
    <section className="w-full py-14 md:py-20" style={{ background: BONE }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
          <div>
            {/* Eyebrow */}
            <span
              className="inline-block px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase font-bold mb-4"
              style={{ background: RASP, color: '#FFFFFF' }}
            >
              Built For What Moves You
            </span>
            <h2
              className="font-black uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2.5rem, 6vw, 4.75rem)' }}
            >
              Explore The Hijinx{' '}
              <span style={{ color: TEAL }}>Ecosystem</span>
            </h2>
          </div>
          {/* Supporting phrase */}
          <div className="md:text-right md:pb-2">
            <p
              className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-bold leading-relaxed"
              style={{ color: OIL }}
            >
              Different Paths.
              <br />
              Same Direction.
            </p>
            <div
              className="mt-2 h-px w-full md:w-32 md:ml-auto"
              style={{ background: 'rgba(35,35,35,0.25)' }}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {/* Top row — two large tiles */}
          {TILES.filter((t) => t.large).map((tile) => (
            <EcosystemTile key={tile.to} tile={tile} />
          ))}
          {/* Bottom row — four smaller tiles */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {TILES.filter((t) => !t.large).map((tile) => (
              <EcosystemTile key={tile.to} tile={tile} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}