import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, Zap } from 'lucide-react';

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] },
});

export default function CultureSection() {
  return (
    <>
      {/* ═══════════════════════════════════════════════
          SECTION 1 — THE STATEMENT
          Full-bleed dominant image with bold editorial copy
      ════════════════════════════════════════════════ */}
      <section className="relative bg-[#0A0A0A] overflow-hidden">
        {/* Full-bleed background image */}
        <div className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=90&fit=crop"
            alt="Racing culture"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'contrast(1.2) saturate(0.6) brightness(0.55)' }}
          />
          {/* Strong vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end pb-16 px-6 md:px-16 max-w-7xl mx-auto left-0 right-0">
            <motion.div {...fadeIn(0)}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-[2px] bg-[#00FFDA]" />
                <span className="font-mono text-[10px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">
                  Culture
                </span>
              </div>
            </motion.div>

            <motion.h2
              {...fadeIn(0.08)}
              className="text-6xl sm:text-7xl md:text-[96px] font-black text-white leading-[0.9] tracking-tight mb-6 uppercase"
            >
              Born<br />
              <span className="text-[#00FFDA]">from</span><br />
              the garage.
            </motion.h2>

            <motion.p
              {...fadeIn(0.16)}
              className="text-white/60 text-lg md:text-xl max-w-md leading-relaxed mb-8"
            >
              Where real racing lives. Not the highlight reel — the grit, the grind, and the people who make it happen.
            </motion.p>

            <motion.div {...fadeIn(0.22)} className="flex flex-wrap gap-4">
              <Link
                to={createPageUrl('OutletHome')}
                className="inline-flex items-center gap-2 bg-[#00FFDA] text-black text-xs font-black uppercase tracking-widest px-6 py-3 hover:bg-white transition-colors"
              >
                Read The Outlet <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={createPageUrl('DriverDirectory')}
                className="inline-flex items-center gap-2 border border-white/30 text-white text-xs font-black uppercase tracking-widest px-6 py-3 hover:border-white transition-colors"
              >
                Driver Directory <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Right-side stat */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-right hidden lg:block">
            <div className="text-[120px] font-black text-white/[0.06] leading-none select-none tracking-tighter">46</div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — THE GRID
          Three bold panels: text + two images
      ════════════════════════════════════════════════ */}
      <section className="bg-[#0A0A0A] pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">

          {/* Top divider with label */}
          <div className="flex items-center gap-4 py-10 border-t border-white/[0.06]">
            <Zap className="w-4 h-4 text-[#FF6B35]" />
            <span className="font-mono text-[10px] tracking-[0.5em] text-white/40 uppercase font-bold">
              On &amp; Off The Grid
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.06]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

            {/* ── BIG TEXT PANEL ── */}
            <motion.div
              {...fadeIn(0)}
              className="md:col-span-5 relative overflow-hidden flex flex-col justify-between"
              style={{
                minHeight: 420,
                background: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(0,0,0,0) 60%)',
                border: '1px solid rgba(255,107,53,0.2)',
              }}
            >
              <div className="p-8 md:p-10 flex flex-col h-full justify-between">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold block mb-6">
                    Motorsports
                  </span>
                  <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase mb-4">
                    We document<br />what others<br />overlook.
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                    Grassroots to professional. Every class, every series, every story worth telling.
                  </p>
                </div>
                <Link
                  to={createPageUrl('OutletHome')}
                  className="mt-8 self-start inline-flex items-center gap-2 text-[#FF6B35] text-xs font-black uppercase tracking-widest border border-[#FF6B35]/40 px-5 py-3 hover:bg-[#FF6B35] hover:text-black transition-all"
                >
                  Explore Stories <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* ── IMAGE: CREW ── */}
            <motion.div
              {...fadeIn(0.08)}
              className="md:col-span-4 relative overflow-hidden group"
              style={{ minHeight: 420 }}
            >
              <img
                src="https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=90&fit=crop"
                alt="Crew at the track"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                style={{ filter: 'contrast(1.15) saturate(0.65) brightness(0.8)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="font-mono text-[8px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold block mb-2">Crew</span>
                <p className="text-white text-lg font-black uppercase tracking-tight leading-tight">The ones who<br />make it run.</p>
              </div>
              <div className="absolute inset-0 border border-white/[0.05]" />
            </motion.div>

            {/* ── IMAGE: GARAGE + APPAREL CTA ── */}
            <motion.div
              {...fadeIn(0.16)}
              className="md:col-span-3 relative overflow-hidden group flex flex-col gap-3"
            >
              {/* Image */}
              <div className="relative overflow-hidden flex-1" style={{ minHeight: 260 }}>
                <img
                  src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=90&fit=crop"
                  alt="Garage"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ filter: 'contrast(1.2) saturate(0.6) brightness(0.75)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <span className="font-mono text-[8px] tracking-[0.4em] text-white/60 uppercase font-bold">Garage</span>
                </div>
                <div className="absolute inset-0 border border-white/[0.05]" />
              </div>

              {/* Apparel CTA card */}
              <div
                className="p-6 flex flex-col gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">Apparel</span>
                <p className="text-white text-sm font-bold leading-tight">Built for the track. Worn everywhere else.</p>
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="inline-flex items-center gap-1.5 text-[#00FFDA] text-[9px] font-black uppercase tracking-widest hover:gap-3 transition-all"
                >
                  Shop Now <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </>
  );
}