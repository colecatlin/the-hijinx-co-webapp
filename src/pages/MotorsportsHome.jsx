import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowRight, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/motorsports/StatCard';
import PlatformShowcase from '@/components/motorsports/PlatformShowcase';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d3e32f1e6_46HeaderPhoto.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

function useEntityStats(entityName) {
  return useQuery({
    queryKey: ['motorsports-stats', entityName],
    queryFn: async () => {
      // Only fetch the most recent 500 sorted by created_date — fast and sufficient for stats
      const all = await base44.entities[entityName].list('-created_date', 500);
      const total = Array.isArray(all) ? all.length : 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthly = Array.isArray(all)
        ? all.filter(r => r.created_date && new Date(r.created_date) >= startOfMonth).length
        : 0;

      return { total, monthly };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

const ACCENT = 'hsl(var(--motion))';

export default function MotorsportsHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: driverStats,  isLoading: loadingDrivers  } = useEntityStats('Driver');
  const { data: eventStats,   isLoading: loadingEvents   } = useEntityStats('Event');
  const { data: resultStats,  isLoading: loadingResults  } = useEntityStats('Results');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/DriverDirectory?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/DriverDirectory');
    }
  };

  const stats = [
    { label: 'Drivers', data: driverStats,  isLoading: loadingDrivers, hideMonthly: true },
    { label: 'Events',  data: eventStats,   isLoading: loadingEvents   },
    { label: 'Results', data: resultStats,  isLoading: loadingResults  },
  ];

  return (
    <div className="relative" style={{ background: 'hsl(var(--canvas))' }}>

      {/* ── FULL PAGE TEXTURE OVERLAY (faint) ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ backgroundImage: `url('https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png')`, backgroundRepeat: 'repeat', backgroundSize: '1024px auto', opacity: 0.05 }} />

      {/* ── BACKGROUND IMAGE HERO ── */}
      <div className="absolute inset-0 z-[2] h-[70vh]">
        <img
          src={BG_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-top"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.86) 0%, rgba(4,8,8,0.6) 38%, rgba(4,8,8,0.10) 65%, rgba(4,8,8,0.32) 100%)' }} />
        <div className="absolute top-0 left-0 w-[500px] h-[2px] opacity-50" style={{ background: `linear-gradient(to right, ${ACCENT}, transparent)` }} />
        <div className="absolute top-0 left-0 w-[2px] h-40 opacity-40" style={{ background: `linear-gradient(to bottom, ${ACCENT}, transparent)` }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[1px] opacity-25" style={{ background: `linear-gradient(to left, ${ACCENT}, transparent)` }} />
        <div className="absolute inset-0 opacity-25 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-[3] min-h-[70vh] flex items-center px-5 sm:px-8 md:px-12 lg:px-20 py-12 md:py-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-6 items-center">

          {/* LEFT: Hero text + search */}
          <div className="lg:col-span-3 max-w-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
              <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>INDEX46 · Motorsports</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.92] tracking-tight uppercase mb-2"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
            >
              THE WORLD<br />OF RACING.
            </h1>
            <p
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic uppercase mb-3 leading-tight"
              style={{ color: ACCENT, textShadow: '0 0 40px rgba(29,161,161,0.4)' }}
            >
              All in one place.
            </p>
            <p className="text-white/70 text-xs sm:text-sm leading-relaxed mb-5 max-w-md">
              Drivers. Teams. Tracks. Events. Results.<br />
              The most comprehensive motorsports data platform, built for the culture.
            </p>
            <form onSubmit={handleSearch} className="flex items-center gap-0 w-full max-w-md">
              <div
                className="flex items-center flex-1 px-3 py-3 rounded-l-xl min-w-0"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRight: 'none',
                }}
              >
                <Search className="w-4 h-4 text-white/50 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search drivers, teams..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none min-w-0"
                />
              </div>
              <button
                type="submit"
                className="px-4 sm:px-6 py-3 rounded-r-xl text-xs sm:text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110 flex-shrink-0 whitespace-nowrap"
                style={{ background: ACCENT, color: '#fff' }}
              >
                Explore
              </button>
            </form>

            {/* Early Access CTA */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/join"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200 hover:brightness-110"
                style={{ background: '#fff', color: 'hsl(var(--foreground))' }}
              >
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                Claim Your Profile
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {isAuthenticated ? null : (
                <button
                  onClick={() => base44.auth.redirectToLogin('/join/sign-up')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black tracking-[0.18em] uppercase transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                >
                  Sign Up
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Drivers · Teams · Tracks · Series
              </span>
            </div>
          </div>

          {/* RIGHT: Live stat cards — light surface cards over the dark hero */}
          <div className="lg:col-span-2 hidden sm:flex sm:flex-row lg:flex-col gap-2 lg:max-w-[220px] w-full lg:ml-auto">
            {stats.map((s, i) => (
              <StatCard
                key={s.label}
                label={s.label}
                count={s.data?.total?.toLocaleString() ?? '—'}
                monthlyCount={s.hideMonthly ? null : (s.data?.monthly ?? null)}
                isLoading={s.isLoading}
                delay={i * 0.08}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ── PLATFORM SHOWCASE (pre-launch landing) ── */}
      <PlatformShowcase />
    </div>
  );
}