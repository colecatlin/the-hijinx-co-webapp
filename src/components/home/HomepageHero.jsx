import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Gauge, ShoppingBag, Globe, Newspaper, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const FALLBACK_BG = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/db194cd55_501757068_24217767807816436_3945910434470038974_n.jpg';

// Motorsports action images — used as fallbacks when no entity-specific image exists
const MOTORSPORTS_BG_1 = 'https://images.unsplash.com/photo-1504998781941-14a1204bd6ee?w=1600&q=80&fit=crop'; // pit lane, mechanics
const MOTORSPORTS_BG_2 = 'https://images.unsplash.com/photo-1591134119792-f8b7d56c5dd7?w=1600&q=80&fit=crop'; // racing action

const BRAND_SLIDES = [
  {
    eyebrow:        'RACE CORE',
    headline_line1: 'The operating system',
    headline_line2: 'for motorsports.',
    subtext:        'Event management, driver registration, results, and standings — all in one platform.',
    cta_primary:    { label: 'Open Race Core',      page: 'Registration',    Icon: Gauge },
    cta_secondary:  { label: 'Explore Motorsports', page: 'MotorsportsHome', Icon: Globe },
    bgImage: MOTORSPORTS_BG_1,
  },
  {
    eyebrow:        'THE OUTLET',
    headline_line1: 'Motorsports culture,',
    headline_line2: 'documented.',
    subtext:        'Race reports, features, and editorial coverage from across the sport.',
    cta_primary:    { label: 'Read The Outlet',     page: 'OutletHome',     Icon: Newspaper },
    cta_secondary:  { label: 'Shop Apparel',        page: 'ApparelHome',    Icon: ShoppingBag },
    bgImage: MOTORSPORTS_BG_2,
  },
];

function buildSlides(featuredDriver, featuredStory) {
  const contentSlide = (() => {
    if (featuredDriver) {
      const location = [featuredDriver.racing_base_city, featuredDriver.racing_base_state].filter(Boolean).join(', ');
      return {
        eyebrow:        (featuredDriver.primary_discipline || 'Featured Driver').toUpperCase(),
        headline_line1: featuredDriver.first_name,
        headline_line2: featuredDriver.last_name,
        subtext:        featuredDriver.tagline || [featuredDriver.career_status, location].filter(Boolean).join(' · ') || 'Motorsports competitor.',
        cta_primary:    { label: 'View Profile',    href: `/drivers/${featuredDriver.slug || featuredDriver.id}`, Icon: Users },
        cta_secondary:  { label: 'Browse Drivers',  page: 'DriverDirectory', Icon: Globe },
        bgImage: featuredDriver.hero_image_url || featuredDriver.profile_image_url || null,
      };
    }
    if (featuredStory) {
      const words = (featuredStory.title || '').split(' ');
      return {
        eyebrow:        (featuredStory.primary_category || 'The Outlet').toUpperCase(),
        headline_line1: words.slice(0, 4).join(' ') || 'Latest Story',
        headline_line2: words.slice(4, 8).join(' ') || '',
        subtext:        featuredStory.subtitle || 'Read the latest from The Outlet.',
        cta_primary:    { label: 'Read Story',   page: 'OutletStoryPage', storyId: featuredStory.id, Icon: Newspaper },
        cta_secondary:  { label: 'All Stories',  page: 'OutletHome', Icon: Globe },
        bgImage: featuredStory.cover_image || null,
      };
    }
    return null;
  })();

  return contentSlide ? [contentSlide, ...BRAND_SLIDES] : BRAND_SLIDES;
}

