import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { ArrowRight, Users, CalendarDays, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d3e32f1e6_46HeaderPhoto.png';
const BG_TEXTURE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

const sparklinePaths = {
  Drivers: 'M2,22 6,18 10,20 14,14 18,16 22,10 26,12 30,6 34,8 38,4 42,7 46,3',
  Events:  'M2,21 6,17 10,19 14,13 18,15 22,9  26,11 30,7  34,9  38,5  42,8  46,3',
  Results: 'M2,22 6,20 10,18 14,15 18,17 22,12 26,9  30,11 34,7  38,5  42,8  46,2',
};

const iconMap = { Drivers: Users, Events: CalendarDays, Results: ShieldCheck };

function useEntityStats(entityName) {
  return useQuery({
    queryKey: ['racecore-section-stats', entityName],
    queryFn: async () => {
      const all = await base44.entities[entityName].list();
      const total = Array.isArray(all) ? all.length : 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthly = Array.isArray(all)
        ? all.filter(r => r.created_date && new Date(r.created_date) >= startOfMonth).length
        : 0;
      return { total, monthly };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function StatCard({ label, data, isLoading, delay = 0, hideMonthly = false }) {
  const Icon = iconMap[label] || Users;
  const path = sparklinePaths[label];
  const count = data?.total?.toLocaleString() ?? '—';
  const monthly = (!hideMonthly && data?.monthly > 0) ? `+${data.monthly} this month` : null;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: '0 0 14px rgba(255,255,255,0.08), 0 2px 20px rgba(0,0,0,0.3)',
      }}
    >
      <Icon className="w-5 h-5 text-white/40 flex-shrink-0" strokeWidth={1.25} />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/40 uppercase mb-0.5">{label}</div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
        ) : (
          <>
            <div className="text-white font-black text-xl leading-none tracking-tight">{count}</div>
            {monthly && <div className="text-[#1DA1A1] font-mono text-[8px] mt-0.5 tracking-wide">{monthly}</div>}
          </>
        )}
      </div>
      <svg width="48" height="24" viewBox="0 0 48 28" fill="none" className="flex-shrink-0 opacity-70">
        <polyline points={path} stroke="#1DA1A1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

export default function RaceCoreSection() {
  const navigate = useNavigate();

  const { data: driverStats, isLoading: loadingDrivers } = useEntityStats('Driver');
  const { data: eventStats,  isLoading: loadingEvents  } = useEntityStats('Event');
  const { data: resultStats, isLoading: loadingResults } = useEntityStats('Results');

  const stats = [
    { label: 'Drivers', data: driverStats, isLoading: loadingDrivers, hideMonthly: true },
    { label: 'Events',  data: eventStats,  isLoading: loadingEvents  },
    { label: 'Results', data: resultStats, isLoading: loadingResults },
  ];

  return (
    <section className="relative" style={{ minHeight: '600px', background: '#050A0A' }}>

      {/* Texture overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `url('${BG_TEXTURE}')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '1024px auto',
          opacity: 0.35,
        }}
      />

      {/* Background photo + gradients */}
      <div className="absolute inset-0 z-[2]">
        <img
          src={BG_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-top"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.92) 0%, rgba(4,8,8,0.68) 38%, rgba(4,8,8,0.18) 65%, rgba(4,8,8,0.40) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.45) 0%, rgba(4,8,8,0.05) 35%, rgba(4,8,8,0.40) 80%, rgba(4,8,8,0.85) 100%)' }} />
        <div className="absolute top-0 left-0 w-[500px] h-[2px] opacity-50" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute top-0 left-0 w-[2px] h-40 opacity-40" style={{ background: 'linear-gradient(to bottom, #1DA1A1, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[1px] opacity-25" style={{ background: 'linear-gradient(to left, #1DA1A1, transparent)' }} />
        <div className="absolute inset-0 opacity-25 mix-blend-overlay" style={grainStyle} />
        {/* Bottom fade — blends into RaceCoreBridge */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(5,10,10,0.7) 100%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-[3] flex items-center px-8 md:px-12 lg:px-20 py-16 md:py-22">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-6 items-center">

          {/* LEFT: Hero text + CTAs */}
          <motion.div
            className="lg:col-span-3 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-[1px] bg-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">INDEX46 · Motorsports</span>
            </div>

            <h2
              className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.92] tracking-tight uppercase mb-2"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
            >
              THE WORLD<br />OF RACING.
            </h2>
            <p
              className="text-3xl md:text-4xl lg:text-5xl font-black italic uppercase mb-4 leading-tight"
              style={{ color: '#1DA1A1', textShadow: '0 0 40px rgba(29,161,161,0.4)' }}
            >
              All in one place.
            </p>

            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-7 max-w-md">
              Drivers. Teams. Tracks. Events. Results.<br />
              The most comprehensive motorsports data platform, built for the culture.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(createPageUrl('MotorsportsHome'))}
                className="inline-flex items-center gap-2.5 px-7 py-4 text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110"
                style={{ background: '#1DA1A1', color: '#050A0A' }}
              >
                Explore INDEX46
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </motion.div>

          {/* RIGHT: Live stat cards */}
          <div className="lg:col-span-2 flex flex-col gap-2 max-w-[220px] w-full ml-auto">
            {stats.map((s, i) => (
              <StatCard key={s.label} label={s.label} data={s.data} isLoading={s.isLoading} delay={i * 0.08} hideMonthly={s.hideMonthly} />
            ))}
          </div>

        </div>
      </div>

    </section>
  );
}