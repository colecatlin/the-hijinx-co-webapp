import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, Flag, MapPin, CalendarDays, ShieldCheck } from 'lucide-react';

const iconMap = {
  Drivers: Users,
  Teams:   Flag,
  Tracks:  MapPin,
  Events:  CalendarDays,
  Results: ShieldCheck,
};

const sparklinePaths = {
  Drivers: 'M2,22 6,18 10,20 14,14 18,16 22,10 26,12 30,6 34,8 38,4 42,7 46,3',
  Teams:   'M2,20 6,22 10,17 14,19 18,13 22,15 26,10 30,12 34,7  38,9  42,5  46,7',
  Tracks:  'M2,23 6,19 10,21 14,16 18,18 22,12 26,14 30,9  34,11 38,6  42,9  46,4',
  Events:  'M2,21 6,17 10,19 14,13 18,15 22,9  26,11 30,7  34,9  38,5  42,8  46,3',
  Results: 'M2,22 6,20 10,18 14,15 18,17 22,12 26,9  30,11 34,7  38,5  42,8  46,2',
};

export default function StatCard({ label, count, monthlyCount, isLoading, delay = 0 }) {
  const Icon = iconMap[label] || Users;
  const path = sparklinePaths[label] || sparklinePaths.Drivers;

  const monthlyLabel = monthlyCount === null
    ? null
    : monthlyCount === 0
      ? 'No new this month'
      : `+${monthlyCount.toLocaleString()} this month`;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mr-2.5">
        <Icon className="w-5 h-5 text-white/35" strokeWidth={1.25} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/40 uppercase mb-0.5">{label}</div>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
        ) : (
          <div className="text-white font-bold text-base leading-none tracking-tight">{count}</div>
        )}
        {!isLoading && monthlyLabel && (
          <div className="text-[9px] mt-0.5" style={{ color: monthlyCount === 0 ? 'rgba(255,255,255,0.25)' : '#1DA1A1' }}>
            {monthlyLabel}
          </div>
        )}
      </div>

      {/* Sparkline */}
      <svg width="44" height="22" viewBox="0 0 48 28" fill="none" className="flex-shrink-0 ml-1.5 opacity-60">
        <polyline
          points={path}
          stroke="#1DA1A1"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}