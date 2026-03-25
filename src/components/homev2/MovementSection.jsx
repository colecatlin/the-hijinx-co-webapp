import React from 'react';
import { motion } from 'framer-motion';

const BG = 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=1600&q=70';

export default function MovementSection() {
  return (
    <section className="relative overflow-hidden" style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(0,255,218,0.08)', minHeight: 420 }}>
      {/* Full-bleed background */}
      <img src={BG} alt="" className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.15) contrast(1.2) saturate(0.5)' }} />
      {/* Teal gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,255,218,0.04) 0%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 100%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          <motion.div className="flex items-center gap-3 mb-10"
            initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>The Movement</span>
          </motion.div>

          <motion.blockquote
            className="font-black leading-none mb-8"
            style={{ color: '#FFF8F5', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
            "Motorsports isn't<br />just a sport.{' '}
            <span style={{ color: '#00FFDA' }}>It's&nbsp;a&nbsp;culture.</span>"
          </motion.blockquote>

          <motion.p className="text-base leading-relaxed max-w-lg" style={{ color: 'rgba(255,248,245,0.45)' }}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.2 }}>
            We built HIJINX for the drivers who grind, the teams who sacrifice, the tracks that shape legends, and the media that captures it all.
          </motion.p>

          <motion.div className="mt-12 flex items-center gap-4"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.35 }}>
            <div className="h-px flex-1 max-w-[80px]" style={{ background: 'rgba(0,255,218,0.25)' }} />
            <span className="font-mono text-[10px] tracking-[0.45em] uppercase" style={{ color: 'rgba(0,255,218,0.4)' }}>HIJINX</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}