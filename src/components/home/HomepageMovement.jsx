import React from 'react';
import { motion } from 'framer-motion';

const IDENTITIES = ['RACERS', 'BUILDERS', 'CREATORS', 'DREAMERS', 'FANS'];

export default function HomepageMovement() {
  return (
    <section className="relative bg-[#F7F9FA] py-20 md:py-32 overflow-hidden border-b border-gray-200">

      {/* Background photo with higher contrast */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/34986112d_Boonville-214.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-15"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7F9FA]/70 via-[#F7F9FA]/30 to-[#F7F9FA]/80" />
      </div>

      {/* Teal radial accent */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        <div className="w-[900px] h-[900px] bg-[#00FFDA]/6 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="w-16 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[9px] tracking-[0.4em] text-[#008080] uppercase font-bold">A Movement</span>
            <div className="w-16 h-px bg-[#00FFDA]" />
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-[#0A0A0A] tracking-tight leading-[0.9] mb-8">
            Built for those
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008080] via-[#00FFDA] to-[#2563EB]">
              who move the sport.
            </span>
          </h2>

          <p className="text-gray-500 text-base md:text-lg max-w-lg mx-auto leading-relaxed mb-16 font-light">
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
              className="group px-6 py-3 border border-gray-300 hover:border-[#00FFDA] hover:bg-teal-50 bg-white shadow-sm transition-all duration-300 cursor-default"
            >
              <span className="font-black text-sm tracking-[0.25em] text-gray-400 group-hover:text-[#008080] transition-colors">
                {word}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 1 }}
          className="mt-20"
        >
          <p className="font-mono text-[9px] tracking-[0.45em] text-gray-400 uppercase">
            Dream it.&nbsp;&nbsp;Build it.&nbsp;&nbsp;Live it. — HIJINX CO
          </p>
        </motion.div>
      </div>
    </section>
  );
}