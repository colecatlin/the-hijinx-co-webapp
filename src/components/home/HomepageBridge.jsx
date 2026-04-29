import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flag, BookOpen, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const PILLARS = [
  {
    label: 'INDEX46',
    icon: Flag,
    accentColor: '#1DA1A1',
    description: 'The racing world, mapped through drivers, teams, tracks, events, and data.',
    cta: 'Explore INDEX46',
    url: '/MotorsportsHome',
  },
  {
    label: 'The Outlet',
    icon: BookOpen,
    accentColor: '#00FFDA',
    description: 'Stories, culture, and perspective from the edges of motorsports and beyond.',
    cta: 'Read The Outlet',
    url: '/OutletHome',
  },
  {
    label: 'HIJINX CO.',
    icon: ShoppingBag,
    accentColor: '#E5FF00',
    description: 'Apparel and identity for people moving with purpose.',
    cta: 'Shop Apparel',
    url: '/ApparelHome',
  },
];

export default function HomepageBridge() {
  return (
    <section
      id="homepage-bridge"
      className="bg-[#050A0A] py-16 md:py-24 border-t border-white/5"
    >
      {/* Teal accent line top */}
      <div
        className="absolute left-0 right-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(29,161,161,0.35), transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-[1px] bg-[#1DA1A1]" />
          <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">
            HIJINX
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-10">
          One world.{' '}
          <span className="text-white/30">Three ways in.</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Link
                  to={pillar.url}
                  className="group flex flex-col justify-between h-full min-h-[220px] p-6 md:p-8 relative overflow-hidden block transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: 12,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    e.currentTarget.style.boxShadow = `0 0 32px rgba(0,0,0,0.4), 0 0 16px ${pillar.accentColor}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Accent top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(90deg, ${pillar.accentColor}, transparent)` }}
                  />

                  <div>
                    {/* Icon + label */}
                    <div className="flex items-center gap-2.5 mb-5">
                      <div
                        className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${pillar.accentColor}15`,
                          border: `1px solid ${pillar.accentColor}30`,
                          borderRadius: 6,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: pillar.accentColor }} />
                      </div>
                      <span
                        className="font-mono text-[10px] font-bold tracking-[0.4em] uppercase"
                        style={{ color: pillar.accentColor }}
                      >
                        {pillar.label}
                      </span>
                    </div>

                    <p className="text-white/50 text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>

                  <div
                    className="mt-6 flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-200 group-hover:gap-3"
                    style={{ color: pillar.accentColor }}
                  >
                    {pillar.cta}
                    <ArrowRight className="w-3 h-3" />
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