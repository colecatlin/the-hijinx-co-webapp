import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDE_DURATION = 5000;

// Fallback cinematic images if no driver media
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&q=80',
  'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=1600&q=80',
];

const slideVariants = {
  enter: (dir) => ({ scale: 1.06, opacity: 0, x: dir > 0 ? '3%' : '-3%' }),
  center: { scale: 1, opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir) => ({ scale: 0.97, opacity: 0, x: dir > 0 ? '-3%' : '3%', transition: { duration: 0.5, ease: [0.55, 0, 1, 0.45] } }),
};

export default function HeroSection({ stats, featuredDrivers = [], featuredStory }) {
  const slides = featuredDrivers.slice(0, 4);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const advance = useCallback((dir = 1) => {
    setDirection(dir);
    setIndex(i => (i + dir + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => advance(1), SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [index, advance, slides.length]);

  const current = slides[index];
  const heroImage = current?.hero_image_url || current?.profile_image_url || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];

  return (
    <section className="relative overflow-hidden" style={{ height: 'min(90vh, 780px)', background: '#0a0a0a' }}>
      {/* Full-bleed background slide */}
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
            src={heroImage}
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.45) contrast(1.15) saturate(1.1)' }}
          />
          {/* Gradient overlays — left-heavy for content, bottom for stats */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.92) 35%, rgba(10,10,10,0.3) 70%, transparent 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.85) 20%, transparent 60%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* Driver name overlay — right side */}
      {current && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`name-${index}`}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-10 hidden lg:block text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.12, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.6 }}
          >
            <div className="font-black leading-none select-none" style={{ fontSize: 'clamp(5rem, 12vw, 11rem)', color: '#FFF8F5', letterSpacing: '-0.04em' }}>
              {current.first_name}<br />{current.last_name}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col justify-between max-w-7xl mx-auto px-6 py-10 md:py-14">
        {/* Top: eyebrow */}
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>The Platform</span>
        </motion.div>

        {/* Middle: headline */}
        <div className="flex-1 flex items-center">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.h1
                key={`hl-${index}`}
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="font-black leading-none tracking-tight"
                style={{ color: '#FFF8F5', fontSize: 'clamp(3rem, 7vw, 6rem)' }}
              >
                {current ? (
                  <>{current.first_name}<br /><span style={{ color: '#00FFDA' }}>{current.last_name}</span></>
                ) : (
                  <>Motorsports,<br /><span style={{ color: '#00FFDA' }}>Culture,</span><br />Competition.</>
                )}
              </motion.h1>
            </AnimatePresence>
            {current?.primary_discipline && (
              <motion.div key={`disc-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}
                className="font-mono text-[11px] tracking-[0.35em] uppercase mt-4" style={{ color: 'rgba(255,248,245,0.5)' }}>
                {current.primary_discipline}
              </motion.div>
            )}
            <motion.div className="flex flex-wrap items-center gap-4 mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
              {current ? (
                <Link to={`/drivers/${current.slug || current.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                  style={{ background: '#00FFDA', color: '#232323' }}>
                  View Profile
                </Link>
              ) : (
                <Link to={createPageUrl('MotorsportsHome')}
                  className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                  style={{ background: '#00FFDA', color: '#232323' }}>
                  Explore
                </Link>
              )}
              <Link to={createPageUrl('DriverDirectory')}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase border"
                style={{ border: '1px solid rgba(255,248,245,0.25)', color: '#FFF8F5' }}>
                All Drivers
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Bottom: stats + slide controls */}
        <div className="flex items-end justify-between gap-6">
          {stats && (
            <motion.div className="flex flex-wrap gap-6 md:gap-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
              {[
                { label: 'Drivers', value: stats.driver_count },
                { label: 'Series',  value: stats.series_count },
                { label: 'Tracks',  value: stats.track_count },
                { label: 'Events',  value: stats.event_count },
              ].filter(s => s.value != null).map(stat => (
                <div key={stat.label}>
                  <div className="font-black text-2xl md:text-3xl leading-none" style={{ color: '#FFF8F5' }}>{stat.value.toLocaleString()}</div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'rgba(255,248,245,0.35)' }}>{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Slide nav */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              {slides.map((s, i) => {
                const img = s.profile_image_url || s.hero_image_url;
                return (
                  <button key={i} onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                    className="relative overflow-hidden rounded-sm transition-all"
                    style={{ width: i === index ? 48 : 32, height: i === index ? 48 : 32, border: i === index ? '2px solid #00FFDA' : '2px solid rgba(255,248,245,0.15)' }}>
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.6)' }} />
                    ) : (
                      <div style={{ background: '#1A3249', width: '100%', height: '100%' }} />
                    )}
                    {i === index && (
                      <motion.div className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ background: '#00FFDA' }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
                        key={`prog-${index}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}