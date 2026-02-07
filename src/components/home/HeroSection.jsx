import React from 'react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative bg-[#0A0A0A] text-white overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-36">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="font-mono text-xs tracking-[0.3em] text-gray-400 uppercase">
            The Hijinx Co LLC
          </span>
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight mt-4 max-w-5xl leading-[0.95]">
            Media. Motorsports.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
              Culture. Built&nbsp;Different.
            </span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg mt-6 max-w-xl leading-relaxed">
            A multi-vertical platform operating at the intersection of editorial publishing, 
            competitive motorsports, technology, and lifestyle.
          </p>
        </motion.div>
      </div>
      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
    </section>
  );
}