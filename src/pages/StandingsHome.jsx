import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

function TopThreeDriver({ driver, position }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      {/* Position + Avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
          {driver.image
            ? <img src={driver.image} alt={driver.name} className="w-full h-full object-cover object-top" />
            : <span className="text-white/30 text-xs font-black">{driver.name[0]}</span>
          }
        </div>
      </div>
      
      {/* Driver info */}
      <div className="min-w-0 flex-1">
        <div className="text-white font-bold text-xs">
          <span className="text-white/40">{position}</span> {driver.name}
        </div>
        <div className="text-white/40 text-[9px]">{driver.points} pts</div>
      </div>
    </div>
  );
}

function SeriesLeaderboard({ series }) {
  const currentYear = new Date().getFullYear();
  const { data: standings = [] } = useQuery({
    queryKey: ['driverStandings', series.id, currentYear],
    queryFn: () => base44.entities.DriverStanding.filter(
      { series_id: series.id, season_year: currentYear },
      'position',
      5
    ),
    staleTime: 5 * 60 * 1000,
  });

  const topDrivers = standings.map(s => ({ name: s.driver_name, points: s.points, image: null }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
    >
      {/* Series Info */}
      <div
        className="p-4 rounded-lg flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        {series.logo_url && (
          <img src={series.logo_url} alt={series.name} className="w-12 h-12 object-contain" />
        )}
        <div>
          <h3 className="text-white font-bold text-sm">{series.name}</h3>
          {series.description && (
            <p className="text-white/40 text-xs mt-2 line-clamp-3">{series.description}</p>
          )}
        </div>
        <Link
          to={`/series/${series.slug || series.id}`}
          className="text-[#1DA1A1] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mt-auto"
        >
          View Series <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Top 3 Drivers */}
      <div className="lg:col-span-2 p-4 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        <h4 className="text-white/60 font-black text-[10px] uppercase tracking-wider mb-3">Top Drivers</h4>
        <div>
          {topDrivers.map((driver, idx) => (
            <TopThreeDriver key={idx} driver={driver} position={idx + 1} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function StandingsHome() {
  const { data: series = [], isLoading } = useQuery({
    queryKey: ['standings-series'],
    queryFn: () => base44.entities.Series.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.filter(s => s.visibility_status === 'live').slice(0, 5),
  });

  return (
    <div className="min-h-screen bg-[#080C0C]">
      {/* Header */}
      <div className="px-8 md:px-12 lg:px-20 py-8 border-b border-white/10">
        <h1 className="text-white font-black text-4xl uppercase">Championship Standings</h1>
        <p className="text-white/50 text-sm mt-2">View top drivers across all series and classes</p>
      </div>

      {/* Content */}
      <div className="px-8 md:px-12 lg:px-20 py-8">
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg animate-pulse bg-white/5" />
            ))}
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm">No series available</p>
          </div>
        ) : (
          <div>
            {series.map(s => (
              <SeriesLeaderboard key={s.id} series={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}