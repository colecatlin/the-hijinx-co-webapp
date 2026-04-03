import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const CULTURE_ITEMS = [
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85&fit=crop',
    label: 'COMPETITION',
    size: 'large',
  },
  {
    type: 'text',
    tag: 'Culture',
    headline: 'Born from the garage.',
    sub: 'Built for the track. Worn everywhere else.',
    accent: '#00FFDA',
    size: 'medium',
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80&fit=crop',
    label: 'IDENTITY',
    size: 'small',
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1540747913346-19212a4c1ba5?w=600&q=80&fit=crop',
    label: 'COMMUNITY',
    size: 'small',
  },
  {
    type: 'text',
    tag: 'Motorsports',
    headline: 'We document what others overlook.',
    sub: null,
    accent: '#FF6B35',
    size: 'small',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] } }),
};

export default function CultureSection() {
  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Label */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-6 h-[2px] bg-[#FF6B35]" />
          <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
            Culture
          </span>
        </div>

        {/* Broken grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 grid-rows-auto gap-3">

          {/* Large image — left hero */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" custom={0} viewport={{ once: true }}
            className="col-span-2 md:col-span-7 row-span-2 relative overflow-hidden min-h-[300px] md:min-h-[480px] group"
          >
            <img
              src={CULTURE_ITEMS[0].src}
              alt="Racing"
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute inset-0 border border-white/5" />
            <div className="absolute bottom-5 left-5">
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">
                {CULTURE_ITEMS[0].label}
              </span>
            </div>
          </motion.div>

          {/* Text card — top right */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" custom={1} viewport={{ once: true }}
            className="col-span-2 md:col-span-5 relative overflow-hidden min-h-[200px] md:min-h-[220px]"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, #00FFDA66 0%, transparent 60%)' }} />
            <div className="p-6 md:p-8 h-full flex flex-col justify-between">
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">
                {CULTURE_ITEMS[1].tag}
              </span>
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                  {CULTURE_ITEMS[1].headline}
                </h3>
                <p className="text-white/40 text-sm">{CULTURE_ITEMS[1].sub}</p>
              </div>
            </div>
          </motion.div>

          {/* Small image — middle right */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" custom={2} viewport={{ once: true }}
            className="col-span-1 md:col-span-2 relative overflow-hidden min-h-[160px] md:min-h-[240px] group"
          >
            <img
              src={CULTURE_ITEMS[2].src}
              alt="Driver"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="font-mono text-[8px] tracking-[0.35em] text-white/50 uppercase">
                {CULTURE_ITEMS[2].label}
              </span>
            </div>
          </motion.div>

          {/* Small image — bottom right */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" custom={3} viewport={{ once: true }}
            className="col-span-1 md:col-span-2 relative overflow-hidden min-h-[160px] md:min-h-[240px] group"
          >
            <img
              src={CULTURE_ITEMS[3].src}
              alt="Community"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="font-mono text-[8px] tracking-[0.35em] text-white/50 uppercase">
                {CULTURE_ITEMS[3].label}
              </span>
            </div>
          </motion.div>

          {/* Accent text card — bottom spanning */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" custom={4} viewport={{ once: true }}
            className="col-span-2 md:col-span-5 relative overflow-hidden min-h-[120px] flex items-center"
            style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.15)' }}
          >
            <div className="p-6 md:p-8 w-full flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] tracking-[0.35em] text-[#FF6B35] uppercase font-bold block mb-2">
                  {CULTURE_ITEMS[4].tag}
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {CULTURE_ITEMS[4].headline}
                </h3>
              </div>
              <Link
                to={createPageUrl('OutletHome')}
                className="flex-shrink-0 group flex items-center gap-2 text-xs font-bold text-[#FF6B35] uppercase tracking-wider hover:gap-3 transition-all"
              >
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}