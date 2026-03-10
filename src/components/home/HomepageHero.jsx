import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Gauge, ShoppingBag, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const FALLBACK_BG = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/db194cd55_501757068_24217767807816436_3945910434470038974_n.jpg';

const HERO_CONFIG = {
  eyebrow: 'THE HIJINX CO',
  headline_line1: 'Built for the ones',
  headline_line2: 'chasing more.',
  subtext: 'Motorsports, culture, data, apparel, and the people driving it forward.',
  cta_primary:   { label: 'Open Race Core',       page: 'Registration',    Icon: Gauge },
  cta_secondary: { label: 'Shop HIJINX Apparel', page: 'ApparelHome',     Icon: ShoppingBag },
  cta_tertiary:  { label: 'Explore Motorsports', page: 'MotorsportsHome', Icon: Globe },
};

export default function HomepageHero({ stats: liveStats }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: heroSettings } = useQuery({
    queryKey: ['homepageSettings', 'hero_bg'],
    queryFn: () => base44.entities.HomepageSettings.filter({ key: 'hero_bg' }),
  });

  const bg_image = heroSettings?.[0]?.image_url || FALLBACK_BG;
  const { eyebrow, headline_line1, headline_line2, subtext, cta_primary, cta_secondary, cta_tertiary } = HERO_CONFIG;

  // Build stats array from live data; only include slots with real values
  const stats = liveStats ? [
    liveStats.series_count > 0 ? { value: String(liveStats.series_count), label: 'Series Tracked' } : null,
    liveStats.driver_count > 0 ? { value: String(liveStats.driver_count), label: 'Driver Profiles' } : null,
    liveStats.track_count  > 0 ? { value: String(liveStats.track_count),  label: 'Tracks' }          : null,
    liveStats.event_count  > 0 ? { value: String(liveStats.event_count),  label: 'Events' }          : null,
  ].filter(Boolean) : [];

  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#080C14]">

      {/* ── Background Media Layer ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={bg_image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
          loading="eager"
        />
        {/* Lighter overlay — lets image breathe */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080C14]/60 via-[#080C14]/25 to-[#080C14]/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C14]/85 via-transparent to-[#080C14]/30" />
      </div>

      {/* ── Ambient Glow Layer ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {/* Grid */}
        <div className="absolute inset-0 grid-bg opacity-[0.06]" />

        {/* Strong teal atmospheric glow — upper left */}
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#00FFDA]/8 rounded-full blur-[150px]" />
        {/* Blue accent glow — lower right */}
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#2563EB]/10 rounded-full blur-[120px]" />

        {/* Animated scan line — brighter */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/25 to-transparent"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        {/* Vertical telemetry lines */}
        <div className="absolute left-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#00FFDA]/15 to-transparent" />
        <div className="absolute right-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#2563EB]/12 to-transparent" />

        {/* Bottom edge teal stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FFDA]/60 to-transparent" />
      </div>

      {/* ── Hero Content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 pt-28 pb-36">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 50 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow */}
          <motion.div
            className="flex items-center gap-3 mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: mounted ? 1 : 0, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="w-10 h-0.5 bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">{eyebrow}</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white leading-[0.9] mb-8 max-w-5xl">
            {headline_line1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] via-[#00FFDA]/90 to-[#2563EB]/70">
              {headline_line2}
            </span>
          </h1>

          {/* Subtext — brighter */}
          <p className="text-white/80 text-base md:text-lg max-w-lg leading-relaxed mb-12 font-light">
            {subtext}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-16">
            {/* Primary — solid teal, high contrast */}
            <Link
              to={createPageUrl(cta_primary.page)}
              className="group inline-flex items-center gap-2.5 px-7 py-4 bg-[#00FFDA] text-[#050A0A] text-sm font-black tracking-wider uppercase hover:bg-white hover:shadow-[0_0_24px_rgba(0,255,218,0.35)] transition-all duration-200"
            >
              <cta_primary.Icon className="w-4 h-4" />
              {cta_primary.label}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Secondary — visible border, readable */}
            <Link
              to={createPageUrl(cta_secondary.page)}
              className="group inline-flex items-center gap-2.5 px-7 py-4 border-2 border-white/30 text-white text-sm font-bold tracking-wide hover:border-[#00FFDA] hover:text-[#00FFDA] hover:bg-[#00FFDA]/5 transition-all duration-200"
            >
              <cta_secondary.Icon className="w-4 h-4" />
              {cta_secondary.label}
            </Link>

            {/* Tertiary — ghost text link */}
            <Link
              to={createPageUrl(cta_tertiary.page)}
              className="group inline-flex items-center gap-2 px-4 py-4 text-white/50 text-sm font-medium tracking-wide hover:text-white/85 transition-colors"
            >
              {cta_tertiary.label}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Stats Strip — only rendered when live data is available */}
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-6 md:gap-12 border-t border-white/15 pt-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: mounted ? 1 : 0, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                >
                  <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{stat.value}</div>
                  <div className="text-[9px] font-mono tracking-[0.25em] text-white/55 uppercase mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Scroll Cue ── */}
      <motion.button
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
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