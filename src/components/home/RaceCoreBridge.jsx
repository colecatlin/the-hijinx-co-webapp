import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Flag } from 'lucide-react';

export default function RaceCoreBridge() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#010404' }}
    >
      {/* Single clean horizontal divider at top — signals a hard break */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.4) 30%, rgba(29,161,161,0.4) 70%, transparent 100%)' }}
      />

      {/* Restrained teal glow — anchors right side where CTA lives */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: 'rgba(29,161,161,0.06)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-7">
              <Flag className="w-3 h-3 text-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.55em] text-[#1DA1A1] uppercase font-bold">
                Race Core
              </span>
            </div>

            {/* Headline — deliberately oversized */}
            <h2
              className="font-black text-white uppercase leading-[0.85] tracking-tight mb-5"
              style={{
                fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                textShadow: '0 0 60px rgba(0,0,0,1)',
              }}
            >
              GET ON<br />THE GRID.
            </h2>

            {/* Subline */}
            <p
              className="text-base md:text-lg font-black italic uppercase mb-7 tracking-wide"
              style={{ color: '#1DA1A1', letterSpacing: '0.04em' }}
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

          {/* RIGHT — Glass card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="w-full max-w-[340px] p-8 relative"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(29,161,161,0.08)',
              }}
            >
              {/* Teal top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, rgba(29,161,161,0.2) 70%, transparent 100%)' }}
              />

              <div className="font-mono text-[8px] tracking-[0.45em] text-white/20 uppercase mb-7">
                Ready to compete?
              </div>

              <div className="flex flex-col gap-3">
                {/* Primary — dominant */}
                <button
                  onClick={() => navigate(createPageUrl('DriverProfileSetup'))}
                  className="w-full py-4 px-6 text-sm font-black tracking-widest uppercase text-center transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-2.5"
                  style={{
                    background: '#1DA1A1',
                    color: '#010404',
                    boxShadow: '0 4px 24px rgba(29,161,161,0.35)',
                  }}
                >
                  Create Your Profile
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Secondary — clearly subordinate */}
                <button
                  onClick={() => navigate(createPageUrl('MotorsportsHome'))}
                  className="w-full py-3.5 px-6 text-xs font-bold tracking-widest uppercase text-center transition-all duration-200 text-white/40 hover:text-white/70"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
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

      {/* Bottom divider — clean exit into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      />
    </section>
  );
}