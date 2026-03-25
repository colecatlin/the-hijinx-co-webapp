import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const BG = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1600&q=70';

export default function FinalCTASection() {
  return (
    <section className="relative overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Subtle background */}
      <img src={BG} alt="" className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.12) contrast(1.2) saturate(0.4)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.98) 40%, rgba(10,10,10,0.7) 100%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        <motion.div className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Join HIJINX</span>
          </div>
          <h2 className="font-black leading-none mb-6" style={{ color: '#FFF8F5', fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
            Be Part of<br />the Ecosystem.
          </h2>
          <p className="text-sm leading-relaxed mb-10 max-w-md" style={{ color: 'rgba(255,248,245,0.45)' }}>
            Drivers, teams, tracks, series, and media professionals — HIJINX is the single platform that brings the entire motorsports world together.
          </p>
          <div className="flex flex-wrap gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
              <Link to={createPageUrl('MotorsportsHome')}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                style={{ background: '#00FFDA', color: '#232323' }}>
                Explore Motorsports
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
              <Link to={createPageUrl('MediaHome')}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                style={{ border: '1px solid rgba(255,248,245,0.2)', color: '#FFF8F5' }}>
                Media Portal
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(255,248,245,0.06)' }}>
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(255,248,245,0.18)' }}>
            HIJINX — Motorsports, Culture, Competition
          </div>
        </div>
      </div>
    </section>
  );
}