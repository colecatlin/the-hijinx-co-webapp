import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const BG_TEXTURE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png';
const HERO_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d3e32f1e6_46HeaderPhoto.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

export default function HomepageRaceCoreTeaser() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: '520px' }}>

      {/* Base dark bg + texture */}
      <div className="absolute inset-0 bg-[#050A0A]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('${BG_TEXTURE}')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '1024px auto',
          opacity: 0.35,
        }}
      />

      {/* Hero photo — right side */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-top opacity-40"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.95) 0%, rgba(4,8,8,0.75) 45%, rgba(4,8,8,0.25) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.3) 0%, rgba(4,8,8,0.0) 40%, rgba(4,8,8,0.6) 100%)' }} />
        {/* Teal accent lines */}
        <div className="absolute top-0 left-0 w-[400px] h-[2px] opacity-50" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute top-0 left-0 w-[2px] h-32 opacity-40" style={{ background: 'linear-gradient(to bottom, #1DA1A1, transparent)' }} />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-12 lg:px-20 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          {/* Label */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-5 h-[1px] bg-[#1DA1A1]" />
            <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">INDEX46 · Motorsports</span>
          </div>

          {/* Headline */}
          <h2
            className="text-5xl md:text-6xl font-black text-white leading-[0.92] tracking-tight uppercase mb-2"
            style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
          >
            THE WORLD<br />OF RACING.
          </h2>
          <p
            className="text-3xl md:text-4xl font-black italic uppercase mb-5 leading-tight"
            style={{ color: '#1DA1A1', textShadow: '0 0 40px rgba(29,161,161,0.4)' }}
          >
            All in one place.
          </p>

          <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-md">
            Drivers. Teams. Tracks. Events. Results.<br />
            The most comprehensive motorsports data platform, built for the culture.
          </p>

          {/* CTA */}
          <Link
            to={createPageUrl('MotorsportsHome')}
            className="inline-flex items-center gap-2.5 px-7 py-4 text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110"
            style={{ background: '#1DA1A1', color: '#050A0A' }}
          >
            <Search className="w-4 h-4" />
            Explore INDEX46
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

    </section>
  );
}