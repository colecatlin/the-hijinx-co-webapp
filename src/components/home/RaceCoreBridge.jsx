import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Flag } from 'lucide-react';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/048dfeff4_GridisCallingAI.png';

export default function RaceCoreBridge() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '560px' }}>

      {/* Full-width background image */}
      <img
        src={BG_IMAGE}
        alt="Racing starting line"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Darkening overlays — left heavier for text legibility, right lighter for card */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(1,4,4,0.88) 0%, rgba(1,4,4,0.72) 45%, rgba(1,4,4,0.55) 100%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(1,4,4,0.4) 0%, rgba(1,4,4,0.1) 40%, rgba(1,4,4,0.5) 100%)' }}
      />

      {/* Teal accent — top divider */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.5) 25%, rgba(29,161,161,0.5) 75%, transparent 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-2.5 mb-7">
              <Flag className="w-3 h-3 text-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.55em] text-[#1DA1A1] uppercase font-bold">
                Race Core
              </span>
            </div>

            <h2
              className="font-black text-white uppercase leading-[0.85] tracking-tight mb-5"
              style={{
                fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                textShadow: '0 2px 40px rgba(0,0,0,0.9)',
              }}
            >
              GET ON<br />THE GRID.
            </h2>

            <p
              className="text-base md:text-lg font-black italic uppercase mb-7 tracking-wide"
              style={{ color: '#1DA1A1', letterSpacing: '0.04em' }}
            >
              This isn't just something you watch.
            </p>

            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-[380px]">
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
            transition={{ duration: 0.7, delay: 0.12 }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="w-full max-w-[340px] p-8 relative"
              style={{
                background: 'rgba(1,4,4,0.6)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
              }}
            >
              {/* Teal top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, rgba(29,161,161,0.2) 70%, transparent 100%)' }}
              />

              <div className="font-mono text-[8px] tracking-[0.45em] text-white/25 uppercase mb-7">
                Ready to compete?
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate(createPageUrl('DriverProfileSetup'))}
                  className="w-full py-4 px-6 text-sm font-black tracking-widest uppercase text-center flex items-center justify-center gap-2.5 transition-all duration-200 hover:brightness-110"
                  style={{
                    background: '#1DA1A1',
                    color: '#010404',
                    boxShadow: '0 4px 24px rgba(29,161,161,0.4)',
                  }}
                >
                  Create Your Profile
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate(createPageUrl('MotorsportsHome'))}
                  className="w-full py-3.5 px-6 text-xs font-bold tracking-widest uppercase text-center transition-all duration-200 text-white/40 hover:text-white/70"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Explore Race Core
                </button>
              </div>

              <div
                className="mt-7 pt-5 text-[10px] text-white/20 leading-relaxed"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                Free to join. Built for competitors at every level.
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}