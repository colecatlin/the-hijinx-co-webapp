import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const fadeUp = (i) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
});

export default function CultureSection() {
  return (
    <section className="bg-[#111010] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Main 3-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">

          {/* LEFT: Large culture + apparel card */}
          <motion.div
            {...fadeUp(0)}
            className="md:col-span-5 relative rounded-2xl overflow-hidden group cursor-pointer"
            style={{ minHeight: 480 }}
          >
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1000&q=90&fit=crop"
              alt="Culture"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
              style={{ filter: 'contrast(1.1) saturate(0.65) brightness(0.75)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-between p-7" style={{ minHeight: 480 }}>
              {/* Top label */}
              <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">Culture</span>

              {/* Bottom copy */}
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                  Culture
                </h2>
                <p className="text-white/60 text-sm leading-relaxed mb-1">Born from the garage.</p>
                <p className="text-white/60 text-sm leading-relaxed mb-1">Built for the track. Worn everywhere else.</p>
                <p className="text-white/60 text-sm leading-relaxed mb-5">
                  Where racing culture meets real life — on and off the grid.
                </p>
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                >
                  Shop Apparel <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* CENTER: Tall race car image */}
          <motion.div
            {...fadeUp(1)}
            className="md:col-span-3 relative rounded-2xl overflow-hidden group cursor-pointer"
            style={{ minHeight: 480 }}
          >
            <img
              src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=700&q=90&fit=crop"
              alt="On Track"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
              style={{ filter: 'contrast(1.1) saturate(0.7) brightness(0.8)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: 480 }}>
              <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">On Track</span>
            </div>
          </motion.div>

          {/* RIGHT: Two stacked cards */}
          <div className="md:col-span-4 flex flex-col gap-3">

            {/* Top right: Camera crew / media image */}
            <motion.div
              {...fadeUp(2)}
              className="relative rounded-2xl overflow-hidden group cursor-pointer flex-1"
              style={{ minHeight: 230 }}
            >
              <img
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=700&q=90&fit=crop"
                alt="Media"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                style={{ filter: 'contrast(1.1) saturate(0.65) brightness(0.75)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-5" style={{ minHeight: 230 }}>
                <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">Media</span>
              </div>
            </motion.div>

            {/* Bottom right: Editorial text card */}
            <motion.div
              {...fadeUp(3)}
              className="relative rounded-2xl overflow-hidden group cursor-pointer flex-1 bg-[#1A1A18]"
              style={{ minHeight: 230 }}
            >
              {/* Subtle helmet/gear image */}
              <img
                src="https://images.unsplash.com/photo-1541447270539-4df1aa6d8e0e?w=700&q=90&fit=crop"
                alt="Gear"
                className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                style={{ filter: 'saturate(0)' }}
              />
              <div className="relative h-full flex flex-col justify-between p-6" style={{ minHeight: 230 }}>
                <span className="text-[10px] font-bold tracking-[0.35em] text-white/40 uppercase">Editorial</span>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-4">
                    We document what others overlook.
                  </h3>
                  <Link
                    to={createPageUrl('OutletHome')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white border-b border-white/30 pb-0.5 hover:border-white transition-colors"
                  >
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
}