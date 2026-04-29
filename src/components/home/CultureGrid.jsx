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

// Fallback accent colors if no accent_color set on block
const ACCENTS = [
  '#00FFDA', '#FF6B00', '#FF2D55', '#E5FF00', '#00FFDA',
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getAccent(block, idx) {
  const color = block.accent_color || ACCENTS[idx % ACCENTS.length];
  return { accent: color, glowColor: hexToRgba(color, 0.28) };
}

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
  const { accent, glowColor } = getAccent(block, accentIdx);
  const hasImage = !!block.image_url;
  const hasCta = !!block.link_label;

  return (
    <TileWrapper
      linkUrl={block.link_url}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group ${span}`}
      style={{
        display: 'block',
        height: '100%',
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
      {/* Category label — always top left */}
      <span
        className="absolute top-4 left-4 text-[8px] font-bold tracking-[0.45em] uppercase"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        {block.label || block.title}
      </span>

      {/* Title — always bottom left, serif editorial */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3
          className="text-white leading-tight mb-1"
          style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 2.2vw, 1.35rem)', fontWeight: 700 }}
        >
          {block.title}
        </h3>
        {hasCta && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300"
            style={{ color: accent }}
          >
            {block.link_label} <ArrowRight className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
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

  return (
    <section className="py-14 md:py-20 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">

        <div className="flex items-center gap-3 mb-8 md:mb-10">
          <div className="w-5 h-px" style={{ background: '#1DA1A1' }} />
          <span className="text-[9px] font-bold tracking-[0.5em] uppercase" style={{ color: '#1DA1A1' }}>
            HIJINX · Culture &amp; Identity
          </span>
        </div>

        {/* 
          Layout: flex row of 4 columns on desktop, stacked on mobile.
          Col A: large "On Track" tile (spans full height of rows 1+2)
          Col B+C: two rows of two smaller tiles stacked
          Col D: "Culture" glass card (spans full height) + "Editorial" below on desktop
          No CSS grid row-span tricks — flex-col handles height naturally with no overlap.
        */}

        {/* Mobile: simple vertical stack of cards */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {tiles[0] && <div style={{ height: 220 }}><ImageTile block={tiles[0]} span="w-full h-full" accentIdx={0} /></div>}
          <div className="grid grid-cols-2 gap-2.5">
            {tiles[1] && <div style={{ height: 180 }}><ImageTile block={tiles[1]} span="w-full h-full" accentIdx={1} /></div>}
            {tiles[2] && <div style={{ height: 180 }}><ImageTile block={tiles[2]} span="w-full h-full" accentIdx={2} /></div>}
            {tiles[3] && <div style={{ height: 180 }}><ImageTile block={tiles[3]} span="w-full h-full" accentIdx={3} /></div>}
            {tiles[4] && <div style={{ height: 180 }}><ImageTile block={tiles[4]} span="w-full h-full" accentIdx={4} /></div>}
          </div>
          {cultureCard && (
            <TileWrapper
              linkUrl={cultureCard.link_url}
              className="relative rounded-xl overflow-hidden flex flex-col justify-between p-5 group cursor-pointer"
              style={{ minHeight: 200, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 0 20px rgba(0,0,0,0.4)', transition: 'border-color 0.3s ease, transform 0.3s ease' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, rgba(29,161,161,0.3) 50%, transparent 100%)' }} />
              <div className="absolute inset-0 pointer-events-none opacity-10" style={GRAIN_STYLE} />
              <div className="relative">
                <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-4" style={{ color: '#1DA1A1' }}>{cultureCard.label || cultureCard.title}</span>
                <h2 className="leading-tight mb-3" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)' }}>Born from<br />the garage.</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{cultureCard.description}</p>
              </div>
              {cultureCard.link_label && (
                <span className="relative inline-flex items-center gap-2 text-sm font-semibold pb-0.5 mt-4 w-fit" style={{ color: '#1DA1A1', borderBottom: '1px solid rgba(29,161,161,0.35)' }}>
                  {cultureCard.link_label} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </TileWrapper>
          )}
          {editorialCard && (
            <TileWrapper
              linkUrl={editorialCard.link_url}
              className="relative rounded-xl overflow-hidden flex flex-col justify-between p-5 group cursor-pointer"
              style={{ minHeight: 160, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 20px rgba(0,0,0,0.4)', transition: 'border-color 0.3s ease, transform 0.3s ease' }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-10" style={GRAIN_STYLE} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, rgba(229,255,0,0.4) 0%, transparent 60%)' }} />
              <div className="relative">
                <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-3" style={{ color: 'rgba(229,255,0,0.7)' }}>{editorialCard.label || editorialCard.title}</span>
                <p className="leading-snug" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>{editorialCard.description}</p>
              </div>
              {editorialCard.link_label && (
                <span className="relative inline-flex items-center gap-2 text-xs font-semibold mt-3 w-fit" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {editorialCard.link_label} <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </TileWrapper>
          )}
        </div>

        {/* Desktop: CSS grid with explicit pixel rows — reliable, no overlap */}
        <div className="hidden md:grid gap-2.5" style={{
          gridTemplateColumns: '1fr 22% 22% 26%',
          gridTemplateRows: '220px 220px',
        }}>

          {/* Col A: On Track — spans both rows */}
          {tiles[0] && (
            <div style={{ gridColumn: '1', gridRow: '1 / 3', height: '100%' }}>
              <ImageTile block={tiles[0]} span="w-full h-full" accentIdx={0} />
            </div>
          )}

          {/* Col B top: Built */}
          {tiles[1] && (
            <div style={{ gridColumn: '2', gridRow: '1', height: '100%' }}>
              <ImageTile block={tiles[1]} span="w-full h-full" accentIdx={1} />
            </div>
          )}

          {/* Col B bottom: Worn */}
          {tiles[3] && (
            <div style={{ gridColumn: '2', gridRow: '2', height: '100%' }}>
              <ImageTile block={tiles[3]} span="w-full h-full" accentIdx={3} />
            </div>
          )}

          {/* Col C top: Crew */}
          {tiles[2] && (
            <div style={{ gridColumn: '3', gridRow: '1', height: '100%' }}>
              <ImageTile block={tiles[2]} span="w-full h-full" accentIdx={2} />
            </div>
          )}

          {/* Col C bottom: Behind the Scenes */}
          {tiles[4] && (
            <div style={{ gridColumn: '3', gridRow: '2', height: '100%' }}>
              <ImageTile block={tiles[4]} span="w-full h-full" accentIdx={4} />
            </div>
          )}

          {/* Col D: Culture glass card (top ~60%) + Editorial card (bottom ~40%) */}
          <div className="flex flex-col gap-2.5" style={{ gridColumn: '4', gridRow: '1 / 3', height: '100%' }}>
            {cultureCard && (
              <TileWrapper
                linkUrl={cultureCard.link_url}
                className="relative rounded-xl overflow-hidden flex flex-col justify-between p-7 group cursor-pointer"
                style={{
                  flex: '3',
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                  transition: 'box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(29,161,161,0.2), 0 16px 48px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              >
                <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, rgba(29,161,161,0.3) 50%, transparent 100%)' }} />
                <div className="absolute inset-0 pointer-events-none opacity-10" style={GRAIN_STYLE} />
                <div className="relative">
                  <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-6" style={{ color: '#1DA1A1' }}>{cultureCard.label || cultureCard.title}</span>
                  <h2 className="leading-tight mb-4" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: 'rgba(255,255,255,0.92)', fontStyle: 'italic' }}>Born from<br />the garage.</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>{cultureCard.description}</p>
                </div>
                {cultureCard.link_label && (
                  <span className="relative inline-flex items-center gap-2 text-sm font-semibold pb-0.5 hover:gap-3 transition-all w-fit" style={{ color: '#1DA1A1', borderBottom: '1px solid rgba(29,161,161,0.35)' }}>
                    {cultureCard.link_label} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </TileWrapper>
            )}
            {editorialCard && (
              <TileWrapper
                linkUrl={editorialCard.link_url}
                className="relative rounded-xl overflow-hidden flex flex-col justify-between p-6 group cursor-pointer"
                style={{
                  flex: '2',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                  transition: 'box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(229,255,0,0.12), 0 12px 40px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-10" style={GRAIN_STYLE} />
                <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, rgba(229,255,0,0.4) 0%, transparent 60%)' }} />
                <div className="relative">
                  <span className="text-[9px] font-bold tracking-[0.5em] uppercase block mb-3" style={{ color: 'rgba(229,255,0,0.7)' }}>{editorialCard.label || editorialCard.title}</span>
                  <p className="leading-snug" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 1.8vw, 1.25rem)', fontWeight: 700, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>{editorialCard.description}</p>
                </div>
                {editorialCard.link_label && (
                  <span className="relative inline-flex items-center gap-2 text-xs font-semibold transition-colors w-fit mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                  >
                    {editorialCard.link_label} <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </TileWrapper>
            )}
          </div>

        </div>{/* end desktop grid */}
      </div>
    </section>
  );
}