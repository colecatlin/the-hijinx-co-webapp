import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

const GRAIN_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'repeat',
  backgroundSize: '128px 128px',
};

const ACCENTS = ['#00FFDA', '#FF6B00', '#FF2D55', '#E5FF00', '#00FFDA'];

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

function CtaLink({ to, className, style, children }) {
  const external = isExternal(to);
  if (external) return <a href={to} target="_blank" rel="noopener noreferrer" className={className} style={style}>{children}</a>;
  return <Link to={to} className={className} style={style}>{children}</Link>;
}

function getInitials(title) {
  return (title || '').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4);
}

// Fallback slides if no DB slides
const FALLBACK_SLIDES = [
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1660337288537-71ae329ba2f0?w=1800&q=90&fit=crop',
    headline_line1: 'IN MOTION.',
    headline_line2: 'ON PURPOSE.',
    subtext: 'Not just moving, moving with intent.',
    cta1_label: 'Enter HIJINX',
    cta1_url: '/OutletHome',
  },
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=1800&q=90&fit=crop',
    headline_line1: "YOU'RE GOING",
    headline_line2: 'TO LOSE.',
    subtext: "That's where everything is built.",
    cta1_label: 'Keep Going',
    cta1_url: '/OutletHome',
  },
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1558981852-426c349548ab?w=1800&q=90&fit=crop',
    headline_line1: 'THIS IS',
    headline_line2: 'HIJINX.',
    subtext: "For those who don't sit still.",
    cta1_label: 'Shop Apparel',
    cta1_url: '/ApparelHome',
    cta2_label: 'Explore Race Core',
    cta2_url: '/MotorsportsHome',
  },
];

const INTERVAL = 4500;

