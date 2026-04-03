import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';

const APPAREL_BG = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1400&q=90&fit=crop';
const DROPS = [
  { label: 'Race Day', tag: 'New Season', sub: 'Built for the track and everywhere else.' },
  { label: 'Heritage Series', tag: 'Limited', sub: 'Rooted in motorsports culture.' },
];

export default function ApparelSection({ products = [] }) {
  const featuredProduct = products.find(p => p.featured) || products[0];

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-center gap-3 mb-10">
          <div className="w-6 h-[2px] bg-[#E5FF00]" />
          <span className="font-mono text-[10px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold">
            HIJINX CO. · Apparel
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">

          {/* Dominant lifestyle card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65 }}
            className="lg:col-span-2"
          >
            <Link
              to={featuredProduct ? `/product/${featuredProduct.slug || featuredProduct.id}` : createPageUrl('ApparelHome')}
              className="group relative flex flex-col justify-end min-h-[500px] overflow-hidden block"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <img
                src={featuredProduct?.cover_image_url || APPAREL_BG}
                alt="HIJINX Apparel"
                className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-85 group-hover:scale-[1.03] transition-all duration-700"
                style={{ filter: 'contrast(1.12) saturate(0.85)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #E5FF0099 0%, transparent 60%)' }} />
              <div className="absolute top-0 left-0 bottom-0 w-[2px]"
                style={{ background: 'linear-gradient(180deg, #E5FF0060 0%, transparent 60%)' }} />

              <div className="relative p-8 md:p-12">
                <p className="font-mono text-[9px] tracking-[0.45em] text-[#E5FF00] uppercase font-bold mb-4">
                  HIJINX CO.
                </p>
                <h3 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-2">
                  {featuredProduct?.name || 'LIFESTYLE'}
                  <br />
                  <span style={{ color: '#E5FF00' }}>
                    {featuredProduct ? '' : 'APPAREL'}
                  </span>
                </h3>
                {featuredProduct?.short_description && (
                  <p className="text-white/40 text-sm mt-3 mb-6 max-w-sm leading-relaxed">
                    {featuredProduct.short_description}
                  </p>
                )}
                {!featuredProduct && (
                  <p className="text-white/40 text-sm mt-3 mb-6 tracking-widest uppercase font-light">
                    In motion. On purpose.
                  </p>
                )}
                <div className="inline-flex items-center gap-2.5 px-6 py-3 text-xs font-black tracking-wider uppercase transition-all duration-200 group-hover:gap-4"
                  style={{ background: '#E5FF00', color: '#0A0A0A' }}>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {featuredProduct ? 'View Product' : 'Shop HIJINX'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Supporting drop cards */}
          <div className="flex flex-col gap-3">
            {DROPS.map((drop, i) => (
              <motion.div
                key={drop.label}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex-1"
              >
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="group flex flex-col justify-between h-full min-h-[180px] p-6 md:p-8 transition-all duration-200 relative overflow-hidden block"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, ${i === 0 ? '#E5FF00' : '#FF6B35'}44 0%, transparent 60%)` }} />
                  <div>
                    <span className="font-mono text-[8px] tracking-[0.4em] uppercase font-bold"
                      style={{ color: i === 0 ? '#E5FF00' : '#FF6B35' }}>
                      {drop.tag}
                    </span>
                    <h4 className="text-lg md:text-xl font-black text-white mt-2 group-hover:text-[#E5FF00] transition-colors tracking-tight">
                      {drop.label}
                    </h4>
                    <p className="text-white/40 text-xs mt-2 leading-relaxed">{drop.sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#E5FF00] group-hover:translate-x-1 transition-all mt-4" />
                </Link>
              </motion.div>
            ))}

            <Link
              to={createPageUrl('ApparelHome')}
              className="flex items-center justify-center gap-2 py-4 font-mono text-[9px] tracking-[0.3em] text-white/30 hover:text-[#E5FF00] transition-colors uppercase"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ShoppingBag className="w-3 h-3" />
              Shop All Apparel
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}