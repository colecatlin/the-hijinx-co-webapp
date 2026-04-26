import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/motorsports/StatCard';
import DiscoveryRows from '@/components/motorsports/DiscoveryRows';

const BG_IMAGE = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/d3e32f1e6_46HeaderPhoto.png';

const grainStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
};

function useEntityStats(entityName) {
  return useQuery({
    queryKey: ['motorsports-stats', entityName],
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

export default function MotorsportsHome() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

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
    { label: 'Drivers', data: driverStats,  isLoading: loadingDrivers  },
    { label: 'Events',  data: eventStats,   isLoading: loadingEvents   },
    { label: 'Results', data: resultStats,  isLoading: loadingResults  },
  ];

  return (
    <div className="relative bg-[#050A0A]">

      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 z-0 h-[70vh]">
        <img
          src={BG_IMAGE}
          alt="Racing"
          className="w-full h-full object-cover object-bottom"
          style={{ filter: 'saturate(1.15) contrast(1.08)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,8,8,0.88) 0%, rgba(4,8,8,0.65) 38%, rgba(4,8,8,0.15) 65%, rgba(4,8,8,0.35) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,8,8,0.4) 0%, rgba(4,8,8,0.05) 35%, rgba(4,8,8,0.35) 80%, rgba(4,8,8,0.80) 100%)' }} />
        <div className="absolute top-0 left-0 w-[500px] h-[2px] opacity-50" style={{ background: 'linear-gradient(to right, #1DA1A1, transparent)' }} />
        <div className="absolute top-0 left-0 w-[2px] h-40 opacity-40" style={{ background: 'linear-gradient(to bottom, #1DA1A1, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[1px] opacity-25" style={{ background: 'linear-gradient(to left, #1DA1A1, transparent)' }} />
        <div className="absolute inset-0 opacity-25 mix-blend-overlay" style={grainStyle} />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 h-[70vh] flex items-center px-8 md:px-12 lg:px-20 py-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-6 items-center">

          {/* LEFT: Hero text + search */}
          <div className="lg:col-span-3 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-[1px] bg-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">INDEX46 · Motorsports</span>
            </div>
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.92] tracking-tight uppercase mb-2"
              style={{ textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}
            >
              THE WORLD<br />OF RACING.
            </h1>
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
            <form onSubmit={handleSearch} className="flex items-center gap-0 max-w-md">
              <div
                className="flex items-center flex-1 px-4 py-4 rounded-l-xl"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRight: 'none',
                }}
              >
                <Search className="w-5 h-5 text-white/40 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search drivers, teams, tracks, events..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 rounded-r-xl text-sm font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110 flex-shrink-0"
                style={{ background: '#1DA1A1', color: '#050A0A' }}
              >
                Explore
              </button>
            </form>
          </div>

          {/* RIGHT: Live stat cards */}
          <div className="lg:col-span-2 flex flex-col gap-2 max-w-[220px] w-full ml-auto">
            {stats.map((s, i) => (
              <StatCard
                key={s.label}
                label={s.label}
                count={s.data?.total?.toLocaleString() ?? '—'}
                monthlyCount={s.data?.monthly ?? null}
                isLoading={s.isLoading}
                delay={i * 0.08}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ── DISCOVERY ROWS ── */}
      <DiscoveryRows />
    </div>
  );
}