import React from 'react';
import { motion } from 'framer-motion';

const IDENTITIES = ['RACERS', 'BUILDERS', 'CREATORS', 'DREAMERS', 'FANS'];

export default function HomepageMovement() {
  return (
    <section className="relative bg-[#0A0A0A] py-28 md:py-40 overflow-hidden border-b border-white/5">

      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/34986112d_Boonville-214.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-8"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 via-[#0A0A0A]/40 to-[#0A0A0A]/90" />
      </div>

      {/* Teal radial glow — center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        <div className="w-[800px] h-[800px] bg-[#00FFDA]/3 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="w-16 h-px bg-[#00FFDA]/30" />
            <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase">A Movement</span>
            <div className="w-16 h-px bg-[#00FFDA]/30" />
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[0.9] mb-8">
            Built for those
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] via-white to-[#00FFDA]/50">
              who move the sport.
            </span>
          </h2>

          <p className="text-white/35 text-base md:text-lg max-w-lg mx-auto leading-relaxed mb-16 font-light">
            HIJINX is not just a platform. It is a culture built at the intersection of speed, creativity, and identity. We exist because the sport deserves more.
          </p>
        </motion.div>

        {/* Identity tags */}
        <div className="flex flex-wrap justify-center gap-3">
          {IDENTITIES.map((word, i) => (
            <motion.div
              key={word}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09, duration: 0.45 }}
              className="group px-6 py-3 border border-white/8 hover:border-[#00FFDA]/35 transition-all duration-300 cursor-default"
            >
              <span className="font-black text-sm tracking-[0.25em] text-white/25 group-hover:text-[#00FFDA] transition-colors">
                {word}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Brand statement */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 1 }}
          className="mt-20"
        >
          <p className="font-mono text-[9px] tracking-[0.45em] text-white/15 uppercase">
            Dream it.&nbsp;&nbsp;Build it.&nbsp;&nbsp;Live it. — HIJINX CO
          </p>
        </motion.div>
      </div>
    </section>
  );
}