// Hero carousel glass tile — replaces the large "On Track" tile
function HeroTile({ className, style, overlayAlpha = 0.5 }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const { data: dbSlides = [] } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HeroSlide.filter({ is_active: true }, 'sort_order'),
    staleTime: 2 * 60 * 1000,
  });

  const SLIDES = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES;

  const go = (idx) => setCurrent((idx + SLIDES.length) % SLIDES.length);
  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, current, SLIDES.length]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }, [current]);

  const rawSlide = SLIDES[current] || SLIDES[0];
  const slide = {
    type: rawSlide.media_type || rawSlide.type || 'image',
    bg: rawSlide.background_url || rawSlide.bg || '',
    videoSrc: rawSlide.background_url || rawSlide.videoSrc || '',
    headline: [rawSlide.headline_line1 || rawSlide.headline?.[0] || '', rawSlide.headline_line2 || rawSlide.headline?.[1] || ''].filter(Boolean),
    sub: rawSlide.subtext || rawSlide.sub || '',
    cta1: rawSlide.cta1_label ? { label: rawSlide.cta1_label, to: rawSlide.cta1_url || '/' } : (rawSlide.cta1 || null),
    cta2: rawSlide.cta2_label ? { label: rawSlide.cta2_label, to: rawSlide.cta2_url || '/' } : (rawSlide.cta2 || null),
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl cursor-default ${className || ''}`}
      style={{
        ...style,
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <AnimatePresence>
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {slide.type === 'video' ? (
            <video ref={videoRef} src={slide.videoSrc} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.bg})` }} />
          )}
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayAlpha})` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${Math.min(overlayAlpha * 0.75, 0.7)}) 100%)` }} />
          {/* Scanning light bar */}
          <motion.div
            className="absolute inset-x-0 pointer-events-none"
            style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,218,0.12) 50%, transparent 100%)' }}
            animate={{ top: ['15%', '80%', '15%'] }}
            transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none" style={GRAIN_STYLE} />

      {/* Content — glass card overlaid */}
      <div className="relative z-10 h-full flex flex-col justify-center p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="max-w-xs"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              borderRadius: 6,
              padding: '1.25rem 1.5rem',
            }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-4 h-[2px] bg-[#00FFDA]" />
              <span className="font-mono text-[8px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">HIJINX</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-[1.0] tracking-tight mb-2.5">
              {slide.headline.map((line, i) => <span key={i} className="block">{line}</span>)}
            </h1>
            <p className="text-xs text-white/55 font-medium leading-relaxed mb-4 max-w-[220px]">{slide.sub}</p>
            {(slide.cta1 || slide.cta2) && (
              <div className="flex flex-wrap gap-2">
                {slide.cta1 && (
                  <CtaLink to={slide.cta1.to} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[10px] font-bold tracking-wide uppercase hover:bg-[#00FFDA] transition-colors" style={{ borderRadius: 2 }}>
                    {slide.cta1.label} <ArrowRight className="w-2.5 h-2.5" />
                  </CtaLink>
                )}
                {slide.cta2 && (
                  <CtaLink to={slide.cta2.to} className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[10px] font-bold tracking-wide uppercase hover:text-[#00FFDA] transition-colors" style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    {slide.cta2.label}
                  </CtaLink>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav dots + arrows */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button onClick={prev} className="p-1 text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="transition-all duration-300"
              style={{ width: i === current ? 20 : 5, height: 2, borderRadius: 1, background: i === current ? '#00FFDA' : 'rgba(255,255,255,0.25)' }}
            />
          ))}
        </div>
        <button onClick={next} className="p-1 text-white/40 hover:text-white transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ImageTile({ block, span, accentIdx }) {
  const { accent, glowColor } = getAccent(block, accentIdx);
  const hasImage = !!block.image_url;
  const hasCta = !!block.link_label;
  const useGlass = !!block.use_glass_overlay;

  return (
    <TileWrapper
      linkUrl={block.link_url}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group ${span}`}
      style={{
        display: 'block',
        height: '100%',
        background: useGlass ? 'rgba(255,255,255,0.10)' : hasImage ? undefined : 'rgba(255,255,255,0.08)',
        backdropFilter: (useGlass || !hasImage) ? 'blur(20px)' : undefined,
        WebkitBackdropFilter: (useGlass || !hasImage) ? 'blur(20px)' : undefined,
        border: useGlass ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease, border-color 0.3s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 16px 48px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.18)`;
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.24)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Background image (always shown if present; glass overlay sits on top) */}
      {hasImage && (
        <img src={block.image_url} alt={block.label || block.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.05]" style={{ filter: 'contrast(1.05) saturate(1.3) brightness(1.05)' }} />
      )}

      {/* No image, no glass — show initials placeholder */}
      {!hasImage && !useGlass && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black tracking-tight select-none" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: accent, opacity: 0.18, lineHeight: 1 }}>
            {getInitials(block.title)}
          </span>
        </div>
      )}

      {/* Glass overlay panel — floats over image when use_glass_overlay is on */}
      {useGlass && (
        <div className="absolute inset-0" style={{
          background: 'rgba(255,255,255,0.13)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }} />
      )}

      <div className="absolute inset-0 pointer-events-none opacity-60" style={GRAIN_STYLE} />
      {hasImage && !useGlass && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
      {hasImage && useGlass && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}

      {/* Accent line top (glass style) */}
      {useGlass && (
        <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 50%, transparent 100%)` }} />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: accent, boxShadow: `0 0 16px ${accent}CC` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 100%, ${accent}22 0%, transparent 65%)` }} />
      <span className="absolute top-4 left-4 text-[8px] font-bold tracking-[0.45em] uppercase" style={{ color: useGlass ? accent : 'rgba(255,255,255,0.45)' }}>
        {block.label || block.title}
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="leading-tight mb-1" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 2.2vw, 1.35rem)', fontWeight: 700, color: 'rgba(255,255,255,0.92)', fontStyle: useGlass ? 'italic' : 'normal' }}>
          {block.title}
        </h3>
        {block.description && useGlass && (
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{block.description}</p>
        )}
        {hasCta && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300" style={{ color: accent }}>
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

  const { data: allSettings = [] } = useQuery({
    queryKey: ['homepageSettings'],
    queryFn: () => base44.entities.HomepageSettings.list(),
    staleTime: 2 * 60 * 1000,
  });
  const singleton = allSettings.find(s => s.active) || {};
  const overlayAlpha = singleton.hero_overlay_alpha ?? 0.5;

  // All blocks now use ImageTile — positions 0+ are all treated the same
  const tiles = dbBlocks;

  return (
    <section className="py-6 md:py-8 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">


        {/* Mobile: vertical stack */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {/* Hero tile full width */}
          <div style={{ height: 340 }}>
            <HeroTile className="w-full h-full" overlayAlpha={overlayAlpha} />
          </div>
          {/* All image tiles in 2 cols */}
          <div className="grid grid-cols-2 gap-2.5">
            {tiles.slice(1).map((tile, i) => (
              <div key={tile.id} style={{ height: 180 }}>
                <ImageTile block={tile} span="w-full h-full" accentIdx={i + 1} />
              </div>
            ))}
          </div>
        </div>

        {/*
          Desktop layout — 3 rows, 4 cols:
          Row 1+2: Hero spans cols 1-2 (~440px tall = 33% less than before), cols 3-4 have 2 stacked tiles each
          Row 3: 4 tiles across full width — tiles[0], culture card, editorial card, tiles[4]
        */}
        {/*
          Desktop layout — editorial asymmetric grid:
          Cols: Hero(wide) | Feature tall tile | 2 stacked small tiles | glass cards stacked
          Row structure:
            Hero: cols 1-2, rows 1-3
            Col 3: tiles[1] spans rows 1-2 (tall feature), tiles[3] row 3 (short)
            Col 4: tiles[2] row 1 (short), tiles[4] row 2 (short), editorial card row 3
            Col 5: culture card spans rows 1-3 (tall sidebar)
        */}
        <div className="hidden md:grid gap-2.5" style={{
          gridTemplateColumns: '5fr 5fr 18% 18% 16%',
          gridTemplateRows: '180px 180px 180px',
        }}>

          {/* Hero tile — spans cols 1-2, rows 1-3 */}
          <div style={{ gridColumn: '1 / 3', gridRow: '1 / 4', height: '100%' }}>
            <HeroTile className="w-full h-full" overlayAlpha={overlayAlpha} />
          </div>

          {/* Col 3: tiles[1] — tall feature, spans rows 1-2 */}
          {tiles[1] && (
            <div style={{ gridColumn: '3', gridRow: '1 / 3', height: '100%' }}>
              <ImageTile block={tiles[1]} span="w-full h-full" accentIdx={1} />
            </div>
          )}

          {/* Col 3 row 3: tiles[3] — short */}
          {tiles[3] && (
            <div style={{ gridColumn: '3', gridRow: '3', height: '100%' }}>
              <ImageTile block={tiles[3]} span="w-full h-full" accentIdx={3} />
            </div>
          )}

          {/* Col 4 row 1: tiles[2] — short */}
          {tiles[2] && (
            <div style={{ gridColumn: '4', gridRow: '1', height: '100%' }}>
              <ImageTile block={tiles[2]} span="w-full h-full" accentIdx={2} />
            </div>
          )}

          {/* Col 4 row 2: tiles[4] — short */}
          {tiles[4] && (
            <div style={{ gridColumn: '4', gridRow: '2', height: '100%' }}>
              <ImageTile block={tiles[4]} span="w-full h-full" accentIdx={4} />
            </div>
          )}

          {/* Col 4 row 3: tiles[0] (On Track) — short */}
          {tiles[0] && (
            <div style={{ gridColumn: '4', gridRow: '3', height: '100%' }}>
              <ImageTile block={tiles[0]} span="w-full h-full" accentIdx={0} />
            </div>
          )}

          {/* Col 5 rows 1-2: tile[5] */}
          {tiles[5] && (
            <div style={{ gridColumn: '5', gridRow: '1 / 3', height: '100%' }}>
              <ImageTile block={tiles[5]} span="w-full h-full" accentIdx={5} />
            </div>
          )}

          {/* Col 5 row 3: tile[6] */}
          {tiles[6] && (
            <div style={{ gridColumn: '5', gridRow: '3', height: '100%' }}>
              <ImageTile block={tiles[6]} span="w-full h-full" accentIdx={6} />
            </div>
          )}

        </div>
      </div>
    </section>
  );
}