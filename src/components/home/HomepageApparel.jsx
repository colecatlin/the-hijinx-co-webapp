import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const COLLECTION_CARDS = [
  { label: 'Race Day Collection', sub: 'Built for the track and beyond.',     tag: 'New Season' },
  { label: 'Heritage Series',      sub: 'Rooted in motorsports culture.',      tag: 'Limited' },
  { label: "Builder's Edit",       sub: 'For the ones who make it happen.',    tag: 'Essentials' },
];

export default function HomepageApparel() {
  return (
    <section className="bg-[#080808] py-20 md:py-28 border-b border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">HIJINX CO.</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Lifestyle Apparel</h2>
          </div>
          <Link
            to={createPageUrl('ApparelHome')}
            className="hidden md:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-white/25 hover:text-[#00FFDA] transition-colors uppercase"
          >
            Shop All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Large feature block */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="lg:col-span-2"
          >
            <Link
              to={createPageUrl('ApparelHome')}
              className="group relative flex flex-col justify-end min-h-[400px] overflow-hidden border border-white/5 hover:border-[#00FFDA]/20 transition-all duration-300"
            >
              <img
                src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80"
                alt="HIJINX Apparel"
                className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 group-hover:scale-105 transition-all duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/98 via-[#080808]/55 to-transparent" />

              {/* Left teal stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00FFDA]/60 via-[#00FFDA]/30 to-transparent" />

              <div className="relative p-8 md:p-10">
                <p className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase mb-4">HIJINX CO.</p>
                <h3 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none mb-2">
                  LIFESTYLE
                  <br />
                  <span className="text-[#00FFDA]">APPAREL</span>
                </h3>
                <p className="text-white/35 text-sm tracking-widest uppercase mt-3 mb-7 font-light">
                  In motion. On purpose.
                </p>
                <div className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#00FFDA]/8 border border-[#00FFDA]/25 text-[#00FFDA] text-xs font-black tracking-wider uppercase group-hover:bg-[#00FFDA] group-hover:text-[#080808] transition-all duration-300">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Shop Collection
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Collection cards */}
          <div className="flex flex-col gap-3">
            {COLLECTION_CARDS.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex-1"
              >
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="group flex flex-col justify-between h-full min-h-[110px] border border-white/5 hover:border-[#00FFDA]/20 p-5 transition-all duration-200"
                >
                  <div>
                    <span className="font-mono text-[9px] tracking-[0.3em] text-[#00FFDA]/45 uppercase">{card.tag}</span>
                    <h4 className="text-sm font-black text-white mt-2 group-hover:text-[#00FFDA] transition-colors">{card.label}</h4>
                    <p className="text-white/30 text-xs mt-1 leading-relaxed">{card.sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-[#00FFDA] group-hover:translate-x-1 transition-all mt-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 md:hidden">
          <Link
            to={createPageUrl('ApparelHome')}
            className="flex items-center justify-center gap-2 border border-white/8 hover:border-[#00FFDA]/25 py-4 font-mono text-[10px] tracking-[0.25em] text-white/25 hover:text-[#00FFDA] transition-all uppercase"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Shop All Apparel
          </Link>
        </div>
      </div>
    </section>
  );
}