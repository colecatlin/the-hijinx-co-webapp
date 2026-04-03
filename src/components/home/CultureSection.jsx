import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const fadeUp = (i) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay: i * 0.09, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
});

// Grain overlay shared style
const grain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  backgroundSize: '128px 128px',
};

export default function CultureSection() {
  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-6 h-[2px] bg-[#FF6B35]" />
          <span className="font-mono text-[10px] tracking-[0.45em] text-[#FF6B35] uppercase font-bold">
            Culture
          </span>
        </div>

        {/*
          Asymmetric collage layout:
          Row A: [dominant image 8col] [text card 4col, tall]
          Row B: [text accent 5col, short] [image 4col] [image 3col, offset]
        */}
        <div className="grid grid-cols-12 gap-3 auto-rows-auto">

          {/* ── DOMINANT IMAGE — leads the section ── */}
          <motion.div
            {...fadeUp(0)}
            className="col-span-12 md:col-span-8 relative overflow-hidden group"
            style={{ height: 480 }}
          >
            <img
              src="https://images.unsplash.com/photo-1541348260-f05de38b0f68?w=1400&q=90&fit=crop"
              alt="Racing"
              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-1000"
              style={{ filter: 'contrast(1.15) saturate(0.7)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/20 to-transparent" />
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.035]" style={grain} />

            {/* Content pinned bottom-left */}
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <span className="font-mono text-[8px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold block mb-2">
                  Competition
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                  Born from the<br />garage.
                </h2>
              </div>
            </div>
            <div className="absolute inset-0 border border-white/[0.04]" />
          </motion.div>

          {/* ── TALL TEXT CARD — top right ── */}
          <motion.div
            {...fadeUp(1)}
            className="col-span-12 md:col-span-4 relative overflow-hidden flex flex-col justify-between"
            style={{
              height: 480,
              background: 'rgba(255,255,255,0.028)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.03]" style={grain} />
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, #00FFDA55 0%, transparent 70%)' }} />

            <div className="relative p-7 flex flex-col h-full justify-between">
              <span className="font-mono text-[9px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold">
                Identity
              </span>

              {/* Large number / editorial accent */}
              <div className="py-6">
                <div className="text-[7rem] font-black text-white/[0.04] leading-none select-none">46</div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-tight mb-3">
                  Built for the track.<br />Worn everywhere else.
                </h3>
                <p className="text-white/35 text-sm leading-relaxed">
                  Where racing culture meets real life — on and off the grid.
                </p>
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="mt-5 inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.3em] text-[#00FFDA] uppercase hover:gap-3 transition-all"
                >
                  Shop Apparel <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── BOTTOM ROW ── */}

          {/* Accent text card — wide, short */}
          <motion.div
            {...fadeUp(2)}
            className="col-span-12 md:col-span-5 relative overflow-hidden"
            style={{
              height: 200,
              background: 'rgba(255,107,53,0.07)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,107,53,0.14)',
            }}
          >
            <div className="absolute inset-0 opacity-[0.03]" style={grain} />
            <div className="relative p-7 h-full flex flex-col justify-between">
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#FF6B35] uppercase font-bold">
                Motorsports
              </span>
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                  We document<br />what others overlook.
                </h3>
                <Link
                  to={createPageUrl('OutletHome')}
                  className="flex-shrink-0 flex items-center gap-2 text-[9px] font-bold text-[#FF6B35] uppercase tracking-wider hover:gap-3 transition-all"
                >
                  Explore <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Mid image — slightly taller */}
          <motion.div
            {...fadeUp(3)}
            className="col-span-6 md:col-span-4 relative overflow-hidden group"
            style={{ height: 200 }}
          >
            <img
              src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=700&q=90&fit=crop"
                alt="Community"
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                style={{ filter: 'contrast(1.15) saturate(0.75) brightness(0.85)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="font-mono text-[8px] tracking-[0.35em] text-white/70 uppercase">Community</span>
            </div>
            <div className="absolute inset-0 border border-white/[0.04]" />
          </motion.div>

          {/* Small image — offset, slightly shorter to break alignment */}
          <motion.div
            {...fadeUp(4)}
            className="col-span-6 md:col-span-3 relative overflow-hidden group"
            style={{ height: 200, marginTop: 0 }}
          >
            <img
              src="https://images.unsplash.com/photo-1591445645563-8c748b56dc5e?w=600&q=90&fit=crop"
                alt="Garage"
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                style={{ filter: 'contrast(1.2) saturate(0.7) brightness(0.88)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="font-mono text-[8px] tracking-[0.35em] text-white/70 uppercase">Garage</span>
            </div>
            <div className="absolute inset-0 border border-white/[0.04]" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}