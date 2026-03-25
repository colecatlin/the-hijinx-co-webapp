import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SLIDE_DURATION = 5500;

// Overlay strength → CSS brightness on the image
const OVERLAY_MAP = {
  light:  'brightness(0.5) contrast(1.05) saturate(0.95)',
  medium: 'brightness(0.38) contrast(1.1) saturate(0.9)',
  heavy:  'brightness(0.25) contrast(1.15) saturate(0.85)',
};

// Fallback brand slides — used when no live slides exist in DB
const FALLBACK_SLIDES = [
  {
    eyebrow: 'The Platform',
    title: 'Motorsports,\nCulture,',
    accentWord: 'Competition.',
    subtitle: 'Where racing, media, and identity collide.',
    cta_primary_label: 'Explore',
    cta_primary_url: createPageUrl('MotorsportsHome'),
    cta_secondary_label: 'All Drivers',
    cta_secondary_url: createPageUrl('DriverDirectory'),
    media_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    overlay_strength: 'medium',
  },
  {
    eyebrow: 'The Outlet',
    title: 'Stories That\nMove',
    accentWord: 'The Sport.',
    subtitle: 'Media, journalism, and creative work from inside the culture.',
    cta_primary_label: 'Read Stories',
    cta_primary_url: createPageUrl('OutletHome'),
    cta_secondary_label: 'Submit a Story',
    cta_secondary_url: createPageUrl('OutletSubmit'),
    media_url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&q=80',
    overlay_strength: 'medium',
  },
  {
    eyebrow: 'INDEX46',
    title: 'Drivers, Teams,',
    accentWord: 'Verified.',
    subtitle: 'Verified profiles, results, and history across motorsports.',
    cta_primary_label: 'Enter INDEX46',
    cta_primary_url: createPageUrl('DriverDirectory'),
    cta_secondary_label: 'View Series',
    cta_secondary_url: createPageUrl('SeriesHome'),
    media_url: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1600&q=80',
    overlay_strength: 'heavy',
  },
];

const slideVariants = {
  enter: (dir) => ({ scale: 1.05, opacity: 0, x: dir > 0 ? '2%' : '-2%' }),
  center: { scale: 1, opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir) => ({ scale: 0.97, opacity: 0, x: dir > 0 ? '-2%' : '2%', transition: { duration: 0.5, ease: [0.55, 0, 1, 0.45] } }),
};

function normalizeSlide(s) {
  // Normalize DB entity shape to internal shape
  return {
    eyebrow: s.eyebrow || '',
    title: s.title || '',
    accentWord: s.accentWord || '',
    subtitle: s.subtitle || '',
    cta_primary_label: s.cta_primary_label || '',
    cta_primary_url: s.cta_primary_url || '',
    cta_secondary_label: s.cta_secondary_label || '',
    cta_secondary_url: s.cta_secondary_url || '',
    media_url: s.media_url || s.image || '',
    mobile_media_url: s.mobile_media_url || '',
    overlay_strength: s.overlay_strength || 'medium',
  };
}

function isActiveSlide(slide) {
  if (slide.status !== 'live') return false;
  const now = new Date();
  if (slide.active_from && new Date(slide.active_from) > now) return false;
  if (slide.active_until && new Date(slide.active_until) < now) return false;
  return true;
}

export default function HeroSection({ stats }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Load curated hero slides from DB
  const { data: rawSlides = [] } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HomepageHeroSlide.list('sort_order'),
    staleTime: 2 * 60 * 1000,
  });

  // Filter to live + date-active, normalize, fallback
  const slides = (() => {
    const live = rawSlides.filter(isActiveSlide).map(normalizeSlide);
    return live.length > 0 ? live : FALLBACK_SLIDES;
  })();

  const advance = useCallback((dir = 1) => {
    setDirection(dir);
    setIndex(i => (i + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => advance(1), SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [index, advance, slides.length]);

  // Reset index if slides array shrinks
  useEffect(() => {
    setIndex(i => (i >= slides.length ? 0 : i));
  }, [slides.length]);

  const slide = slides[index] || slides[0];
  const imgFilter = OVERLAY_MAP[slide.overlay_strength] || OVERLAY_MAP.medium;

  return (
    <section className="relative overflow-hidden" style={{ height: 'min(88vh, 760px)', background: '#0a0a0a' }}>
      {/* Full-bleed background */}
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={`bg-${index}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.media_url}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: imgFilter }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.95) 40%, rgba(10,10,10,0.25) 75%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9) 18%, transparent 55%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col justify-between max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Eyebrow */}
        <AnimatePresence mode="wait">
          <motion.div key={`ew-${index}`} className="flex items-center gap-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}>
            <div className="w-5 h-px" style={{ background: 'rgba(255,248,245,0.3)' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: 'rgba(255,248,245,0.45)' }}>
              {slide.eyebrow}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Headline */}
        <div className="flex-1 flex items-center">
          <div className="max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div key={`hl-${index}`}
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                <h1 className="font-black leading-none tracking-tight" style={{ color: '#FFF8F5', fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>
                  {slide.title.split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                  {slide.accentWord && <span style={{ color: '#00FFDA' }}>{slide.accentWord}</span>}
                </h1>
                {slide.subtitle && (
                  <p className="mt-6 text-base max-w-md leading-relaxed" style={{ color: 'rgba(255,248,245,0.45)' }}>
                    {slide.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-8">
                  {slide.cta_primary_label && slide.cta_primary_url && (
                    <Link to={slide.cta_primary_url}
                      className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                      style={{ background: '#FFF8F5', color: '#0a0a0a' }}>
                      {slide.cta_primary_label}
                    </Link>
                  )}
                  {slide.cta_secondary_label && slide.cta_secondary_url && (
                    <Link to={slide.cta_secondary_url}
                      className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                      style={{ border: '1px solid rgba(255,248,245,0.18)', color: 'rgba(255,248,245,0.6)' }}>
                      {slide.cta_secondary_label}
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom: stats + dots */}
        <div className="flex items-end justify-between gap-6">
          {stats && (
            <motion.div className="flex flex-wrap gap-8 md:gap-12"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
              {[
                { label: 'Drivers', value: stats.driver_count },
                { label: 'Series',  value: stats.series_count },
                { label: 'Events',  value: stats.event_count },
              ].filter(s => s.value != null).map(stat => (
                <div key={stat.label}>
                  <div className="font-black text-2xl md:text-3xl leading-none" style={{ color: '#FFF8F5' }}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'rgba(255,248,245,0.3)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Slide dot indicators */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              {slides.map((_, i) => (
                <button key={i}
                  onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                  className="transition-all"
                  style={{
                    width: i === index ? 24 : 8,
                    height: 3,
                    background: i === index ? '#FFF8F5' : 'rgba(255,248,245,0.2)',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}