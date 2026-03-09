import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flag, User, MapPin, Trophy, BookOpen, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { getHomepageRouteCards } from './homepageRouteConfig';

const ACCENT_CONFIG = {
  racecore: {
    icon: Flag,
    bg: 'bg-[#061220]',
    border: 'border-[#1E3A5F] hover:border-[#1DA1A1] hover:shadow-[0_4px_20px_rgba(29,161,161,0.15)]',
    iconBg: 'bg-[#0D2035]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-[#1DA1A1]',
    pill: 'bg-[#0D2035] text-[#1DA1A1]',
  },
  drivers: {
    icon: User,
    bg: 'bg-white',
    border: 'border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
    iconBg: 'bg-[#F0FAFA]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-gray-900',
    pill: 'bg-gray-100 text-gray-600',
  },
  tracks: {
    icon: MapPin,
    bg: 'bg-white',
    border: 'border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
    iconBg: 'bg-[#F0FAFA]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-gray-900',
    pill: 'bg-gray-100 text-gray-600',
  },
  series: {
    icon: Trophy,
    bg: 'bg-white',
    border: 'border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
    iconBg: 'bg-[#F0FAFA]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-gray-900',
    pill: 'bg-gray-100 text-gray-600',
  },
  stories: {
    icon: BookOpen,
    bg: 'bg-white',
    border: 'border-gray-200 hover:border-[#1DA1A1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
    iconBg: 'bg-[#F0FAFA]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-gray-900',
    pill: 'bg-gray-100 text-gray-600',
  },
  apparel: {
    icon: ShoppingBag,
    bg: 'bg-[#0A0A0A]',
    border: 'border-[#222] hover:border-[#1DA1A1] hover:shadow-[0_4px_20px_rgba(29,161,161,0.12)]',
    iconBg: 'bg-[#161616]',
    iconColor: 'text-[#1DA1A1]',
    ctaColor: 'text-white',
    pill: 'bg-[#1A1A1A] text-white/60',
  },
};

function LaneCard({ card, index }) {
  const cfg = ACCENT_CONFIG[card.accent] || ACCENT_CONFIG.drivers;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
    >
      <Link to={card.href} className="block h-full group">
        <div className={`h-full flex flex-col gap-4 p-6 border transition-all duration-200 hover:-translate-y-0.5 ${cfg.bg} ${cfg.border}`}>
          {/* Icon */}
          <div className={`w-10 h-10 rounded flex items-center justify-center ${cfg.iconBg}`}>
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className={`text-base font-black tracking-tight leading-tight mb-1.5 ${card.accent === 'racecore' ? 'text-white' : card.accent === 'apparel' ? 'text-white' : 'text-gray-900'}`}>
              {card.title}
            </h3>
            <p className={`text-xs leading-relaxed ${card.accent === 'racecore' ? 'text-white/55' : card.accent === 'apparel' ? 'text-white/50' : 'text-gray-500'}`}>
              {card.description}
            </p>
          </div>

          {/* CTA */}
          <div className={`flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase group-hover:gap-2.5 transition-all ${cfg.ctaColor}`}>
            {card.ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomepageChooseYourLane({ user, hasRaceCoreAccess = false }) {
  const cards = getHomepageRouteCards({ user, hasRaceCoreAccess });

  return (
    <section className="bg-[#EAF4F5] border-b border-[#C0E4E8] py-12 md:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Choose Your Lane</h2>
          <p className="text-sm text-gray-600 mt-2">
            Start where you fit, then go deeper into the HIJINX ecosystem.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <LaneCard key={card.key} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}