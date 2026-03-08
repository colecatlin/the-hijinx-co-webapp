import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const TICKER_ITEMS = [
  { label: 'DRIVER PROFILES',  page: 'DriverDirectory' },
  { label: 'TRACK DATABASE',   page: 'TrackDirectory' },
  { label: 'RESULTS',          page: 'EventDirectory' },
  { label: 'STORIES',          page: 'OutletHome' },
  { label: 'APPAREL',          page: 'ApparelHome' },
  { label: 'MEDIA PORTAL',     page: 'MediaPortal' },
  { label: 'SERIES',           page: 'SeriesHome' },
  { label: 'RACE CORE',        page: 'Registration' },
];

export default function HomepageTicker() {
  const repeated = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative bg-[#080C14] border-y border-[#00FFDA]/20 overflow-hidden py-3 select-none">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#080C14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#080C14] to-transparent z-10 pointer-events-none" />

      {/* Live indicator — red for urgency */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
        <span className="font-mono text-[9px] tracking-[0.3em] text-[#EF4444] uppercase font-bold">Live</span>
      </div>

      <div
        className="flex"
        style={{ animation: 'hijinx-ticker 28s linear infinite' }}
      >
        {repeated.map((item, i) => (
          <Link
            key={i}
            to={createPageUrl(item.page)}
            className="flex-shrink-0 flex items-center gap-4 px-7 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFDA]/50 flex-shrink-0 group-hover:bg-[#00FFDA] transition-colors" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-white/55 group-hover:text-[#00FFDA] transition-colors whitespace-nowrap uppercase font-bold">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes hijinx-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}