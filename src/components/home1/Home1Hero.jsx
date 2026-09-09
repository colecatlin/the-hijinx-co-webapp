import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';

const HERO_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/15d41358e_generated_image.png';

export default function Home1Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative w-full overflow-hidden h-[64vh] lg:h-[68vh]"
      style={{ minHeight: '460px', background: '#232323' }}
    >
      {/* Background image layer — very slow scale-in */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: '68% center',
          willChange: 'transform',
        }}
        initial={reduceMotion ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 14, ease: 'easeOut' }}
      />

      {/* Base readability overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(35,35,35,0.28)' }} />

      {/* Left-strong gradient overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(35,35,35,0.92) 0%, rgba(35,35,35,0.78) 28%, rgba(35,35,35,0.4) 52%, rgba(35,35,35,0.12) 72%, rgba(35,35,35,0) 100%)',
        }}
      />

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: 'linear-gradient(0deg, rgba(35,35,35,0.55), rgba(35,35,35,0))' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col justify-center">
        <motion.div
          className="max-w-2xl"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut', delay: 0.15 }}
        >
          {/* Eyebrow */}
          <p
            className="font-mono text-[10px] sm:text-[11px] tracking-[0.3em] uppercase mb-5"
            style={{ color: 'rgba(255,248,245,0.7)' }}
          >
            MOTORSPORTS // PEOPLE // CULTURE // COMMUNITY
          </p>

          {/* Headline */}
          <h1
            className="font-black uppercase leading-[0.86] tracking-[-0.03em]"
            style={{ color: '#FFF8F5' }}
          >
            <span className="block" style={{ fontSize: 'clamp(3.25rem, 8.5vw, 7rem)' }}>
              HIJINX
            </span>
            <span className="block" style={{ fontSize: 'clamp(2.25rem, 6vw, 5rem)' }}>
              A BIGGER
            </span>
            <span
              className="block"
              style={{ fontSize: 'clamp(2.25rem, 6vw, 5rem)', color: '#00FFDA' }}
            >
              TOMORROW.
            </span>
          </h1>

          {/* Supporting copy */}
          <p
            className="mt-6 max-w-md text-base sm:text-lg leading-relaxed"
            style={{ color: 'rgba(255,248,245,0.85)' }}
          >
            Connecting people, products, stories and technology to keep the culture moving
            forward.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="#"
              aria-label="Explore the HIJINX world"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 font-bold text-sm tracking-wide uppercase transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: '#00FFDA', color: '#232323' }}
            >
              EXPLORE THE HIJINX WORLD
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a
              href="#"
              aria-label="Watch the film"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 font-bold text-sm tracking-wide uppercase border transition-colors duration-200 hover:bg-[rgba(255,248,245,0.08)]"
              style={{ borderColor: '#FFF8F5', color: '#FFF8F5', background: 'transparent' }}
            >
              <Play className="w-4 h-4" />
              WATCH THE FILM
            </a>
          </div>
        </motion.div>
      </div>

      {/* Bottom editorial detail */}
      <div className="absolute bottom-5 left-6 sm:left-8 lg:left-10 z-10 hidden md:block">
        <p
          className="font-mono text-[10px] tracking-[0.25em] uppercase"
          style={{ color: 'rgba(255,248,245,0.6)' }}
        >
          RACE WEEKENDS // NEW DROPS // REAL STORIES // OPPORTUNITY // ALL IN MOTION
        </p>
      </div>

      {/* Right-side brand detail */}
      <div className="absolute top-[22%] right-6 lg:right-12 z-10 hidden lg:block max-w-[210px] text-right">
        <p
          className="font-serif italic leading-[1.05]"
          style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', color: 'rgba(255,248,245,0.92)' }}
        >
          Different Terrain.
          <br />
          Same People.
        </p>
      </div>
    </section>
  );
}