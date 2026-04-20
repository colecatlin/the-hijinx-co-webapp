import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const GRAIN_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '128px 128px',
};

// Accent colors by sort_order position
const ACCENTS = [
  { accent: '#00FFDA', glowColor: 'rgba(0,255,218,0.28)' },
  { accent: '#FF6B00', glowColor: 'rgba(255,107,0,0.28)' },
  { accent: '#FF2D55', glowColor: 'rgba(255,45,85,0.28)' },
  { accent: '#E5FF00', glowColor: 'rgba(229,255,0,0.28)' },
  { accent: '#00FFDA', glowColor: 'rgba(0,255,218,0.28)' },
];

function isExternal(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

function TileWrapper({ linkUrl, children, className, style, onMouseEnter, onMouseLeave }) {
  const props = { className, style, onMouseEnter, onMouseLeave };
  if (!linkUrl) return <div {...props}>{children}</div>;
  if (isExternal(linkUrl)) return <a href={linkUrl} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  return <Link to={linkUrl} {...props}>{children}</Link>;
}

function getInitials(title) {
  return (title || '').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4);
}

function ImageTile({ block, span, accentIdx }) {
  const { accent, glowColor } = ACCENTS[accentIdx % ACCENTS.length];
  const hasImage = !!block.image_url;
  const hasCta = !!block.link_label;

  return (
    <TileWrapper
      linkUrl={block.link_url}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group ${span}`}
      style={{
        minHeight: 200,
        background: hasImage ? undefined : '#1A1A1A',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 16px 48px ${glowColor}, 0 2px 12px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {hasImage ? (
        <img
          src={block.image_url}
          alt={block.label || block.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.05]"
          style={{ filter: 'contrast(1.18) saturate(0.45) brightness(0.65)' }}
        />
      ) : (
        /* No image — show large initials centered */
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black tracking-tight select-none"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: accent, opacity: 0.18, lineHeight: 1 }}
          >
            {getInitials(block.title)}
          </span>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none opacity-60" style={GRAIN_STYLE} />
      {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/15 to-transparent" />}

      {/* Hover accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: accent, boxShadow: `0 0 16px ${accent}CC` }}
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${accent}22 0%, transparent 65%)` }}
      />

      {/* If title + CTA: title top-left, CTA bottom-left */}
      {hasCta ? (
        <>
          <span
            className="absolute top-4 left-4 text-[9px] font-bold tracking-[0.4em] uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {block.label || block.title}
          </span>
          <span
            className="absolute bottom-4 left-4 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors duration-300"
            style={{ color: accent }}
          >
            {block.link_label} <ArrowRight className="w-3 h-3" />
          </span>
        </>
      ) : (
        /* No CTA — just label at bottom-left */
        <span
          className="absolute bottom-4 left-4 text-[9px] font-bold tracking-[0.4em] uppercase transition-colors duration-300"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {block.label || block.title}
        </span>
      )}
    </TileWrapper>
  );
}

export default function CultureGrid() {
  const { data: dbBlocks = [] } = useQuery({
    queryKey: ['cultureBlocks'],
    queryFn: () => base44.entities.CultureBlock.filter({ is_active: true }, 'sort_order'),
    staleTime: 2 * 60 * 1000,
  });

  // Positions 0-4 are image tiles, 5 = culture glass card, 6 = editorial glass card
  const tiles = dbBlocks.slice(0, 5);
  const cultureCard = dbBlocks[5];
  const editorialCard = dbBlocks[6];

  // Tile spans by position index
  const SPANS = [
    'col-span-2 row-span-2', // On Track — large
    'col-span-1 row-span-1', // Built
    'col-span-1 row-span-1', // Crew
    'col-span-1 row-span-2', // Worn — tall
    'col-span-1 row-span-1', // Behind the Scenes
  ];

  return (
    <section style={{ background: '#F5F0E8' }} className="py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-5 h-px" style={{ background: '#00FFDA' }} />
          <span className="text-[9px] font-bold tracking-[0.5em] uppercase" style={{ color: '#00CCAA' }}>
            HIJINX · Culture &amp; Identity
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5" style={{ gridAutoRows: '220px' }}>

          {/* Image tiles 0–3 */}
          {tiles.slice(0, 4).map((block, i) => (
            <ImageTile key={block.id} block={block} span={SPANS[i]} accentIdx={i} />
          ))}

          {/* Culture glass card (col-span-1 row-span-2) */}
          {cultureCard && (
            <TileWrapper
              linkUrl={cultureCard.link_url}
              className="col-span-1 row-span-2 relative rounded-2xl overflow-hidden flex flex-col justify-between p-7 group cursor-pointer"
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
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #00FFDA 0%, #00FFDA44 50%, transparent 100%)' }} />
              <div className="absolute inset-0 pointer-events-none opacity-20" style={GRAIN_STYLE} />
              <div className="relative">
                <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-6" style={{ color: '#00CCAA' }}>
                  {cultureCard.label || cultureCard.title}
                </span>
                <h2 className="text-4xl font-black tracking-tight leading-tight mb-4" style={{ color: '#0A0A0A' }}>
                  Born from<br />the garage.
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#4A4F55' }}>
                  {cultureCard.description}
                </p>
              </div>
              {cultureCard.link_label && (
                <span
                  className="relative inline-flex items-center gap-2 text-sm font-semibold pb-0.5 hover:gap-3 transition-all w-fit"
                  style={{ color: '#009980', borderBottom: '1px solid rgba(0,153,128,0.35)' }}
                >
                  {cultureCard.link_label} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </TileWrapper>
          )}

          {/* Image tile 4 (Behind the Scenes) */}
          {tiles[4] && <ImageTile key={tiles[4].id} block={tiles[4]} span={SPANS[4]} accentIdx={4} />}

          {/* Editorial glass card (col-span-2 row-span-1) */}
          {editorialCard && (
            <TileWrapper
              linkUrl={editorialCard.link_url}
              className="col-span-2 row-span-1 relative rounded-2xl overflow-hidden flex flex-col justify-between p-6 group cursor-pointer"
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
              <div className="absolute inset-0 pointer-events-none opacity-25" style={GRAIN_STYLE} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #E5FF0066 0%, transparent 60%)' }} />
              <div className="relative">
                <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-3" style={{ color: '#8A7000' }}>
                  {editorialCard.label || editorialCard.title}
                </span>
                <p className="text-xl font-black tracking-tight leading-snug" style={{ color: '#0A0A0A' }}>
                  {editorialCard.description}
                </p>
              </div>
              {editorialCard.link_label && (
                <span
                  className="relative inline-flex items-center gap-2 text-xs font-semibold transition-colors w-fit mt-3"
                  style={{ color: '#8A9096' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#8A9096'}
                >
                  {editorialCard.link_label} <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </TileWrapper>
          )}

        </div>
      </div>
    </section>
  );
}