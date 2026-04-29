import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, MapPin, Calendar, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Static fallback cards if no live data is available
const FALLBACK_CARDS = [
  {
    icon: Users,
    label: 'Driver Directory',
    description: 'Every driver, every discipline — from novice to professional.',
    url: '/DriverDirectory',
    accent: '#1DA1A1',
  },
  {
    icon: MapPin,
    label: 'Track Database',
    description: 'Tracks across the country, mapped and profiled.',
    url: '/TrackDirectory',
    accent: '#1DA1A1',
  },
  {
    icon: Calendar,
    label: 'Events & Results',
    description: 'Upcoming races, live events, and published results.',
    url: '/EventDirectory',
    accent: '#1DA1A1',
  },
  {
    icon: BarChart2,
    label: 'Series Discovery',
    description: 'Championships and series spanning every level of competition.',
    url: '/SeriesHome',
    accent: '#1DA1A1',
  },
];

function PreviewCard({ icon, label, description, url, accent, delay = 0 }) {
  const CardIcon = icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <Link
        to={url}
        className="group flex flex-col justify-between h-full min-h-[160px] p-5 relative overflow-hidden block transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
          e.currentTarget.style.boxShadow = '0 0 24px rgba(0,0,0,0.35)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
        />

        <div>
          <div
            className="w-8 h-8 flex items-center justify-center mb-4"
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}25`,
              borderRadius: 8,
            }}
          >
            <CardIcon className="w-4 h-4" style={{ color: accent }} />
          </div>
          <p className="text-white font-bold text-sm mb-1.5">{label}</p>
          <p className="text-white/40 text-xs leading-relaxed">{description}</p>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/25 group-hover:text-[#1DA1A1] transition-colors">
          Explore <ArrowRight className="w-3 h-3" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function Index46Preview() {
  // Light fetch — just a count signal, not full data
  const { data: drivers = [] } = useQuery({
    queryKey: ['index46-preview-drivers'],
    queryFn: () => base44.entities.Driver.filter({ visibility_status: 'live' }, '-created_date', 4),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['index46-preview-tracks'],
    queryFn: () => base44.entities.Track.filter({ visibility_status: 'live' }, '-created_date', 4),
    staleTime: 5 * 60 * 1000,
  });

  // Build preview cards from real data if available, fallback otherwise
  const previewCards = FALLBACK_CARDS;

  return (
    <section className="bg-[#050A0A] py-16 md:py-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-20">

        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-[1px] bg-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.45em] text-[#1DA1A1] uppercase">
                INDEX46 · Motorsports
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              The World of Racing.
            </h2>
            <p className="text-white/40 text-sm mt-3 max-w-md leading-relaxed">
              A living motorsports layer built around drivers, teams, tracks, events, and culture.
            </p>
          </div>

          <Link
            to="/MotorsportsHome"
            className="flex-shrink-0 inline-flex items-center gap-2.5 px-6 py-3 text-xs font-black tracking-widest uppercase transition-all duration-200 hover:brightness-110 whitespace-nowrap"
            style={{ background: '#1DA1A1', color: '#050A0A', borderRadius: 2 }}
          >
            Go to INDEX46
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Preview grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {previewCards.map((card, i) => (
            <PreviewCard key={card.label} {...card} delay={i * 0.07} />
          ))}
        </div>

        {/* Stats signal strip */}
        {(drivers.length > 0 || tracks.length > 0) && (
          <div
            className="mt-6 px-6 py-4 flex flex-wrap gap-8"
            style={{
              background: 'rgba(29,161,161,0.04)',
              border: '1px solid rgba(29,161,161,0.12)',
              borderRadius: 10,
            }}
          >
            {drivers.length > 0 && (
              <div>
                <div className="text-white font-black text-xl leading-none">{drivers.length}+</div>
                <div className="font-mono text-[8px] tracking-[0.3em] text-white/35 uppercase mt-0.5">Drivers Live</div>
              </div>
            )}
            {tracks.length > 0 && (
              <div>
                <div className="text-white font-black text-xl leading-none">{tracks.length}+</div>
                <div className="font-mono text-[8px] tracking-[0.3em] text-white/35 uppercase mt-0.5">Tracks Mapped</div>
              </div>
            )}
            <div className="ml-auto flex items-center">
              <Link
                to="/MotorsportsHome"
                className="font-mono text-[9px] tracking-[0.35em] text-[#1DA1A1] uppercase hover:text-white transition-colors flex items-center gap-1.5"
              >
                Explore All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}