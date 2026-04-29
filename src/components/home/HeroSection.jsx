import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Users, MapPin, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Fallback slides — visual + message only. CTAs are fixed system-wide.
const FALLBACK_SLIDES = [
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1660337288537-71ae329ba2f0?w=1800&q=90&fit=crop',
    headline_line1: 'IN MOTION.',
    headline_line2: 'ON PURPOSE.',
    subtext: 'Not just moving, moving with intent.',
  },
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=1800&q=90&fit=crop',
    headline_line1: "YOU'RE GOING",
    headline_line2: 'TO LOSE.',
    subtext: "That's where everything is built.",
  },
  {
    media_type: 'image',
    background_url: 'https://images.unsplash.com/photo-1558981852-426c349548ab?w=1800&q=90&fit=crop',
    headline_line1: 'THIS IS',
    headline_line2: 'HIJINX.',
    subtext: "For those who don't sit still.",
  },
];

// Fixed CTA system — same on every slide
const PRIMARY_CTA = { label: 'Create Your Profile', to: '/DriverProfileSetup' };
const SECONDARY_CTA = { label: 'Explore the Platform', to: '#homepage-bridge' };

const INTERVAL = 4500;

// Compact stat signal items
const STAT_ITEMS = [
  { key: 'Driver', label: 'Drivers', entity: 'Driver', icon: Users },
  { key: 'Track', label: 'Tracks', entity: 'Track', icon: MapPin },
  { key: 'Series', label: 'Series', entity: 'Series', icon: BarChart2 },
];

function useEntityCount(entityName) {
  return useQuery({
    queryKey: ['hero-stat', entityName],
    queryFn: async () => {
      const data = await base44.entities[entityName].list('-created_date', 500);
      return Array.isArray(data) ? data.length : 0;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function StatSignal({ label, entity, icon: Icon }) {
  const { data: count, isLoading } = useEntityCount(entity);
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 10,
      }}
    >
      <Icon className="w-3.5 h-3.5 text-white/35 flex-shrink-0" strokeWidth={1.5} />
      <div>
        <div className="font-mono text-[7px] tracking-[0.3em] text-white/30 uppercase leading-none mb-0.5">{label}</div>
        {isLoading ? (
          <div className="w-6 h-3 bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="text-white font-black text-sm leading-none">{(count || 0).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}

function handleAnchorClick(e, to) {
  if (to.startsWith('#')) {
    e.preventDefault();
    const el = document.getElementById(to.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef(null);

  const { data: dbSlides = [] } = useQuery({
    queryKey: ['heroSlides'],
    queryFn: () => base44.entities.HeroSlide.filter({ is_active: true }, 'sort_order'),
    staleTime: 2 * 60 * 1000,
  });

  const SLIDES = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES;

  // Preload images
  useEffect(() => {
    SLIDES.forEach(s => {
      if ((s.media_type || s.type) === 'image' && (s.background_url || s.bg)) {
        const img = new Image();
        img.src = s.background_url || s.bg;
      }
    });
  }, [SLIDES.length]);

  const go = (idx) => setCurrent((idx + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(current + 1), INTERVAL);
    return () => clearInterval(t);
  }, [paused, current, SLIDES.length]);

  useEffect(() => {
    if (current === 0 && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  const raw = SLIDES[current] || SLIDES[0];
  const slide = {
    type: raw.media_type || raw.type || 'image',
    bg: raw.background_url || raw.bg || '',
    videoSrc: raw.background_url || raw.videoSrc || '',
    headline: [
      raw.headline_line1 || raw.headline?.[0] || '',
      raw.headline_line2 || raw.headline?.[1] || '',
    ].filter(Boolean),
    sub: raw.subtext || raw.sub || '',
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: 'calc(100vh - 80px)', minHeight: 400, maxHeight: 720 }}
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
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          {slide.type === 'video' ? (
            <video
              ref={videoRef}
              src={slide.videoSrc}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.bg})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
          <div className="absolute inset-x-0 top-0 h-28" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)' }} />
          {/* Film grain */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.04, 0.07, 0.04] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Scanning accent line */}
      <motion.div
        className="absolute inset-x-0 z-10 pointer-events-none"
        style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(29,161,161,0.2), transparent)' }}
        animate={{ top: ['15%', '85%', '15%'] }}
        transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 sm:px-6 md:px-12 lg:px-20 pb-16 pt-8">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-8 items-center max-w-7xl mx-auto">

          {/* LEFT — Glass card with headline + fixed CTAs */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-xl"
                style={{
                  background: 'rgba(5,10,10,0.5)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  borderRadius: 3,
                  padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1.25rem, 5vw, 2.5rem)',
                }}
              >
                {/* Brand marker */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-[2px] bg-[#1DA1A1]" />
                  <span className="font-mono text-[9px] tracking-[0.5em] text-[#1DA1A1] uppercase font-bold">
                    HIJINX
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.0] tracking-tight mb-3">
                  {slide.headline.map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </h1>

                {/* Sub */}
                <p className="text-sm text-white/50 font-medium leading-relaxed mb-6 max-w-xs">
                  {slide.sub}
                </p>

                {/* Fixed CTAs — consistent across all slides */}
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    to={PRIMARY_CTA.to}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-black tracking-wide uppercase hover:bg-[#1DA1A1] hover:text-white transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    {PRIMARY_CTA.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                  <a
                    href={SECONDARY_CTA.to}
                    onClick={(e) => handleAnchorClick(e, SECONDARY_CTA.to)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-black tracking-wide uppercase transition-colors hover:text-[#1DA1A1]"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2 }}
                  >
                    {SECONDARY_CTA.label}
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT — Compact motorsports signal (3 stat cards) */}
          <div className="lg:col-span-2 hidden sm:flex flex-col gap-2 lg:max-w-[200px] w-full lg:ml-auto">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-[1px] bg-[#1DA1A1]" />
              <span className="font-mono text-[7px] tracking-[0.45em] text-[#1DA1A1] uppercase">The World of Racing</span>
            </div>
            {STAT_ITEMS.map(s => (
              <StatSignal key={s.key} label={s.label} entity={s.entity} icon={s.icon} />
            ))}
          </div>

        </div>
      </div>

      {/* Slide nav dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button onClick={() => go(current - 1)} className="p-1.5 text-white/30 hover:text-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="transition-all duration-300"
              style={{
                width: i === current ? 20 : 5,
                height: 2,
                borderRadius: 1,
                background: i === current ? '#1DA1A1' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
        <button onClick={() => go(current + 1)} className="p-1.5 text-white/30 hover:text-white transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}