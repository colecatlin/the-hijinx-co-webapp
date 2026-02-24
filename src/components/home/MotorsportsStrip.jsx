import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Users, Building2, MapPin, Trophy, Calendar, BarChart2, ArrowRight } from 'lucide-react';

const links = [
  { label: 'Drivers', page: 'DriverDirectory', icon: Users },
  { label: 'Teams', page: 'TeamDirectory', icon: Building2 },
  { label: 'Tracks', page: 'TrackDirectory', icon: MapPin },
  { label: 'Series', page: 'SeriesHome', icon: Trophy },
  { label: 'Events', page: 'EventDirectory', icon: Calendar },
];

export default function MotorsportsStrip() {
  return (
    <section className="bg-[#232323] border-t border-b border-[#1A3249]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="font-mono text-xs tracking-[0.2em] text-[#00FFDA] uppercase">Motorsports</span>
            <h3 className="text-lg font-black text-[#FFF8F5] mt-1">Explore the racing ecosystem</h3>
            <p className="text-sm text-[#FFF8F5]/60 mt-1 max-w-sm">Drivers, teams, tracks, schedules, results — all in one place.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {links.map(({ label, page, icon: Icon }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                className="group flex flex-col items-center gap-2 px-3 py-4 border border-[#FFF8F5]/10 hover:border-[#00FFDA] hover:bg-[#1A3249] transition-all duration-200"
              >
                <Icon className="w-4 h-4 text-[#FFF8F5]/60 group-hover:text-[#00FFDA] transition-colors" />
                <span className="text-xs font-medium text-[#FFF8F5]/70 group-hover:text-[#FFF8F5] transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}