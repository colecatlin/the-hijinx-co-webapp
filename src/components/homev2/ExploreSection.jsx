import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const DIRECTORIES = [
  { label: 'Drivers',  page: 'DriverDirectory',  meta: 'Profiles & Stats' },
  { label: 'Teams',    page: 'TeamDirectory',     meta: 'Rosters & Programs' },
  { label: 'Tracks',   page: 'TrackDirectory',    meta: 'Venues & Layouts' },
  { label: 'Series',   page: 'SeriesHome',        meta: 'Championships' },
  { label: 'Events',   page: 'EventDirectory',    meta: 'Schedule & Results' },
];

export default function ExploreSection() {
  return (
    <section style={{ background: '#232323', borderTop: '1px solid rgba(0,255,218,0.15)', borderBottom: '1px solid rgba(255,248,245,0.06)' }} className="py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px" style={{ background: '#00FFDA' }} />
              <span className="font-mono text-[10px] tracking-[0.4em] uppercase font-bold" style={{ color: '#00FFDA' }}>Explore</span>
            </div>
            <h2 className="font-black text-3xl leading-none" style={{ color: '#FFF8F5' }}>
              Enter the Ecosystem
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DIRECTORIES.map((dir, i) => (
            <Link
              key={dir.page}
              to={createPageUrl(dir.page)}
              className="group flex flex-col justify-between p-5 transition-colors"
              style={{ background: '#1A3249', border: '1px solid rgba(255,248,245,0.06)', minHeight: 120 }}
            >
              <div className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,248,245,0.3)' }}>
                0{i + 1}
              </div>
              <div>
                <div className="font-black text-xl leading-tight mb-1 transition-colors group-hover:text-[#00FFDA]" style={{ color: '#FFF8F5' }}>
                  {dir.label}
                </div>
                <div className="text-[10px]" style={{ color: 'rgba(255,248,245,0.35)' }}>
                  {dir.meta}
                </div>
              </div>
              {/* Bottom accent */}
              <div className="mt-3 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-left" style={{ background: '#00FFDA' }} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}