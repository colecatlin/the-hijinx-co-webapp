import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDE_DURATION = 5000;

const textReveal = {
  hidden: { y: 24, opacity: 0 },
  visible: (i = 0) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroSection({ stats, featuredDrivers = [], featuredStory }) {
  const slides = featuredDrivers.slice(0, 4);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const advance = useCallback((dir = 1) => {
    setDirection(dir);
    setIndex(i => (i + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setTimeout(() => advance(1), SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [index, advance, slides.length]);

  const current = slides[index];
  const heroImage = current?.hero_image_url || current?.profile_image_url || null;

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? '8%' : '-8%', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
    exit: (dir) => ({ x: dir > 0 ? '-8%' : '8%', opacity: 0, transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] } }),
  };

  return (
    <section style={{ background: '#232323' }} className="relative overflow-hidden">
      {/* Background slide */}
      <AnimatePresence custom={direction} initial={false}>
        {heroImage && (
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
              style={{ filter: 'brightness(0.22) contrast(1.2)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #232323 55%, transparent 100%)' }} />
          </motion.div>
        )}
      </AnimatePresence>
      {!heroImage && <div className="absolute inset-0 z-0" style={{ background: '#232323' }} />}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <motion.div className="flex items-center gap-3 mb-6" custom={0} variants={textReveal} initial="hidden" animate="visible">
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>The Platform</span>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.h1
              key={`headline-${index}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="font-black leading-none tracking-tight mb-6"
              style={{ color: '#FFF8F5', fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}
            >
              Motorsports,<br />
              <span style={{ color: '#00FFDA' }}>Culture,</span><br />
              and Competition.
            </motion.h1>
          </AnimatePresence>

          <motion.p custom={2} variants={textReveal} initial="hidden" animate="visible"
            className="text-base font-medium mb-10 max-w-md leading-relaxed"
            style={{ color: 'rgba(255,248,245,0.6)' }}
          >
            HIJINX — the platform where motorsports, media, and culture collide.
          </motion.p>

          <motion.div custom={3} variants={textReveal} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-4">
            <Link
              to={createPageUrl('MotorsportsHome')}
              className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase transition-all hover:brightness-110"
              style={{ background: '#00FFDA', color: '#232323' }}
            >
              Explore Motorsports
            </Link>
            <Link
              to={createPageUrl('DriverDirectory')}
              className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase border transition-all hover:border-[#00FFDA] hover:text-[#00FFDA]"
              style={{ border: '1px solid rgba(255,248,245,0.2)', color: '#FFF8F5' }}
            >
              Browse Drivers
            </Link>
          </motion.div>
        </div>

        {/* Slide controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 right-6 flex items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                className="relative overflow-hidden transition-all"
                style={{ height: 2, width: i === index ? 32 : 12, background: i === index ? '#00FFDA' : 'rgba(255,248,245,0.2)' }}
              >
                {i === index && (
                  <motion.div
                    key={`prog-${index}`}
                    className="absolute inset-y-0 left-0"
                    style={{ background: '#FFF8F5', opacity: 0.4 }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <motion.div custom={4} variants={textReveal} initial="hidden" animate="visible"
            className="mt-16 pt-8 border-t flex flex-wrap gap-8"
            style={{ borderColor: 'rgba(255,248,245,0.1)' }}
          >
            {[
              { label: 'Drivers', value: stats.driver_count },
              { label: 'Series',  value: stats.series_count },
              { label: 'Tracks',  value: stats.track_count },
              { label: 'Events',  value: stats.event_count },
            ].filter(s => s.value != null).map(stat => (
              <div key={stat.label}>
                <div className="font-black text-3xl leading-none mb-1" style={{ color: '#FFF8F5' }}>{stat.value.toLocaleString()}</div>
                <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,248,245,0.4)' }}>{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: '#00FFDA', opacity: 0.3 }} />
    </section>
  );
}