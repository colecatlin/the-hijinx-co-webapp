import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Gauge, ShoppingBag, Globe } from 'lucide-react';

// ── Editable config — swap bg_image for a <video> src without rebuilding ──
const HERO_CONFIG = {
  eyebrow: 'THE HIJINX CO',
  headline_line1: 'Built for the ones',
  headline_line2: 'chasing more.',
  subtext: 'Motorsports, culture, data, apparel, and the people driving it forward.',
  cta_primary:   { label: 'Enter Race Core',              page: 'Registration',    Icon: Gauge },
  cta_secondary: { label: 'Shop HIJINX Apparel',          page: 'ApparelHome',     Icon: ShoppingBag },
  cta_tertiary:  { label: 'Explore the world of HIJINX',  page: 'MotorsportsHome', Icon: Globe },
  stats: [
    { value: 'LIVE',  label: 'Platform' },
    { value: '46+',   label: 'Series Tracked' },
    { value: '200+',  label: 'Driver Profiles' },
    { value: '50+',   label: 'Tracks' },
  ],
  // ── Background media layer ──────────────────────────────────────────────
  // To swap to a <video> later: replace the <img> block in the Background Layer
  // div below with a <video autoPlay muted loop playsInline> element.
  bg_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
};

export default function HomepageHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { eyebrow, headline_line1, headline_line2, subtext, cta_primary, cta_secondary, cta_tertiary, stats, bg_image } = HERO_CONFIG;

  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#080808]">

      {/* ── Background Media Layer (swap <img> for <video> when ready) ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={bg_image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
          loading="eager"
        />
        {/* Cinematic multi-layer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/70 via-[#080808]/30 to-[#080808]/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/90 via-transparent to-[#080808]/50" />
      </div>

      {/* ── Ambient Motion Layer ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.05]" />
        {/* Teal atmospheric glows */}
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-[#00FFDA]/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00FFDA]/3 rounded-full blur-[100px]" />
        {/* Animated scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/15 to-transparent"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
        {/* Vertical accent lines */}
        <div className="absolute left-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#00FFDA]/8 to-transparent" />
        <div className="absolute right-[8%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/4 to-transparent" />
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
            <div className="w-10 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">{eyebrow}</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tight text-white leading-[0.9] mb-8 max-w-5xl">
            {headline_line1}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] via-[#00FFDA]/80 to-white/50">
              {headline_line2}
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-white/50 text-base md:text-lg max-w-lg leading-relaxed mb-12 font-light">
            {subtext}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-16">
            <Link
              to={createPageUrl(cta_primary.page)}
              className="group inline-flex items-center gap-2.5 px-6 py-4 bg-[#00FFDA] text-[#080808] text-sm font-black tracking-wider uppercase hover:bg-white transition-all duration-200"
            >
              <cta_primary.Icon className="w-4 h-4" />
              {cta_primary.label}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to={createPageUrl(cta_secondary.page)}
              className="group inline-flex items-center gap-2.5 px-6 py-4 border border-white/15 text-white text-sm font-bold tracking-wide hover:border-[#00FFDA]/60 hover:text-[#00FFDA] transition-all duration-200"
            >
              <cta_secondary.Icon className="w-4 h-4" />
              {cta_secondary.label}
            </Link>

            <Link
              to={createPageUrl(cta_tertiary.page)}
              className="group inline-flex items-center gap-2 px-4 py-4 text-white/35 text-sm font-medium tracking-wide hover:text-white/65 transition-colors"
            >
              {cta_tertiary.label}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Stats Strip */}
          <div className="flex flex-wrap gap-8 md:gap-12 border-t border-white/8 pt-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: mounted ? 1 : 0, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
              >
                <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{stat.value}</div>
                <div className="text-[9px] font-mono tracking-[0.25em] text-white/30 uppercase mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Scroll Cue ── */}
      <motion.button
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <span className="font-mono text-[8px] tracking-[0.35em] text-white/25 uppercase">Scroll</span>
        <ChevronDown className="w-4 h-4 text-white/25" />
      </motion.button>

      {/* Bottom teal accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/40 to-transparent z-10" />
    </section>
  );
}