export default function HomepageHero({ stats: liveStats, featuredDriver = null, featuredStory = null }) {
  const [mounted, setMounted]       = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused]         = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const advance = useCallback(() => {
    setActiveSlide(i => (i + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(advance, 4000);
    return () => clearInterval(id);
  }, [paused, advance]);

  const { data: heroSettings } = useQuery({
    queryKey: ['homepageSettings', 'hero_bg'],
    queryFn: () => base44.entities.HomepageSettings.filter({ key: 'hero_bg' }),
  });

  const globalBg = heroSettings?.[0]?.image_url || FALLBACK_BG;

  const SLIDES = buildSlides(featuredDriver, featuredStory);
  const safeIndex = activeSlide >= SLIDES.length ? 0 : activeSlide;
  const slide = SLIDES[safeIndex];
  const bg_image = slide?.bgImage || globalBg;

  const stats = liveStats ? [
    liveStats.series_count > 0 ? { value: String(liveStats.series_count), label: 'Series Tracked'  } : null,
    liveStats.driver_count > 0 ? { value: String(liveStats.driver_count), label: 'Driver Profiles' } : null,
    liveStats.track_count  > 0 ? { value: String(liveStats.track_count),  label: 'Tracks'          } : null,
    liveStats.event_count  > 0 ? { value: String(liveStats.event_count),  label: 'Events'          } : null,
  ].filter(Boolean) : [];

  return (
    <section
      className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#080C14]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background Media Layer ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={bg_image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080C14]/60 via-[#080C14]/25 to-[#080C14]/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C14]/85 via-transparent to-[#080C14]/30" />
      </div>

      {/* ── Ambient Glow Layer ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.06]" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#00FFDA]/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#2563EB]/10 rounded-full blur-[120px]" />
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/25 to-transparent"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute left-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#00FFDA]/15 to-transparent" />
        <div className="absolute right-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#2563EB]/12 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FFDA]/60 to-transparent" />
      </div>

      {/* ── Hero Content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 pt-28 pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: mounted ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-0.5 bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">{slide.eyebrow}</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white leading-[0.9] mb-8 max-w-5xl">
              {slide.headline_line1}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] via-[#00FFDA]/90 to-[#2563EB]/70">
                {slide.headline_line2}
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-white/65 text-sm md:text-base max-w-md leading-relaxed mb-8 font-light">
              {slide.subtext}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-12">
              <Link
                to={slide.cta_primary.href || (slide.cta_primary.storyId ? `${createPageUrl(slide.cta_primary.page)}?id=${slide.cta_primary.storyId}` : createPageUrl(slide.cta_primary.page))}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#00FFDA] text-[#050A0A] text-sm font-black tracking-wider uppercase hover:bg-white hover:shadow-[0_0_24px_rgba(0,255,218,0.35)] transition-all duration-200"
              >
                <slide.cta_primary.Icon className="w-4 h-4" />
                {slide.cta_primary.label}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={slide.cta_secondary.href || createPageUrl(slide.cta_secondary.page)}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 border border-white/25 text-white/80 text-sm font-bold tracking-wide hover:border-[#00FFDA] hover:text-[#00FFDA] hover:bg-[#00FFDA]/5 transition-all duration-200"
              >
                <slide.cta_secondary.Icon className="w-4 h-4" />
                {slide.cta_secondary.label}
              </Link>
            </div>

            {/* Stats Strip */}
            {stats.length > 0 && (
              <div className="flex flex-wrap gap-6 md:gap-12 border-t border-white/15 pt-8">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{stat.value}</div>
                    <div className="text-[9px] font-mono tracking-[0.25em] text-white/55 uppercase mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Indicators ── */}
      <div className="absolute bottom-8 left-8 z-10 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveSlide(i); setPaused(true); }}
            className={`transition-all duration-300 rounded-full ${
              i === activeSlide
                ? 'w-6 h-1.5 bg-[#00FFDA]'
                : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Scroll Cue ── */}
      <motion.button
        className="absolute bottom-6 right-8 z-10 flex flex-col items-center gap-1.5"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <span className="font-mono text-[8px] tracking-[0.35em] text-white/40 uppercase">Scroll</span>
        <ChevronDown className="w-4 h-4 text-white/40" />
      </motion.button>
    </section>
  );
}