import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Trophy, Calendar, Flag, Users, Building2, MapPin } from 'lucide-react';

const sections = [
  { name: 'Points Standings', desc: 'Current championship standings by series and class', icon: Trophy, page: 'StandingsHome' },
  { name: 'Schedule', desc: 'Upcoming events and race calendar', icon: Calendar, page: 'ScheduleHome' },
  { name: 'Results', desc: 'Race results and event recaps', icon: Flag, page: 'ResultsHome' },
  { name: 'Driver Directory', desc: 'Search and browse driver profiles', icon: Users, page: 'DriverDirectory' },
  { name: 'Team Directory', desc: 'Teams competing across all series', icon: Building2, page: 'TeamDirectory' },
  { name: 'Track Directory', desc: 'Venues and circuits', icon: MapPin, page: 'TrackDirectory' },
];

export default function MotorsportsHome() {
  return (
    <PageShell>
      {/* Hero */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx Motorsports</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl leading-[0.95]">
            Competition. Data. Community.
          </h1>
          <p className="text-gray-400 mt-4 max-w-lg">
            Your hub for standings, schedules, results, and everything competition.
          </p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                to={createPageUrl(s.page)}
                className="group flex flex-col justify-between p-8 h-48 border border-gray-200 hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all duration-300"
              >
                <s.icon className="w-5 h-5 text-gray-400 group-hover:text-[#E5FF00] transition-colors" />
                <div>
                  <h3 className="font-bold tracking-tight">{s.name}</h3>
                  <p className="text-xs text-gray-400 group-hover:text-gray-500 mt-1">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}