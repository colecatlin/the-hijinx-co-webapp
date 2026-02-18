import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Flag, Newspaper } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative bg-[#232323] text-[#FFF8F5] overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="font-mono text-xs tracking-[0.3em] text-[#FFF8F5] opacity-70 uppercase">
            The Hijinx Co LLC
          </span>
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight mt-4 max-w-5xl leading-[0.95]">
            Media. Motorsports.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFDA] to-[#FFF8F5]/60">
              Culture. Built&nbsp;Different.
            </span>
          </h1>
          <p className="text-[#FFF8F5] opacity-80 text-base md:text-lg mt-6 max-w-xl leading-relaxed">
            A multi-vertical platform operating at the intersection of editorial publishing, 
            competitive motorsports, technology, and lifestyle.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            <Link
              to={createPageUrl('OutletHome')}
              className="flex items-center gap-2 px-5 py-3 bg-[#00FFDA] text-[#232323] text-sm font-bold hover:bg-white transition-colors"
            >
              <Newspaper className="w-4 h-4" />
              Read The Outlet
            </Link>
            <Link
              to={createPageUrl('MotorsportsHome')}
              className="flex items-center gap-2 px-5 py-3 border border-[#FFF8F5]/30 text-[#FFF8F5] text-sm font-bold hover:border-[#00FFDA] hover:text-[#00FFDA] transition-colors"
            >
              <Flag className="w-4 h-4" />
              Motorsports
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-[#00FFDA] via-[#FFF8F5] to-transparent" />
    </section>
  );
}