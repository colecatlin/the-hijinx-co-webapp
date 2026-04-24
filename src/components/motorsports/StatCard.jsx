import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, Flag, MapPin, CalendarDays, Trophy } from 'lucide-react';

const iconMap = {
  Drivers: Users,
  Teams: Flag,
  Tracks: MapPin,
  Events: CalendarDays,
  Results: Trophy,
};

export default function StatCard({ label, count, isLoading, delay = 0 }) {
  const Icon = iconMap[label] || Users;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-4 px-5 py-4 rounded-xl"
      style={{
        background: 'rgba(10,20,20,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
        style={{ background: 'rgba(29,161,161,0.15)', border: '1px solid rgba(29,161,161,0.3)' }}
      >
        <Icon className="w-5 h-5" style={{ color: '#1DA1A1' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-1">{label}</div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : (
          <div className="text-white font-black text-2xl leading-none tracking-tight">
            {count}
          </div>
        )}
      </div>

      {/* Teal sparkline decoration */}
      <svg width="60" height="28" viewBox="0 0 60 28" fill="none" className="flex-shrink-0 opacity-60">
        <polyline
          points="0,22 10,16 20,18 30,8 40,12 50,4 60,6"
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