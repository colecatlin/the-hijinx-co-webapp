import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

export default function FinalCTASection() {
  return (
    <section style={{ background: '#232323' }} className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Join HIJINX</span>
          </div>

          <h2
            className="font-black leading-none mb-6"
            style={{ color: '#FFF8F5', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}
          >
            Be Part of<br />the Ecosystem.
          </h2>

          <p className="text-sm leading-relaxed mb-10 max-w-md" style={{ color: 'rgba(255,248,245,0.5)' }}>
            Drivers, teams, tracks, series, media professionals — HIJINX is the single platform that brings the entire motorsports world into one place.
          </p>

          <div className="flex flex-wrap gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                to={createPageUrl('MotorsportsHome')}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                style={{ background: '#00FFDA', color: '#232323' }}
              >
                Explore Motorsports
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                to={createPageUrl('MediaHome')}
                className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase transition-colors hover:border-[#00FFDA] hover:text-[#00FFDA]"
                style={{ border: '1px solid rgba(255,248,245,0.2)', color: '#FFF8F5' }}
              >
                Media Portal
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(255,248,245,0.06)' }}>
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(255,248,245,0.2)' }}>
            HIJINX — Motorsports, Culture, Competition
          </div>
        </div>
      </div>
    </section>
  );
}