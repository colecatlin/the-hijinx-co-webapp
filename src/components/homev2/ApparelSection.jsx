import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';

const LIFESTYLE_BG = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=75';
const FALLBACK_PRODUCT = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=70';

function ProductCard({ product, index, large = false }) {
  const img = product.image_url || FALLBACK_PRODUCT;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden"
      style={{ background: '#111' }}
    >
      <div className={`overflow-hidden ${large ? 'aspect-[3/4]' : 'aspect-square'}`}>
        <motion.img src={img} alt={product.name} className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.7) contrast(1.05) saturate(0.9)' }}
          whileHover={{ scale: 1.07, filter: 'brightness(0.85) contrast(1.05) saturate(1)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
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

export default function ApparelSection({ products = [] }) {
  return (
    <section style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,248,245,0.05)' }} className="overflow-hidden">
      {/* Lifestyle hero banner */}
      <div className="relative" style={{ height: 260 }}>
        <img src={LIFESTYLE_BG} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.3) contrast(1.15) saturate(0.6)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0a0a0a 100%)' }} />
        <div className="relative z-10 h-full flex items-center max-w-7xl mx-auto px-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Apparel</span>
            </div>
            <h2 className="font-black leading-none" style={{ color: '#FFF8F5', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}>
              Wear the Culture.
            </h2>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {products.slice(0, 4).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} large={i === 0} />
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden flex items-center justify-center" style={{ height: 200, background: '#111' }}>
            <img src={LIFESTYLE_BG} alt="" className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.15) contrast(1.1)' }} />
            <div className="relative z-10 text-center">
              <div className="font-black text-5xl mb-2" style={{ color: 'rgba(255,248,245,0.1)' }}>HIJINX</div>
              <div className="text-xs" style={{ color: 'rgba(255,248,245,0.3)' }}>Apparel coming soon</div>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Link to={createPageUrl('ApparelHome')} className="font-bold text-xs uppercase tracking-wide" style={{ color: 'rgba(255,248,245,0.35)' }}>
            Shop All →
          </Link>
        </div>
      </div>
    </section>
  );
}