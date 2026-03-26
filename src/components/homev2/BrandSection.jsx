import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const LIFESTYLE_BG  = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=75';
const MOVEMENT_BG   = 'https://images.unsplash.com/photo-1547043386-e31db9b6a69c?w=1600&q=70';
const FALLBACK_PRODUCT = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=70';

function ProductCard({ product, index }) {
  const img = product.image_url || FALLBACK_PRODUCT;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden"
      style={{ background: '#111' }}>
      <div className="aspect-square overflow-hidden">
        <motion.img src={img} alt={product.name} className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.7) contrast(1.05) saturate(0.9)' }}
          whileHover={{ scale: 1.07 }} transition={{ duration: 0.5 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.85) 20%, transparent 60%)' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="font-bold text-sm" style={{ color: '#FFF8F5' }}>{product.name}</div>
        {product.price != null && <div className="font-black text-base mt-0.5" style={{ color: '#00FFDA' }}>${product.price}</div>}
      </div>
      <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#00FFDA', scaleX: 0, originX: 0 }}
        whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
    </motion.div>
  );
}

export default function BrandSection({ products = [] }) {
  return (
    <section className="relative" style={{ background: '#0a0a0a' }}>

      {/* ── Apparel band ── */}
      <div className="overflow-hidden" style={{ borderTop: '1px solid rgba(255,248,245,0.04)' }}>
        {/* Lifestyle banner */}
        <div className="relative" style={{ height: 220 }}>
          <img src={LIFESTYLE_BG} alt="" className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.3) contrast(1.15) saturate(0.6)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0a0a0a 100%)' }} />
          <div className="relative z-10 h-full flex items-center max-w-7xl mx-auto px-6">
            <div>
              <h2 className="font-black leading-none" style={{ color: '#FFF8F5', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                Wear the Culture.
              </h2>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase mt-2" style={{ color: 'rgba(255,248,245,0.35)' }}>Apparel</div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-16">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {products.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <div className="relative overflow-hidden flex items-center justify-center" style={{ height: 160, background: '#111' }}>
              <img src={LIFESTYLE_BG} alt="" className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.12) contrast(1.1)' }} />
              <div className="relative z-10 text-center">
                <div className="font-black text-4xl mb-1" style={{ color: 'rgba(255,248,245,0.08)' }}>HIJINX</div>
                <div className="text-xs" style={{ color: 'rgba(255,248,245,0.3)' }}>Apparel coming soon</div>
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Link to={createPageUrl('ApparelHome')} className="font-bold text-xs uppercase tracking-wide" style={{ color: 'rgba(255,248,245,0.35)' }}>
              Shop All →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Movement + CTA band ── */}
      <div className="relative overflow-hidden" style={{ borderTop: '1px solid rgba(0,255,218,0.06)', minHeight: 380 }}>
        <img src={MOVEMENT_BG} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.12) contrast(1.2) saturate(0.5)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,255,218,0.03) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.3), rgba(10,10,10,0.75))' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
            {/* Movement quote */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
              <motion.blockquote
                className="font-black leading-none mb-6"
                style={{ color: '#FFF8F5', fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                "Motorsports isn't<br />just a sport.{' '}
                <span style={{ color: '#00FFDA' }}>It's a culture.</span>"
              </motion.blockquote>
              <p className="text-sm leading-relaxed max-w-md" style={{ color: 'rgba(255,248,245,0.45)' }}>
                We built HIJINX for the drivers who grind, the teams who sacrifice, the tracks that shape legends, and the media that captures it all.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <h2 className="font-black leading-none mb-5" style={{ color: '#FFF8F5', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                Be Part of<br />the Ecosystem.
              </h2>
              <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: 'rgba(255,248,245,0.45)' }}>
                Drivers, teams, tracks, series, and media professionals — HIJINX brings the entire motorsports world together.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to={createPageUrl('MotorsportsHome')}
                    className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                    style={{ background: '#00FFDA', color: '#232323' }}>
                    Explore Motorsports
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to={createPageUrl('MediaHome')}
                    className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase"
                    style={{ border: '1px solid rgba(255,248,245,0.2)', color: '#FFF8F5' }}>
                    Media Portal
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>

          <div className="mt-16 pt-8" style={{ borderTop: '1px solid rgba(255,248,245,0.06)' }}>
            <div className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(255,248,245,0.18)' }}>
              HIJINX — Motorsports, Culture, Competition
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}