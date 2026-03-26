import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const HERO_BG     = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80';
const LIFESTYLE_1 = 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=800&q=75';
const LIFESTYLE_2 = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=75';
const LIFESTYLE_3 = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=75';

export default function BrandSection({ products = [] }) {
  // Pick up to 3 lifestyle images: prefer product images if available, fall back to defaults
  const lifestyleImgs = [
    products[0]?.image_url || LIFESTYLE_1,
    products[1]?.image_url || LIFESTYLE_2,
    products[2]?.image_url || LIFESTYLE_3,
  ];

  return (
    <section style={{ background: '#FFF8F5', borderTop: '1px solid #E5E7EB' }}>

      {/* ── Layer 1: Visual entry ── */}
      <div className="relative overflow-hidden" style={{ height: 'clamp(360px, 50vh, 560px)' }}>
        <img src={HERO_BG} alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.35) contrast(1.15) saturate(0.7)' }} />
        {/* Gradient fades into next layer */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(30,30,30,0.05) 0%, rgba(30,30,30,0.45) 60%, #FFF8F5 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(20,20,20,0.6) 0%, transparent 55%)' }} />

        <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="font-mono text-[9px] tracking-[0.45em] uppercase mb-4"
              style={{ color: 'rgba(255,255,255,0.55)' }}>The Culture</div>
            <h2 className="font-black leading-none"
              style={{ color: '#FFFFFF', fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
              Motorsports,<br />
              <span style={{ color: '#FFFFFF', opacity: 0.7 }}>Alive.</span>
            </h2>
          </motion.div>
        </div>
      </div>

      {/* ── Layer 2: Movement message ── */}
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <p className="font-black leading-tight mb-8"
              style={{ color: '#232323', fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)' }}>
              For the drivers who grind.<br />
              The teams who sacrifice.<br />
              The tracks that shape legends.<br />
              <span style={{ color: '#9CA3AF' }}>The media that captures it all.</span>
            </p>
            <div className="flex flex-wrap gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to={createPageUrl('MotorsportsHome')}
                  className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                  style={{ background: '#232323', color: '#FFFFFF' }}>
                  Get Involved
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to={createPageUrl('Registration')}
                  className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                  style={{ border: '1px solid #D1D5DB', color: '#6B7280' }}>
                  Race Core Platform
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* ── Layer 3: Lifestyle visuals (apparel/culture) ── */}
          <div className="grid grid-cols-3 gap-2">
            {lifestyleImgs.map((src, i) => (
              <motion.div key={i}
                className="relative overflow-hidden"
                style={{ height: i === 1 ? 260 : 200, background: '#111', alignSelf: i === 1 ? 'flex-end' : 'flex-start' }}
                initial={{ opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}>
                <img src={src} alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'brightness(0.75) contrast(1.05) saturate(0.8)' }} />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Subtle apparel callout */}
        <motion.div className="mt-16 flex items-center justify-between pt-8"
          style={{ borderTop: '1px solid #E5E7EB' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase"
            style={{ color: '#D1D5DB' }}>
            HIJINX — Motorsports, Culture, Competition
          </div>
          <Link to={createPageUrl('ApparelHome')}
            className="font-bold text-xs uppercase tracking-wide"
            style={{ color: '#9CA3AF' }}>
            Wear the Culture →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}