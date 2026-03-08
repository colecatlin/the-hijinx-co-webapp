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
    <section className="bg-[#060606] py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="w-10 h-px bg-[#00FFDA]/30" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#00FFDA] uppercase">Where to Next</span>
            <div className="w-10 h-px bg-[#00FFDA]/30" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Your next move.
          </h2>
        </motion.div>

        {/* Path cards */}
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
                  className={`group flex flex-col h-full min-h-[210px] p-7 border transition-all duration-300 ${
                    path.featured
                      ? 'border-[#00FFDA]/25 bg-[#00170E] hover:border-[#00FFDA]/55'
                      : 'border-white/5 bg-[#0C0C0C] hover:border-white/12'
                  }`}
                >
                  {/* Top accent for featured */}
                  {path.featured && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#00FFDA]/50 to-transparent" />
                  )}

                  <Icon className={`w-5 h-5 mb-5 transition-colors ${path.featured ? 'text-[#00FFDA]' : 'text-white/18 group-hover:text-white/45'}`} />
                  <h3 className={`text-lg font-black tracking-tight mb-2.5 ${path.featured ? 'text-[#00FFDA]' : 'text-white'}`}>
                    {path.title}
                  </h3>
                  <p className="text-white/28 text-sm flex-1 leading-relaxed">{path.sub}</p>
                  <div className={`flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wider uppercase transition-all ${path.featured ? 'text-[#00FFDA]' : 'text-white/18 group-hover:text-white/50'}`}>
                    {path.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Brand sign-off */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-20 pt-12 border-t border-white/5 text-center"
        >
          <p className="font-mono text-[9px] tracking-[0.45em] text-white/12 uppercase">
            HIJINX CO · Motorsports · Culture · Movement · Identity · {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </section>
  );
}