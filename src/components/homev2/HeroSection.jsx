import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDE_DURATION = 6000;

// Curated brand slides — no entity dependency
const BRAND_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
    eyebrow: 'The Platform',
    headline: 'Motorsports,\nCulture,',
    accentWord: 'Competition.',
    sub: 'Where racing, media, and identity collide.',
    cta: { label: 'Explore', href: createPageUrl('MotorsportsHome') },
    ctaSecondary: { label: 'All Drivers', href: createPageUrl('DriverDirectory') },
  },
  {
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&q=80',
    eyebrow: 'The Outlet',
    headline: 'Stories That\nMove',
    accentWord: 'The Sport.',
    sub: 'Media, journalism, and creative work from inside the culture.',
    cta: { label: 'Read Stories', href: createPageUrl('OutletHome') },
    ctaSecondary: { label: 'Submit a Story', href: createPageUrl('OutletSubmit') },
  },
  {
    image: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1600&q=80',
    eyebrow: 'INDEX46',
    headline: 'Drivers, Teams,',
    accentWord: 'Verified.',
    sub: 'Verified profiles, results, and history across motorsports.',
    cta: { label: 'Enter INDEX46', href: createPageUrl('DriverDirectory') },
    ctaSecondary: { label: 'View Series', href: createPageUrl('SeriesHome') },
  },
];

const slideVariants = {
  enter: (dir) => ({ scale: 1.05, opacity: 0, x: dir > 0 ? '2%' : '-2%' }),
  center: { scale: 1, opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir) => ({ scale: 0.97, opacity: 0, x: dir > 0 ? '-2%' : '2%', transition: { duration: 0.5, ease: [0.55, 0, 1, 0.45] } }),
};

export default function HeroSection({ stats }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const advance = useCallback((dir = 1) => {
    setDirection(dir);
    setIndex(i => (i + dir + BRAND_SLIDES.length) % BRAND_SLIDES.length);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => advance(1), SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [index, advance]);

  const slide = BRAND_SLIDES[index];

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
            src={slide.image}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.38) contrast(1.1) saturate(0.9)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.95) 40%, rgba(10,10,10,0.25) 75%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9) 18%, transparent 55%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col justify-between max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Top: eyebrow */}
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

        {/* Middle: headline */}
        <div className="flex-1 flex items-center">
          <div className="max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div key={`hl-${index}`}
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                <h1 className="font-black leading-none tracking-tight" style={{ color: '#FFF8F5', fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}>
                  {slide.headline.split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                  <span style={{ color: '#00FFDA' }}>{slide.accentWord}</span>
                </h1>
                {slide.sub && (
                  <p className="mt-6 text-base max-w-md leading-relaxed" style={{ color: 'rgba(255,248,245,0.45)' }}>
                    {slide.sub}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-8">
                  <Link to={slide.cta.href}
                    className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                    style={{ background: '#FFF8F5', color: '#0a0a0a' }}>
                    {slide.cta.label}
                  </Link>
                  {slide.ctaSecondary && (
                    <Link to={slide.ctaSecondary.href}
                      className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                      style={{ border: '1px solid rgba(255,248,245,0.18)', color: 'rgba(255,248,245,0.6)' }}>
                      {slide.ctaSecondary.label}
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom: stats + slide controls */}
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

          {/* Slide dots */}
          <div className="flex items-center gap-2 shrink-0">
            {BRAND_SLIDES.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                className="transition-all"
                style={{
                  width: i === index ? 24 : 8,
                  height: 3,
                  background: i === index ? '#FFF8F5' : 'rgba(255,248,245,0.2)',
                  border: 'none',
                  outline: 'none',
                }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}