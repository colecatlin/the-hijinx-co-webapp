import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Shield, Zap } from 'lucide-react';

const PILLARS = [
  { icon: Cpu,    label: 'Verified Results',   sub: 'Race data you can trust.' },
  { icon: Shield, label: 'Real Profiles',       sub: 'Athletes, not aliases.' },
  { icon: Zap,    label: 'Live Tracking',       sub: 'The season as it happens.' },
];

export default function RaceCoreSection({ stats }) {
  return (
    <section className="bg-[#111111] py-16 md:py-24 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-6 h-[2px] bg-[#00FFDA]" />
              <span className="font-mono text-[10px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold">
                INDEX46 · Race Core
              </span>
            </div>

            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[0.92] mb-6">
              The Engine
              <br />
              <span className="text-[#00FFDA]">Behind It.</span>
            </h2>

            <p className="text-white/40 text-base leading-relaxed mb-10 max-w-md">
              Race Core is the infrastructure beneath everything. Real data. Verified results.
              The racing world — structured, searchable, and alive.
            </p>

            <div className="flex flex-col gap-4 mb-10">
              {PILLARS.map(({ icon: Icon, label, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,255,218,0.08)', border: '1px solid rgba(0,255,218,0.15)' }}>
                    <Icon className="w-4 h-4 text-[#00FFDA]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="text-xs text-white/35">{sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={createPageUrl('MotorsportsHome')}
                className="group inline-flex items-center gap-2 px-6 py-3 text-xs font-black tracking-wider uppercase transition-all duration-200 hover:gap-3"
                style={{ background: '#00FFDA', color: '#0A0A0A' }}
              >
                Explore INDEX46 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to={createPageUrl('DriverDirectory')}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wide uppercase border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all duration-200"
              >
                Driver Directory
              </Link>
            </div>
          </motion.div>

          {/* Right — glass stat panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="relative p-8 md:p-10 overflow-hidden"
              style={{ background: 'rgba(0,255,218,0.04)', border: '1px solid rgba(0,255,218,0.12)', backdropFilter: 'blur(16px)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #00FFDA80 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none"
                style={{ background: 'rgba(0,255,218,0.08)' }} />

              <div className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold mb-8">
                Platform Stats
              </div>

              {stats && stats.driver_count > 50 ? (
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: stats.driver_count, label: 'Driver Profiles' },
                    { value: stats.series_count, label: 'Series Tracked' },
                    { value: stats.track_count,  label: 'Tracks' },
                    { value: stats.event_count,  label: 'Events' },
                  ].filter(s => s.value > 0).map(s => (
                    <div key={s.label} className="border-l-2 border-[#00FFDA]/25 pl-4">
                      <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {s.value?.toLocaleString()}
                      </div>
                      <div className="font-mono text-[8px] tracking-[0.3em] text-white/35 uppercase mt-1">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Driver Profiles', desc: 'Verified athlete records across disciplines' },
                    { label: 'Live Results', desc: 'Race data published in real time' },
                    { label: 'Series & Classes', desc: 'National to grassroots coverage' },
                    { label: 'Events Tracked', desc: 'From registration to final results' },
                  ].map(item => (
                    <div key={item.label} className="border-l-2 border-[#00FFDA]/25 pl-4">
                      <div className="text-sm font-bold text-white mb-0.5">{item.label}</div>
                      <div className="text-xs text-white/35">{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-white/25 leading-relaxed">
                  Growing daily. Real athletes. Real results. Real races.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}