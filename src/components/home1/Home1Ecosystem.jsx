import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { mergeConfig, resolveCta, titleLines } from './home1Helpers';

const BONE = '#FFF8F5';
const OIL = '#232323';
const TEAL = '#00FFDA';
const RASP = '#D33F49';

const ECOSYSTEM_DEFAULTS = {
  enabled: true,
  eyebrow_badge: 'Built For What Moves You',
  headline: 'Explore The Hijinx Ecosystem',
  supporting_phrase: 'Different Paths.\nSame Direction.',
  tiles: [
    {
      key: 'SHOP', enabled: true, title: 'SHOP HIJINX', descriptor: 'APPAREL + COLLECTIONS',
      support: 'Gear for the ones who keep it moving.', cta_label: 'SHOP NOW',
      image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
      alt: 'HIJINX apparel — hoodie and cap laid out race weekend',
      accent_word: null, cta_style: 'solid',
      destination: { type: 'internal_page', internal_page: '/ApparelHome' },
      large: true, sort_order: 0,
    },
    {
      key: 'OUTLET', enabled: true, title: 'THE OUTLET', descriptor: 'STORIES + MEDIA + CULTURE',
      support: 'The pulse of motorsports.', cta_label: 'READ STORIES',
      image: 'https://images.unsplash.com/photo-1502920917128-1aa1c652f298?auto=format&fit=crop&w=1200&q=80',
      alt: 'Photographer with camera covering a race event in the paddock',
      accent_word: null, cta_style: 'outline',
      destination: { type: 'internal_page', internal_page: '/OutletHome' },
      large: true, sort_order: 1,
    },
    {
      key: 'INDEX46', enabled: true, title: 'INDEX46', descriptor: 'MOTORSPORTS INFORMATION',
      support: 'Drivers. Teams. Tracks. Series. Events.', cta_label: 'EXPLORE',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab8b7?auto=format&fit=crop&w=900&q=80',
      alt: 'Off-road truck mid-air at a desert race',
      accent_word: null, cta_style: 'ghost',
      destination: { type: 'internal_page', internal_page: '/MotorsportsHome' },
      large: false, sort_order: 2,
    },
    {
      key: 'MARKETPLACE', enabled: true, title: 'MARKETPLACE', descriptor: 'BUY // SELL // BUILD',
      support: 'Parts. Builds. Equipment. Opportunity.', cta_label: 'BROWSE',
      image: 'https://images.unsplash.com/photo-1601362840410-2f0b3a4a7e76?auto=format&fit=crop&w=900&q=80',
      alt: 'Race trailer interior with tires and parts',
      accent_word: null, cta_style: 'ghost',
      destination: { type: 'internal_page', internal_page: '/MarketplaceHome' },
      large: false, sort_order: 3,
    },
    {
      key: 'RACECORE', enabled: true, title: 'RACE CORE', descriptor: 'RACER TOOLS + OPERATIONS',
      support: 'Built for competitors.', cta_label: 'GET STARTED',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
      alt: 'Laptop displaying race timing and operations data',
      accent_word: 'CORE', cta_style: 'ghost',
      destination: { type: 'internal_page', internal_page: '/racecore' },
      large: false, sort_order: 4,
    },
    {
      key: 'COMMUNITY', enabled: true, title: 'COMMUNITY', descriptor: 'PEOPLE + OPPORTUNITY',
      support: 'Racers. Creators. Fans. All in motion.', cta_label: 'JOIN IN',
      image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=80',
      alt: 'Group of racers and crew gathered together in the paddock',
      accent_word: null, cta_style: 'ghost',
      destination: { type: 'internal_page', internal_page: '/join' },
      large: false, sort_order: 5,
    },
  ],
  schedule: { enabled: false, start_at: '', end_at: '' },
};

function EcosystemTile({ tile }) {
  const isSolidCta = tile.cta_style === 'solid';
  const lines = titleLines(tile.title);
  const accent = tile.accent_word;

  // Resolve destination
  const resolved = resolveCta({
    enabled: true,
    label: tile.cta_label,
    destination: tile.destination,
  });

  const tileContent = (
    <>
      {/* Image */}
      <img
        src={tile.image}
        alt={tile.alt || tile.title}
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
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line === accent ? (
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
            {tile.cta_label}
            <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </>
  );

  const cls = 'group relative block overflow-hidden focus:outline-none';
  const style = { background: OIL, aspectRatio: tile.large ? '16 / 10' : '4 / 5' };

  if (!resolved || !resolved.isLink) {
    // No link — render as a div that looks the same
    return (
      <div className={cls} style={style} aria-label={`${tile.title} — ${tile.cta_label}`}>
        {tileContent}
      </div>
    );
  }

  if (resolved.isExternal) {
    return (
      <a
        href={resolved.href}
        target={resolved.openInNewTab ? '_blank' : undefined}
        rel={resolved.openInNewTab ? 'noopener noreferrer' : undefined}
        aria-label={`${tile.title} — ${tile.cta_label}`}
        className={cls}
        style={style}
      >
        {tileContent}
      </a>
    );
  }

  return (
    <Link to={resolved.href} aria-label={`${tile.title} — ${tile.cta_label}`} className={cls} style={style}>
      {tileContent}
    </Link>
  );
}

export default function Home1Ecosystem({ config }) {
  const v = mergeConfig(ECOSYSTEM_DEFAULTS, config);

  const enabledTiles = (v.tiles || [])
    .filter((t) => t.enabled !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const largeTiles = enabledTiles.filter((t) => t.large);
  const smallTiles = enabledTiles.filter((t) => !t.large);

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
              {v.eyebrow_badge}
            </span>
            <h2
              className="font-black uppercase leading-[0.9] tracking-[-0.02em]"
              style={{ color: OIL, fontSize: 'clamp(2.5rem, 6vw, 4.75rem)' }}
            >
              {v.headline?.includes('Ecosystem') ? (() => {
                const idx = v.headline.indexOf('Ecosystem');
                return (
                  <>
                    {v.headline.substring(0, idx)}
                    <span style={{ color: TEAL }}>Ecosystem</span>
                    {v.headline.substring(idx + 9)}
                  </>
                );
              })() : (
                v.headline
              )}
            </h2>
          </div>
          {/* Supporting phrase */}
          <div className="md:text-right md:pb-2">
            <p
              className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-bold leading-relaxed"
              style={{ color: OIL }}
            >
              {v.supporting_phrase?.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < (v.supporting_phrase?.split('\n').length || 0) - 1 && <br />}
                </React.Fragment>
              ))}
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
          {largeTiles.map((tile) => (
            <EcosystemTile key={tile.key} tile={tile} />
          ))}
          {/* Bottom row — four smaller tiles */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {smallTiles.map((tile) => (
              <EcosystemTile key={tile.key} tile={tile} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}