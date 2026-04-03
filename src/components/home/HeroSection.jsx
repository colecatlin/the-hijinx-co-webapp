import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// Slide 1 = video. Slides 2+ = image-based.
const SLIDES = [
  {
    type: 'video',
    videoSrc: 'https://videos.pexels.com/video-files/3792197/3792197-hd_1920_1080_25fps.mp4',
    headline: ['Built for the', 'ones who race.'],
    sub: 'Media. Motorsports. Culture. All in one place.',
    cta1: { label: 'Enter the Outlet', to: createPageUrl('OutletHome') },
    cta2: { label: 'Explore INDEX46', to: createPageUrl('MotorsportsHome') },
  },
  {
    type: 'image',
    bg: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=1800&q=85&fit=crop',
    headline: ['The story of', 'motorsports.'],
    sub: 'Grassroots to national. Every race. Every driver.',
    cta1: { label: 'Read the Outlet', to: createPageUrl('OutletHome') },
    cta2: { label: 'Driver Directory', to: createPageUrl('DriverDirectory') },
  },
  {
    type: 'image',
    bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=85&fit=crop',
    headline: ['Where culture', 'meets competition.'],
    sub: 'Style, speed, and everything in between.',
    cta1: { label: 'Shop Apparel', to: createPageUrl('ApparelHome') },
    cta2: { label: 'Learn More', to: createPageUrl('About') },
  },
  {
    type: 'image',
    bg: 'https://images.unsplash.com/photo-1540747913346-19212a4c1ba5?w=1800&q=85&fit=crop',
    headline: ['Race day lives', 'here.'],
    sub: 'Results, standings, registration — all on INDEX46.',
    cta1: { label: 'View Events', to: createPageUrl('EventDirectory') },
    cta2: { label: 'Register Now', to: createPageUrl('Registration') },
  },
];

const INTERVAL = 6000;

export default function HeroSection({ stats = {} }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  const go = (idx) => setCurrent((idx + SLIDES.length) % SLIDES.length);
  const next = () => go(current + 1);
  const prev = () => go(current - 1);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, INTERVAL);
    return () => clearTimeout(timerRef.current);
  }, [current, paused]);

  // Ensure video plays when on slide 0
  useEffect(() => {
    if (current === 0 && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  const slide = SLIDES[current];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: 'calc(100vh - 112px)', minHeight: 520, maxHeight: 780 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          {slide.type === 'video' ? (
            <video
              ref={videoRef}
              src={slide.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.bg})` }}
            />
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-black/55" />
          {/* Vignette */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
          }} />
          {/* Subtle light haze top */}
          <div className="absolute inset-x-0 top-0 h-32" style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)'
          }} />
          {/* Grain texture */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Content — glass card */}
      <div className="relative z-10 h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="max-w-2xl"
              style={{
                background: 'rgba(10,10,10,0.45)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
                borderRadius: 2,
                padding: '2rem 2.5rem',
              }}
            >
              {/* Accent line */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-5 h-[2px] bg-[#00FFDA]" />
                <span className="font-mono text-[9px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">
                  HIJINX
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.0] tracking-tight mb-4">
                {slide.headline.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>

              {/* Sub */}
              <p className="text-sm md:text-base text-white/55 font-medium leading-relaxed mb-7 max-w-sm">
                {slide.sub}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to={slide.cta1.to}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-bold tracking-wide uppercase hover:bg-[#00FFDA] transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  {slide.cta1.label} <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  to={slide.cta2.to}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold tracking-wide uppercase transition-colors hover:text-[#00FFDA]"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2 }}
                >
                  {slide.cta2.label}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Nav controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        {/* Prev */}
        <button
          onClick={prev}
          className="p-1.5 text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="transition-all duration-300"
              style={{
                width: i === current ? 24 : 6,
                height: 2,
                borderRadius: 1,
                background: i === current ? '#00FFDA' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={next}
          className="p-1.5 text-white/40 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats strip — bottom right */}
      {(stats.drivers || stats.tracks || stats.events) && (
        <div className="absolute bottom-6 right-6 z-20 hidden md:flex items-center gap-6">
          {[
            { label: 'Drivers', val: stats.drivers },
            { label: 'Tracks', val: stats.tracks },
            { label: 'Events', val: stats.events },
          ].filter(s => s.val).map(s => (
            <div key={s.label} className="text-right">
              <div className="text-lg font-black text-white leading-none">{s.val?.toLocaleString()}</div>
              <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}