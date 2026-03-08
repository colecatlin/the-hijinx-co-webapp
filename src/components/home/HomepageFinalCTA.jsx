import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Gauge, ShoppingBag, Trophy, Camera, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const CTA_PATHS = [
  {
    Icon: Gauge,
    title: 'Race Core',
    sub: 'Manage events, entries, results, and live operations.',
    cta: 'Enter Race Core',
    page: 'Registration',
    featured: true,
  },
  {
    Icon: ShoppingBag,
    title: 'HIJINX Apparel',
    sub: 'Lifestyle gear for the racing community.',
    cta: 'Shop Now',
    page: 'ApparelHome',
  },
  {
    Icon: Trophy,
    title: 'Motorsports',
    sub: 'Drivers, tracks, series, events, and results.',
    cta: 'Explore INDEX46',
    page: 'MotorsportsHome',
  },
  {
    Icon: Camera,
    title: 'Media Portal',
    sub: 'Credentialing and coverage for media professionals.',
    cta: 'Access Portal',
    page: 'MediaPortal',
  },
];

export default function HomepageFinalCTA() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">

      {/* Rich teal-to-navy gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#001F1F] via-[#001233] to-[#000D20]" />
      {/* Teal glow — top left */}
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-[#00FFDA]/8 rounded-full blur-[130px] pointer-events-none" />
      {/* Blue glow — bottom right */}
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#2563EB]/10 rounded-full blur-[110px] pointer-events-none" />
      {/* Top edge accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FFDA]/60 to-transparent" />
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-[0.04]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="w-10 h-px bg-[#00FFDA]/60" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#00FFDA] uppercase font-bold">Where to Next</span>
            <div className="w-10 h-px bg-[#00FFDA]/60" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Your next move.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CTA_PATHS.map((path, i) => {
            const Icon = path.Icon;
            return (
              <motion.div
                key={path.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.5 }}
              >
                <Link
                  to={createPageUrl(path.page)}
                  className={`group relative flex flex-col h-full min-h-[210px] p-7 border transition-all duration-300 overflow-hidden ${
                    path.featured
                      ? 'border-[#00FFDA]/40 bg-[#00FFDA]/8 hover:bg-[#00FFDA]/14 hover:border-[#00FFDA]/70'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#2563EB]/50'
                  }`}
                >
                  {path.featured && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/90 to-transparent" />
                  )}

                  <Icon className={`w-5 h-5 mb-5 transition-colors ${
                    path.featured ? 'text-[#00FFDA]' : 'text-white/30 group-hover:text-[#2563EB]'
                  }`} />
                  <h3 className={`text-lg font-black tracking-tight mb-2.5 ${path.featured ? 'text-[#00FFDA]' : 'text-white'}`}>
                    {path.title}
                  </h3>
                  <p className="text-white/50 text-sm flex-1 leading-relaxed">{path.sub}</p>
                  <div className={`flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wider uppercase transition-all ${
                    path.featured ? 'text-[#00FFDA]' : 'text-white/30 group-hover:text-[#2563EB]'
                  }`}>
                    {path.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-20 pt-12 border-t border-white/8 text-center"
        >
          <p className="font-mono text-[9px] tracking-[0.45em] text-white/25 uppercase">
            HIJINX CO · Motorsports · Culture · Movement · Identity · {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </section>
  );
}