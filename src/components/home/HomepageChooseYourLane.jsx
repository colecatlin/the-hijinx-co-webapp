import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Gauge, Users, MapPin, Trophy, Newspaper, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const LANES = [
  {
    title: 'Race Core',
    sub: 'The operational command center for tracks, series, and events.',
    cta: 'Enter Race Core',
    page: 'Registration',
    Icon: Gauge,
    featured: true,
    accentClass: 'text-[#00FFDA]',
    borderClass: 'border-[#00FFDA]/25 hover:border-[#00FFDA]/60',
    bgClass: 'from-[#00170E] to-[#080808]',
    glowClass: 'group-hover:bg-[#00FFDA]/4',
  },
  {
    title: 'Drivers',
    sub: 'Explore the athletes competing at every level of the sport.',
    cta: 'View Driver Profiles',
    page: 'DriverDirectory',
    Icon: Users,
    borderClass: 'border-white/5 hover:border-white/15',
    bgClass: 'from-[#111111] to-[#080808]',
    glowClass: 'group-hover:bg-white/2',
  },
  {
    title: 'Tracks',
    sub: 'Every venue, every surface, every story in motorsports.',
    cta: 'Browse Tracks',
    page: 'TrackDirectory',
    Icon: MapPin,
    borderClass: 'border-white/5 hover:border-white/15',
    bgClass: 'from-[#111111] to-[#080808]',
    glowClass: 'group-hover:bg-white/2',
  },
  {
    title: 'Series',
    sub: 'From local circuits to national championships.',
    cta: 'Explore Series',
    page: 'SeriesHome',
    Icon: Trophy,
    borderClass: 'border-white/5 hover:border-white/15',
    bgClass: 'from-[#111111] to-[#080808]',
    glowClass: 'group-hover:bg-white/2',
  },
  {
    title: 'Stories & Media',
    sub: 'Editorial, photography, and coverage from the racing world.',
    cta: 'Read The Outlet',
    page: 'OutletHome',
    Icon: Newspaper,
    borderClass: 'border-white/5 hover:border-white/15',
    bgClass: 'from-[#111111] to-[#080808]',
    glowClass: 'group-hover:bg-white/2',
  },
  {
    title: 'HIJINX Apparel',
    sub: 'Lifestyle gear for racers, builders, and culture heads.',
    cta: 'Shop Collection',
    page: 'ApparelHome',
    Icon: ShoppingBag,
    borderClass: 'border-white/5 hover:border-white/15',
    bgClass: 'from-[#111111] to-[#080808]',
    glowClass: 'group-hover:bg-white/2',
  },
];

export default function HomepageChooseYourLane() {
  return (
    <section className="bg-[#080808] py-20 md:py-28 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="mb-12 md:mb-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase">Navigate</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[0.95]">
            Choose your lane.
          </h2>
          <p className="text-white/35 text-base mt-4 max-w-md leading-relaxed">
            Every corner of the HIJINX ecosystem, one click away.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LANES.map((lane, i) => {
            const Icon = lane.Icon;
            return (
              <motion.div
                key={lane.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={createPageUrl(lane.page)}
                  className={`group relative flex flex-col h-full min-h-[210px] p-7 bg-gradient-to-br ${lane.bgClass} border ${lane.borderClass} transition-all duration-300 overflow-hidden`}
                >
                  {/* Hover overlay */}
                  <div className={`absolute inset-0 transition-all duration-300 ${lane.glowClass}`} />

                  {/* Top accent for featured */}
                  {lane.featured && (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#00FFDA]/60 via-[#00FFDA]/20 to-transparent" />
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00FFDA]/50 to-transparent" />
                    </>
                  )}

                  <div className="relative z-10 flex flex-col h-full">
                    <Icon className={`w-5 h-5 mb-5 transition-colors ${lane.featured ? 'text-[#00FFDA]' : 'text-white/25 group-hover:text-white/50'}`} />
                    <h3 className={`text-xl font-black tracking-tight mb-2.5 ${lane.featured ? 'text-[#00FFDA]' : 'text-white'}`}>
                      {lane.title}
                    </h3>
                    <p className="text-white/35 text-sm leading-relaxed flex-1">
                      {lane.sub}
                    </p>
                    <div className={`flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wider uppercase transition-all ${lane.featured ? 'text-[#00FFDA]' : 'text-white/25 group-hover:text-white/55'}`}>
                      {lane.cta}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}