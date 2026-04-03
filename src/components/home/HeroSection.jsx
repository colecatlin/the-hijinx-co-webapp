import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { getOutletStoryUrl } from '@/lib/storyUrl';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Globe } from 'lucide-react';

const BG_1 = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=85&fit=crop';
const BG_2 = 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=1800&q=85&fit=crop';
const BG_3 = 'https://images.unsplash.com/photo-1591445645563-8c748b56dc5e?w=1800&q=85&fit=crop';

const BRAND_SLIDES = [
  {
    tag: 'HIJINX',
    h1: 'Where Motorsports',
    h2: 'Lives Online.',
    sub: 'Drivers, teams, tracks, and culture — all in one place.',
    cta1: { label: 'Explore the World', to: createPageUrl('MotorsportsHome') },
    cta2: { label: 'Read The Outlet', to: createPageUrl('OutletHome') },
    bg: BG_1,
    accent: '#00FFDA',
  },
  {
    tag: 'THE OUTLET',
    h1: 'Motorsports Culture,',
    h2: 'Documented.',
    sub: 'Editorial coverage. Race reports. The sport, on our terms.',
    cta1: { label: 'Read Stories', to: createPageUrl('OutletHome') },
    cta2: { label: 'Browse Drivers', to: createPageUrl('DriverDirectory') },
    bg: BG_2,
    accent: '#FF6B35',
  },
  {
    tag: 'INDEX46',
    h1: 'The Racing Platform',
    h2: 'Built Different.',
    sub: 'Verified results. Real profiles. The infrastructure the sport deserves.',
    cta1: { label: 'Explore INDEX46', to: createPageUrl('MotorsportsHome') },
    cta2: { label: 'Driver Directory', to: createPageUrl('DriverDirectory') },
    bg: BG_3,
    accent: '#E5FF00',
  },
];

function buildSlides(featuredDriver, featuredStory) {
  const extra = [];
  if (featuredDriver) {
    extra.push({
      tag: (featuredDriver.primary_discipline || 'Driver').toUpperCase(),
      h1: featuredDriver.first_name,
      h2: featuredDriver.last_name,
      sub: featuredDriver.tagline || featuredDriver.career_status || 'Motorsports competitor.',
      cta1: { label: 'View Profile', to: `/drivers/${featuredDriver.slug || featuredDriver.id}` },
      cta2: { label: 'Browse Drivers', to: createPageUrl('DriverDirectory') },
      bg: featuredDriver.hero_image_url || featuredDriver.profile_image_url || BG_1,
      accent: '#00FFDA',
    });
  }
  if (featuredStory) {
    const words = (featuredStory.title || '').split(' ');
    extra.push({
      tag: (featuredStory.primary_category || 'The Outlet').toUpperCase(),
      h1: words.slice(0, 3).join(' ') || 'Latest',
      h2: words.slice(3, 7).join(' ') || 'Story',
      sub: featuredStory.subtitle || 'Read the latest from The Outlet.',
      cta1: { label: 'Read Story', to: getOutletStoryUrl(featuredStory) },
      cta2: { label: 'All Stories', to: createPageUrl('OutletHome') },
      bg: featuredStory.cover_image || BG_2,
      accent: '#FF6B35',
    });
  }
  return [...extra, ...BRAND_SLIDES];
}

export default function HeroSection({ featuredDriver, featuredStory, stats }) {
  const slides = useMemo(() => buildSlides(featuredDriver, featuredStory), [featuredDriver, featuredStory]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const advance = useCallback(() => setActive(i => (i + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, 3500);
    return () => clearInterval(id);
  }, [paused, advance]);

  const slide = slides[active >= slides.length ? 0 : active];

  const statItems = stats ? [
    stats.driver_count > 0 && { value: stats.driver_count, label: 'Drivers' },
    stats.series_count > 0 && { value: stats.series_count, label: 'Series' },
    stats.track_count > 0 && { value: stats.track_count, label: 'Tracks' },
    stats.event_count > 0 && { value: stats.event_count, label: 'Events' },
  ].filter(Boolean) : [];

  return (
    <section
      className="relative w-full h-screen min-h-[600px] max-h-[1000px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <AnimatePresence mode="sync">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.bg}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Noise grain overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundSize: '256px' }}
      />

      {/* Accent line top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
        style={{ background: `linear-gradient(90deg, ${slide.accent}CC 0%, transparent 70%)` }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 lg:px-24 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: mounted ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            {/* Tag */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[2px]" style={{ background: slide.accent }} />
              <span className="font-mono text-[10px] tracking-[0.45em] uppercase font-bold"
                style={{ color: slide.accent }}>
                {slide.tag}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-[0.88] mb-6">
              {slide.h1}
              <br />
              <span style={{ color: slide.accent }}>{slide.h2}</span>
            </h1>

            {/* Sub */}
            <p className="text-white/60 text-base md:text-lg max-w-sm leading-relaxed mb-10 font-light">
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                to={slide.cta1.to}
                className="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-black tracking-wider uppercase transition-all duration-200 hover:gap-3"
                style={{ background: slide.accent, color: '#0A0A0A' }}
              >
                {slide.cta1.label}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to={slide.cta2.to}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold tracking-wide uppercase border border-white/20 text-white/80 hover:border-white/50 hover:text-white transition-all duration-200"
              >
                {slide.cta2.label}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stats strip */}
        {statItems.length > 0 && (
          <div className="absolute bottom-16 left-8 md:left-16 lg:left-24 flex gap-8">
            {statItems.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-white">{s.value?.toLocaleString()}</div>
                <div className="text-[9px] font-mono tracking-[0.3em] text-white/40 uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 right-8 md:right-16 z-10 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setPaused(true); }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === active ? 24 : 6,
              height: 6,
              background: i === active ? slide.accent : 'rgba(255,255,255,0.25)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}