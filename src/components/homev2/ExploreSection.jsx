import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const DIRECTORIES = [
  { label: 'Drivers',  page: 'DriverDirectory',  meta: 'Profiles & Stats' },
  { label: 'Teams',    page: 'TeamDirectory',     meta: 'Rosters & Programs' },
  { label: 'Tracks',   page: 'TrackDirectory',    meta: 'Venues & Layouts' },
  { label: 'Series',   page: 'SeriesHome',        meta: 'Championships' },
  { label: 'Events',   page: 'EventDirectory',    meta: 'Schedule & Results' },
];

export default function ExploreSection() {
  return (
    <section
      style={{ background: '#232323', borderTop: '1px solid rgba(0,255,218,0.15)', borderBottom: '1px solid rgba(255,248,245,0.06)' }}
      className="py-14 md:py-16"
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Explore</span>
            </div>
            <h2 className="font-black text-3xl leading-none" style={{ color: '#FFF8F5' }}>Enter the Ecosystem</h2>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DIRECTORIES.map((dir, i) => (
            <motion.div
              key={dir.page}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
            >
              <Link
                to={createPageUrl(dir.page)}
                className="group flex flex-col justify-between p-5 h-full transition-colors"
                style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.06)', minHeight: 120 }}
              >
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,248,245,0.3)' }}>
                  0{i + 1}
                </div>
                <div>
                  <div className="font-black text-xl leading-tight mb-1 transition-colors group-hover:text-[#00FFDA]" style={{ color: '#FFF8F5' }}>
                    {dir.label}
                  </div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,248,245,0.35)' }}>{dir.meta}</div>
                </div>
                <motion.div
                  className="mt-3 h-px"
                  style={{ background: '#00FFDA', originX: 0 }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}