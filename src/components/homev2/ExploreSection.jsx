import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const DIRECTORIES = [
  {
    label: 'Drivers',  page: 'DriverDirectory',  meta: 'Profiles & Stats',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=70',
  },
  {
    label: 'Teams',    page: 'TeamDirectory',     meta: 'Rosters & Programs',
    image: 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=600&q=70',
  },
  {
    label: 'Tracks',   page: 'TrackDirectory',    meta: 'Venues & Layouts',
    image: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=600&q=70',
  },
  {
    label: 'Series',   page: 'SeriesHome',        meta: 'Championships',
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=70',
  },
  {
    label: 'Events',   page: 'EventDirectory',    meta: 'Schedule & Results',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=70',
  },
];

export default function ExploreSection() {
  return (
    <section style={{ background: '#0a0a0a', borderTop: '1px solid rgba(0,255,218,0.1)', borderBottom: '1px solid rgba(255,248,245,0.05)' }} className="py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
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
            <motion.div key={dir.page}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}>
              <Link to={createPageUrl(dir.page)} className="group relative overflow-hidden block" style={{ height: 200, background: '#111' }}>
                {/* Background image */}
                <motion.img src={dir.image} alt={dir.label} className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'brightness(0.35) contrast(1.1) saturate(0.8)' }}
                  whileHover={{ scale: 1.08, filter: 'brightness(0.45) contrast(1.1) saturate(1)' }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 30%, transparent 80%)' }} />
                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,248,245,0.3)' }}>0{i + 1}</div>
                  <div>
                    <div className="font-black text-xl leading-tight mb-1 transition-colors group-hover:text-[#00FFDA]" style={{ color: '#FFF8F5' }}>
                      {dir.label}
                    </div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,248,245,0.35)' }}>{dir.meta}</div>
                    <motion.div className="mt-2 h-px" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
                      whileHover={{ scaleX: 1 }} transition={{ duration: 0.25 }} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}