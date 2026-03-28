import React from 'react';
import { Link } from 'react-router-dom';
import { getDriverProfileUrl } from '@/components/utils/driverUrl';
import { ArrowRight, User, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function HomepageDriverSpotlight({ driver }) {
  if (!driver) return null;

  const profileUrl = getDriverProfileUrl(driver);

  return (
    <Link to={profileUrl} className="block">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="relative overflow-hidden bg-[#080C14] border border-[#00FFDA]/25 hover:border-[#00FFDA]/70 hover:shadow-[0_8px_40px_rgba(0,255,218,0.1)] transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00FFDA] via-[#00FFDA]/40 to-transparent" />

      {/* Background image with overlay */}
      {driver.image ? (
        <>
          <img
            src={driver.image}
            alt={driver.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500 object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080C14]/95 via-[#080C14]/75 to-[#080C14]/40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1520] to-[#080C14]" />
      )}

      {/* Ambient glow */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 w-32 h-32 bg-[#00FFDA]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative p-7 md:p-8 flex flex-col justify-between min-h-[260px]">
        {/* Header tag */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FFDA] animate-pulse" />
          <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase font-bold">Driver Spotlight</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Avatar placeholder if no image */}
          {!driver.image && (
            <div className="w-12 h-12 rounded-full bg-[#00FFDA]/10 border border-[#00FFDA]/20 flex items-center justify-center mb-4">
              <User className="w-5 h-5 text-[#00FFDA]/60" />
            </div>
          )}

          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight group-hover:text-[#00FFDA] transition-colors duration-300">
            {driver.name}
          </h3>

          {driver.subtitle && (
            <p className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase mt-2">
              {driver.subtitle}
            </p>
          )}

          {driver.latest_activity_title && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-white/5 border border-white/10">
              <Zap className="w-3.5 h-3.5 text-[#00FFDA] mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/70 text-xs leading-relaxed line-clamp-1">{driver.latest_activity_title}</p>
                {driver.latest_activity_date && !isNaN(new Date(driver.latest_activity_date)) && (
                  <p className="font-mono text-[9px] text-white/30 mt-0.5">
                    {formatDistanceToNow(new Date(driver.latest_activity_date), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="inline-flex items-center gap-2 mt-6 text-xs font-bold tracking-wider uppercase text-[#00FFDA] group-hover:gap-3 transition-all">
          View Driver <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
    </Link>
  );
}