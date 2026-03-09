import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Gauge, ArrowRight, Activity, Radio, Target, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  { Icon: Activity,   label: 'Live Event Management' },
  { Icon: Radio,      label: 'Results & Standings' },
  { Icon: Target,     label: 'Entry Processing' },
  { Icon: Zap,        label: 'Race Control Tools' },
  { Icon: TrendingUp, label: 'Points Systems' },
  { Icon: Gauge,      label: 'Tech Inspection' },
];

const MOCK_ROWS = [
  { pos: '01', num: '#18', pts: '248 pts' },
  { pos: '02', num: '#44', pts: '241 pts' },
  { pos: '03', num: '#07', pts: '235 pts' },
  { pos: '04', num: '#12', pts: '228 pts' },
  { pos: '05', num: '#33', pts: '219 pts' },
];

export default function HomepageRaceCoreTeaser() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden border-b border-white/5">

      {/* Rich dark background with blue-teal gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#000D1A] via-[#001A0D] to-[#050505]" />
      <div className="absolute inset-0 grid-bg opacity-[0.05]" />

      {/* Teal glow right */}
      <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-[#00FFDA]/7 to-transparent pointer-events-none" />
      {/* Blue glow left */}
      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#2563EB]/6 to-transparent pointer-events-none" />

      {/* Left vertical accent */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[#00FFDA]/40 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 mb-7">
              <Gauge className="w-5 h-5 text-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">Race Core</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[0.92] mb-6">
              The operating system
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] to-[#2563EB]">for motorsports.</span>
            </h2>

            <p className="text-white/60 text-base leading-relaxed max-w-md mb-10">
              Race Core powers event management, driver registration, tech inspection, results processing, standings, and live race control for tracks and series operators nationwide.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-10">
              {FEATURES.map(({ Icon: FeatureIcon, label }) => (
                <div key={label} className="flex items-center gap-2.5 border border-white/8 hover:border-[#00FFDA]/35 bg-white/3 hover:bg-[#00FFDA]/5 px-3.5 py-3 transition-all duration-200">
                  <FeatureIcon className="w-3.5 h-3.5 text-[#00FFDA]/70 flex-shrink-0" />
                  <span className="text-[11px] text-white/60 font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <Link
              to={createPageUrl('Registration')}
              className="group inline-flex items-center gap-2.5 px-7 py-4 bg-[#00FFDA] text-[#050A0A] text-sm font-black tracking-wider uppercase hover:bg-white hover:shadow-[0_0_24px_rgba(0,255,218,0.35)] transition-all duration-200"
            >
              <Gauge className="w-4 h-4" />
              Open Race Core
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right: Mock interface */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative border border-[#00FFDA]/20 bg-[#060D14] shadow-[0_0_60px_rgba(0,255,218,0.06)]">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/80 via-[#2563EB]/40 to-transparent" />

              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-[#00FFDA]/55" />
                </div>
                <span className="font-mono text-[9px] tracking-[0.25em] text-white/35 uppercase ml-2">Race Core · Standings</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  <span className="font-mono text-[8px] text-[#EF4444] uppercase tracking-widest font-bold">Live</span>
                </div>
              </div>

              {/* Nav tabs mock */}
              <div className="flex gap-1 px-5 pt-3 pb-3 border-b border-white/5">
                {['Overview', 'Entries', 'Results', 'Tech', 'Standings'].map((tab, i) => (
                  <div
                    key={tab}
                    className={`px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] uppercase ${
                      i === 4
                        ? 'bg-[#00FFDA]/15 text-[#00FFDA] border border-[#00FFDA]/30'
                        : 'text-white/20'
                    }`}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              {/* Header row */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-white/5">
                <span className="font-mono text-[8px] text-white/20 w-6">POS</span>
                <span className="font-mono text-[8px] text-white/20 flex-1">DRIVER</span>
                <span className="font-mono text-[8px] text-white/20 w-12">NO.</span>
                <span className="font-mono text-[8px] text-white/20 w-16 text-right">POINTS</span>
              </div>

              {/* Data rows */}
              {MOCK_ROWS.map((row, i) => (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/3 transition-colors ${i === 0 ? 'bg-[#00FFDA]/4' : ''}`}>
                  <span className={`font-mono text-xs w-6 font-bold ${i === 0 ? 'text-[#00FFDA]' : 'text-[#00FFDA]/45'}`}>{row.pos}</span>
                  <div className="flex-1 flex gap-2 items-center">
                    <div className={`w-5 h-5 rounded-sm flex-shrink-0 ${i === 0 ? 'bg-[#00FFDA]/20' : 'bg-white/8'}`} />
                    <div className="h-2 bg-white/12 rounded-sm" style={{ width: `${60 + i * 12}px` }} />
                  </div>
                  <span className="font-mono text-[10px] text-white/25 w-12">{row.num}</span>
                  <span className={`font-mono text-[10px] w-16 text-right font-bold ${i === 0 ? 'text-[#00FFDA]' : 'text-[#00FFDA]/50'}`}>{row.pts}</span>
                </div>
              ))}

              <div className="px-5 py-4 border-t border-white/5 flex justify-between items-center">
                <span className="font-mono text-[9px] text-white/20 uppercase tracking-widest">24 of 24 drivers</span>
                <span className="font-mono text-[9px] text-[#00FFDA]/40 uppercase tracking-widest">Round 8 of 12</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}