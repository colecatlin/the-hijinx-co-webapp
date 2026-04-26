import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Flag } from 'lucide-react';

// Subtle starting grid texture as inline SVG data URI
const gridTexture = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='20' height='20' fill='rgba(255,255,255,0.025)'/%3E%3Crect x='20' y='20' width='20' height='20' fill='rgba(255,255,255,0.025)'/%3E%3C/svg%3E")`;

export default function RaceCoreBridge() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#020606' }}
    >
      {/* Starting grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: gridTexture, backgroundSize: '40px 40px', opacity: 1 }}
      />

      {/* Faint track line — horizontal rule across mid */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: '50%', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent 100%)' }}
      />

      {/* Vertical accent line — left edge */}
      <div
        className="absolute top-0 bottom-0 left-[10%] pointer-events-none hidden lg:block"
        style={{ width: '1px', background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent 100%)' }}
      />
      <div
        className="absolute top-0 bottom-0 left-[90%] pointer-events-none hidden lg:block"
        style={{ width: '1px', background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent 100%)' }}
      />

      {/* Teal glow — bottom right */}
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(29,161,161,0.07)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* LEFT — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Label */}
            <div className="flex items-center gap-3 mb-6">
              <Flag className="w-3.5 h-3.5 text-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#1DA1A1] uppercase font-bold">
                Race Core
              </span>
            </div>

            {/* Headline */}
            <h2
              className="text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase leading-[0.88] tracking-tight mb-4"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.9)' }}
            >
              GET ON<br />THE GRID.
            </h2>

            {/* Subline */}
            <p
              className="text-lg md:text-xl font-black italic uppercase mb-6 leading-tight"
              style={{ color: '#1DA1A1' }}
            >
              This isn't just something you watch.
            </p>

            {/* Body */}
            <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-md">
              You've explored the world of racing.<br />
              Now it's time to be part of it.<br />
              Build your profile, track your results, and step into the system that powers it all.
            </p>
          </motion.div>

          {/* RIGHT — Glass card with CTAs */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="w-full max-w-sm p-8 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #1DA1A1 0%, transparent 60%)' }}
              />

              {/* Inner grid texture on card */}
              <div
                className="absolute inset-0 pointer-events-none opacity-50"
                style={{ backgroundImage: gridTexture, backgroundSize: '20px 20px' }}
              />

              <div className="relative z-10">
                <div className="font-mono text-[8px] tracking-[0.4em] text-white/25 uppercase mb-6">
                  Ready to race?
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate(createPageUrl('DriverProfileSetup'))}
                    className="w-full py-4 px-6 text-sm font-black tracking-widest uppercase text-center transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-2"
                    style={{ background: '#1DA1A1', color: '#020606' }}
                  >
                    Create Your Profile
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate(createPageUrl('MotorsportsHome'))}
                    className="w-full py-4 px-6 text-sm font-black tracking-widest uppercase text-center transition-all duration-200 hover:bg-white/10 text-white/70 hover:text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    Explore Race Core
                  </button>
                </div>

                <div
                  className="mt-6 pt-5 text-[10px] text-white/20 leading-relaxed"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Free to join. Built for competitors at every level.
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}