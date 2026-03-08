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
  },
  {
    title: 'Drivers',
    sub: 'Explore the athletes competing at every level of the sport.',
    cta: 'View Driver Profiles',
    page: 'DriverDirectory',
    Icon: Users,
  },
  {
    title: 'Tracks',
    sub: 'Every venue, every surface, every story in motorsports.',
    cta: 'Browse Tracks',
    page: 'TrackDirectory',
    Icon: MapPin,
  },
  {
    title: 'Series',
    sub: 'From local circuits to national championships.',
    cta: 'Explore Series',
    page: 'SeriesHome',
    Icon: Trophy,
  },
  {
    title: 'Stories & Media',
    sub: 'Editorial, photography, and coverage from the racing world.',
    cta: 'Read The Outlet',
    page: 'OutletHome',
    Icon: Newspaper,
  },
  {
    title: 'HIJINX Apparel',
    sub: 'Lifestyle gear for racers, builders, and culture heads.',
    cta: 'Shop Collection',
    page: 'ApparelHome',
    Icon: ShoppingBag,
  },
];

export default function HomepageChooseYourLane() {
  return (
    <section className="bg-[#F2F6FA] py-20 md:py-28 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">

        <div className="mb-12 md:mb-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-px bg-[#00FFDA]" />
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#008080] uppercase font-bold">Navigate</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-[#111] tracking-tight leading-[0.95]">
            Choose your lane.
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-md leading-relaxed">
            Every corner of the HIJINX ecosystem, one click away.
          </p>
        </div>

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
                {lane.featured ? (
                  <Link
                    to={createPageUrl(lane.page)}
                    className="group relative flex flex-col h-full min-h-[210px] p-7 bg-gradient-to-br from-[#002B2B] to-[#001A1A] border border-[#00FFDA]/35 hover:border-[#00FFDA]/75 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[#00FFDA]/3 group-hover:bg-[#00FFDA]/7 transition-all duration-300" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA]/90 via-[#00FFDA]/40 to-transparent" />
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#00FFDA]/60 to-transparent" />
                    <div className="relative z-10 flex flex-col h-full">
                      <Icon className="w-5 h-5 mb-5 text-[#00FFDA]" />
                      <h3 className="text-xl font-black tracking-tight mb-2.5 text-[#00FFDA]">{lane.title}</h3>
                      <p className="text-white/55 text-sm leading-relaxed flex-1">{lane.sub}</p>
                      <div className="flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wider uppercase text-[#00FFDA]">
                        {lane.cta}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    to={createPageUrl(lane.page)}
                    className="group relative flex flex-col h-full min-h-[210px] p-7 bg-white border border-gray-200 hover:border-[#00FFDA] hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <Icon className="w-5 h-5 mb-5 text-gray-300 group-hover:text-[#00FFDA] transition-colors" />
                      <h3 className="text-xl font-black tracking-tight mb-2.5 text-[#111] group-hover:text-[#008080] transition-colors">{lane.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed flex-1">{lane.sub}</p>
                      <div className="flex items-center gap-1.5 mt-5 text-xs font-bold tracking-wider uppercase text-gray-300 group-hover:text-[#008080] transition-all">
                        {lane.cta}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}