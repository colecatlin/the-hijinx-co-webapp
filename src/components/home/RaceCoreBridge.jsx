import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Flag } from 'lucide-react';

// Faint starting grid pattern
const startingGridSVG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='30' height='30' fill='rgba(255,255,255,0.018)'/%3E%3Crect x='30' y='30' width='30' height='30' fill='rgba(255,255,255,0.018)'/%3E%3C/svg%3E")`;

// Speed streak: thin horizontal lines that suggest motion
function SpeedStreaks() {
  const streaks = [
    { top: '18%', width: '28%', left: '0%', opacity: 0.07, delay: 0 },
    { top: '32%', width: '18%', left: '5%', opacity: 0.05, delay: 0.4 },
    { top: '55%', width: '22%', left: '2%', opacity: 0.06, delay: 0.8 },
    { top: '72%', width: '14%', left: '8%', opacity: 0.04, delay: 0.2 },
    { top: '42%', width: '35%', left: '0%', opacity: 0.045, delay: 1.1 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {streaks.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: s.top,
            left: s.left,
            width: s.width,
            height: '1px',
            background: `linear-gradient(to right, transparent, rgba(29,161,161,${s.opacity * 3}), rgba(255,255,255,${s.opacity}), transparent)`,
            opacity: 0,
          }}
          animate={{ opacity: [0, s.opacity * 8, 0], x: ['0%', '8%', '0%'] }}
          transition={{
            duration: 3.5,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: 2.5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function RaceCoreBridge() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#010404' }}
    >
      {/* ── ENVIRONMENT LAYERS ────────────────────────── */}

      {/* Starting grid checkerboard texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: startingGridSVG, backgroundSize: '60px 60px', opacity: 1 }}
      />

      {/* Faint start-line stripe — horizontal band lower third */}
      <div
        className="absolute pointer-events-none hidden md:block"
        style={{
          bottom: '25%',
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 15%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.04) 85%, transparent 100%)',
        }}
      />
      {/* Second stripe */}
      <div
        className="absolute pointer-events-none hidden md:block"
        style={{
          bottom: 'calc(25% - 12px)',
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 15%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.03) 85%, transparent 100%)',
        }}
      />

      {/* Speed streaks — left side, feel like dust/motion */}
      <SpeedStreaks />

      {/* ── LIGHTING ────────────────────────────────── */}

      {/* Primary teal glow — left-center, like a starting light */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '20%',
          left: '-10%',
          width: '55%',
          height: '70%',
          background: 'radial-gradient(ellipse at left center, rgba(29,161,161,0.12) 0%, rgba(29,161,161,0.04) 45%, transparent 70%)',
        }}
      />

      {/* Warm fill light — right center, depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '0%',
          right: '-5%',
          width: '50%',
          height: '100%',
          background: 'radial-gradient(ellipse at right center, rgba(255,200,100,0.03) 0%, transparent 60%)',
        }}
      />

      {/* Vignette — edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      {/* Top divider — teal accent signals hard break from above */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.5) 25%, rgba(29,161,161,0.5) 75%, transparent 100%)' }}
      />

      {/* ── CONTENT ─────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-7">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flag className="w-3 h-3 text-[#1DA1A1]" />
              </motion.div>
              <span className="font-mono text-[9px] tracking-[0.55em] text-[#1DA1A1] uppercase font-bold">
                Race Core
              </span>
            </div>

            {/* Headline — powered up with glow */}
            <h2
              className="font-black text-white uppercase leading-[0.85] tracking-tight mb-5"
              style={{
                fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                textShadow: '0 0 80px rgba(29,161,161,0.2), 0 0 20px rgba(255,255,255,0.05), 0 2px 40px rgba(0,0,0,1)',
              }}
            >
              GET ON<br />THE GRID.
            </h2>

            {/* Subline */}
            <p
              className="text-base md:text-lg font-black italic uppercase mb-7 tracking-wide"
              style={{
                color: '#1DA1A1',
                letterSpacing: '0.04em',
                textShadow: '0 0 20px rgba(29,161,161,0.3)',
              }}
            >
              This isn't just something you watch.
            </p>

            {/* Body */}
            <p className="text-white/45 text-sm md:text-base leading-relaxed max-w-[380px]">
              You've explored the world of racing.<br />
              Now it's time to be part of it.<br />
              Build your profile, track your results, and step into the system that powers it all.
            </p>
          </motion.div>

          {/* RIGHT — Control panel card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="w-full max-w-[340px] p-8 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.04) 100%)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow: '0 0 80px rgba(0,0,0,0.7), 0 0 40px rgba(29,161,161,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Teal top accent — "green light" feel */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, rgba(29,161,161,0.3) 70%, transparent 100%)' }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Inner reflection line — top inside */}
              <div
                className="absolute top-[2px] left-4 right-4 h-[1px] pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
              />

              <div className="font-mono text-[8px] tracking-[0.45em] text-white/20 uppercase mb-7">
                Ready to compete?
              </div>

              <div className="flex flex-col gap-3">
                {/* Primary CTA */}
                <motion.button
                  onClick={() => navigate(createPageUrl('DriverProfileSetup'))}
                  className="w-full py-4 px-6 text-sm font-black tracking-widest uppercase text-center flex items-center justify-center gap-2.5 transition-all duration-200"
                  style={{
                    background: '#1DA1A1',
                    color: '#010404',
                    boxShadow: '0 4px 30px rgba(29,161,161,0.45), 0 0 60px rgba(29,161,161,0.15)',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 6px 40px rgba(29,161,161,0.6), 0 0 80px rgba(29,161,161,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Your Profile
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                {/* Secondary CTA */}
                <button
                  onClick={() => navigate(createPageUrl('MotorsportsHome'))}
                  className="w-full py-3.5 px-6 text-xs font-bold tracking-widest uppercase text-center transition-all duration-200 text-white/35 hover:text-white/60 hover:border-white/20"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Explore Race Core
                </button>
              </div>

              <div
                className="mt-7 pt-5 text-[10px] text-white/18 leading-relaxed"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                Free to join. Built for competitors at every level.
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom fade — smooth exit into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))' }}
      />
    </section>
  );
}