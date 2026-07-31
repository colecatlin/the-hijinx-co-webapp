import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, CalendarDays, ShieldCheck } from 'lucide-react';

const iconMap = {
  Drivers: Users,
  Events:  CalendarDays,
  Results: ShieldCheck,
};

const sparklinePaths = {
  Drivers: 'M2,22 6,18 10,20 14,14 18,16 22,10 26,12 30,6 34,8 38,4 42,7 46,3',
  Events:  'M2,21 6,17 10,19 14,13 18,15 22,9  26,11 30,7  34,9  38,5  42,8 46,3',
  Results: 'M2,22 6,20 10,18 14,15 18,17 22,12 26,9  30,11 34,7  38,5  42,8 46,2',
};

export default function StatCard({ label, count, monthlyCount, isLoading, delay = 0 }) {
  const Icon = iconMap[label] || Users;
  const path = sparklinePaths[label] || sparklinePaths.Drivers;
  const ACCENT = 'hsl(var(--motion))';

  const monthlyLabel = monthlyCount == null
    ? null
    : monthlyCount === 0
      ? null
      : `+${Number(monthlyCount).toLocaleString()} this month`;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: 'hsl(var(--surface-elevated) / 0.96)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid hsl(var(--divider))',
        boxShadow: '0 8px 28px hsl(0 0% 0% / 0.18)',
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[8px] tracking-[0.3em] uppercase mb-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        ) : (
          <>
            <div className="font-black text-xl leading-none tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>{count}</div>
            {monthlyLabel && (
              <div className="font-mono text-[8px] mt-0.5 tracking-wide" style={{ color: ACCENT }}>{monthlyLabel}</div>
            )}
          </>
        )}
      </div>

      {/* Sparkline */}
      <svg width="48" height="24" viewBox="0 0 48 28" fill="none" className="flex-shrink-0 opacity-80">
        <polyline
          points={path}
          stroke={ACCENT}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}