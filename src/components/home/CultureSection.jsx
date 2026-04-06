import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight } from 'lucide-react';

const reveal = (i = 0) => ({
  initial: { opacity: 0, scale: 1.04 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.05 },
  transition: { delay: i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
});

const grain = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
  backgroundSize: '128px 128px',
};

export default function CultureSection() {
  return (
    <section className="bg-[#0A0A0A] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* ── Section label ── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-[2px] bg-[#00FFDA]" />
          <span className="font-mono text-[10px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">
            Culture
          </span>
        </div>

        {/* ══════════════════════════════
            FILM STRIP — Row A
            [dominant 8col] + [text 4col]
        ══════════════════════════════ */}
        <div className="grid grid-cols-12 gap-2 md:gap-3 mb-2 md:mb-3">

          {/* DOMINANT IMAGE */}
          <motion.div
            {...reveal(0)}
            className="col-span-12 md:col-span-8 relative overflow-hidden group cursor-pointer"
            style={{ height: 520 }}
          >
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=90&fit=crop"
              alt="Racing"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000"
              style={{ filter: 'contrast(1.2) saturate(0.65) brightness(0.6)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-0 opacity-[0.04]" style={grain} />

            {/* Bold label top-left */}
            <div className="absolute top-6 left-6">
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">Competition</span>
            </div>

            {/* Massive headline bottom-left */}
            <div className="absolute bottom-8 left-8 right-8">
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-tight leading-[0.88]">
                Born<br />
                from the<br />
                <span className="text-[#00FFDA]">garage.</span>
              </h2>
            </div>

            <div className="absolute inset-0 border border-white/[0.06]" />
          </motion.div>

          {/* TEXT CARD */}
          <motion.div
            {...reveal(1)}
            className="col-span-12 md:col-span-4 relative overflow-hidden flex flex-col justify-between"
            style={{
              height: 520,
              background: 'linear-gradient(160deg, rgba(255,107,53,0.10) 0%, rgba(0,0,0,0.0) 60%)',
              border: '1px solid rgba(255,107,53,0.18)',
            }}
          >
            <div className="absolute inset-0 opacity-[0.03]" style={grain} />
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #FF6B35 0%, transparent 60%)' }} />

            <div className="relative p-8 flex flex-col h-full justify-between">
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#FF6B35] uppercase font-bold">
                Motorsports
              </span>

              <div className="my-4">
                {/* Giant ghost number */}
                <div className="text-[9rem] font-black leading-none select-none"
                  style={{ color: 'rgba(255,107,53,0.07)' }}>46</div>
              </div>

              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4">
                  We document<br />what others<br />overlook.
                </h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  Grassroots to pro. Every class, every series, every story worth telling.
                </p>
                <Link
                  to={createPageUrl('OutletHome')}
                  className="inline-flex items-center gap-2 text-[9px] font-black tracking-[0.35em] text-[#FF6B35] uppercase border border-[#FF6B35]/40 px-5 py-3 hover:bg-[#FF6B35] hover:text-black transition-all"
                >
                  Read The Outlet <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════
            FILM STRIP — Row B
            [image 4col] + [image 4col] + [text 4col]
        ══════════════════════════════ */}
        <div className="grid grid-cols-12 gap-2 md:gap-3">

          {/* CREW IMAGE */}
          <motion.div
            {...reveal(2)}
            className="col-span-6 md:col-span-4 relative overflow-hidden group cursor-pointer"
            style={{ height: 280 }}
          >
            <img
              src="https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=90&fit=crop"
              alt="Crew"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
              style={{ filter: 'contrast(1.2) saturate(0.6) brightness(0.7)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-0 opacity-[0.04]" style={grain} />

            {/* Vertical sidebar label */}
            <div className="absolute top-5 right-4 flex flex-col items-center gap-1">
              <div className="w-[1px] h-10 bg-white/20" />
              <span className="font-mono text-[8px] tracking-[0.5em] text-white/50 uppercase font-bold"
                style={{ writingMode: 'vertical-rl' }}>Crew</span>
            </div>

            <div className="absolute bottom-5 left-5">
              <p className="text-white text-lg font-black uppercase tracking-tight leading-tight">
                The ones<br />who make it run.
              </p>
            </div>
            <div className="absolute inset-0 border border-white/[0.05]" />
          </motion.div>

          {/* GARAGE IMAGE */}
          <motion.div
            {...reveal(3)}
            className="col-span-6 md:col-span-4 relative overflow-hidden group cursor-pointer"
            style={{ height: 280 }}
          >
            <img
              src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=90&fit=crop"
              alt="Garage"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
              style={{ filter: 'contrast(1.2) saturate(0.6) brightness(0.7)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-0 opacity-[0.04]" style={grain} />

            {/* Vertical sidebar label */}
            <div className="absolute top-5 right-4 flex flex-col items-center gap-1">
              <div className="w-[1px] h-10 bg-white/20" />
              <span className="font-mono text-[8px] tracking-[0.5em] text-white/50 uppercase font-bold"
                style={{ writingMode: 'vertical-rl' }}>Garage</span>
            </div>

            <div className="absolute bottom-5 left-5">
              <p className="text-white text-lg font-black uppercase tracking-tight leading-tight">
                Built in<br />the dark.
              </p>
            </div>
            <div className="absolute inset-0 border border-white/[0.05]" />
          </motion.div>

          {/* APPAREL CTA CARD */}
          <motion.div
            {...reveal(4)}
            className="col-span-12 md:col-span-4 relative overflow-hidden flex flex-col justify-between"
            style={{
              height: 280,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(0,255,218,0.12)',
            }}
          >
            <div className="absolute inset-0 opacity-[0.03]" style={grain} />
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #00FFDA 0%, transparent 60%)' }} />

            <div className="relative p-8 flex flex-col h-full justify-between">
              <span className="font-mono text-[9px] tracking-[0.5em] text-[#00FFDA] uppercase font-bold">
                Identity
              </span>

              <div>
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight mb-3">
                  Built for the track.<br />
                  <span className="text-[#00FFDA]">Worn</span> everywhere else.
                </h3>
                <p className="text-white/35 text-xs leading-relaxed mb-5">
                  Where racing culture meets real life — on and off the grid.
                </p>
                <Link
                  to={createPageUrl('ApparelHome')}
                  className="inline-flex items-center gap-2 text-[9px] font-black tracking-[0.35em] text-[#00FFDA] uppercase hover:gap-4 transition-all"
                >
                  Shop Apparel <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}