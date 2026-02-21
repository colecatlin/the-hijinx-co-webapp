import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy, Calendar, Flag, Users, Building2, MapPin,
  ChevronRight, TrendingUp, Clock, Activity, Star,
  Zap, ArrowRight
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const navCards = [
  { name: 'Standings', icon: Trophy, page: 'StandingsHome', color: 'from-yellow-500 to-amber-600', accent: '#F59E0B' },
  { name: 'Schedule', icon: Calendar, page: 'ScheduleHome', color: 'from-blue-500 to-indigo-600', accent: '#3B82F6' },
  { name: 'Results', icon: Flag, page: 'ResultsHome', color: 'from-green-500 to-emerald-600', accent: '#10B981' },
  { name: 'Drivers', icon: Users, page: 'DriverDirectory', color: 'from-purple-500 to-violet-600', accent: '#8B5CF6' },
  { name: 'Teams', icon: Building2, page: 'TeamDirectory', color: 'from-rose-500 to-pink-600', accent: '#F43F5E' },
  { name: 'Tracks', icon: MapPin, page: 'TrackDirectory', color: 'from-teal-500 to-cyan-600', accent: '#14B8A6' },
  { name: 'Series', icon: Zap, page: 'SeriesHome', color: 'from-orange-500 to-red-600', accent: '#F97316' },
];

export default function MotorsportsHome() {
  const today = new Date().toISOString().split('T')[0];

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['motorsports-upcoming-events'],
    queryFn: () => base44.entities.Event.filter({ status: 'upcoming' }, 'event_date', 8),
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['motorsports-driver-count'],
    queryFn: () => base44.entities.Driver.list('created_date', 200),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['motorsports-team-count'],
    queryFn: () => base44.entities.Team.list('created_date', 200),
  });

  const { data: allTracks = [] } = useQuery({
    queryKey: ['motorsports-track-count'],
    queryFn: () => base44.entities.Track.list('created_date', 200),
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['motorsports-series'],
    queryFn: () => base44.entities.Series.filter({ status: 'Active' }, 'popularity_rank', 6),
  });

  const { data: recentResults = [] } = useQuery({
    queryKey: ['motorsports-recent-results'],
    queryFn: () => base44.entities.Event.filter({ status: 'completed' }, '-event_date', 5),
  });

  const stats = [
    { label: 'Drivers', value: allDrivers.length, icon: Users, accent: '#8B5CF6' },
    { label: 'Teams', value: allTeams.length, icon: Building2, accent: '#F43F5E' },
    { label: 'Tracks', value: allTracks.length, icon: MapPin, accent: '#14B8A6' },
    { label: 'Active Series', value: allSeries.length, icon: Zap, accent: '#F97316' },
  ];

  const nextEvent = upcomingEvents[0];
  const daysUntil = nextEvent ? differenceInDays(parseISO(nextEvent.event_date), parseISO(new Date().toISOString().split('T')[0])) : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1a1a2e_0%,_#0A0A0A_60%)]" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-[#E5FF00]/5 blur-[120px] rounded-full" />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="font-mono text-xs tracking-[0.3em] text-[#E5FF00] uppercase">Hijinx Motorsports</span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mt-3 leading-[0.92]">
              The Racing<br />
              <span className="text-[#E5FF00]">Dashboard.</span>
            </h1>
            <p className="text-gray-400 mt-4 max-w-md text-sm">
              Live standings, upcoming races, driver profiles, and everything competition — all in one place.
            </p>
          </motion.div>
        </div>
        <div className="h-px bg-gradient-to-r from-[#E5FF00]/60 via-white/10 to-transparent" />
      </div>

      {/* Stats Bar */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-4 border border-white/5"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.accent + '22' }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
                </div>
                <div>
                  <div className="text-2xl font-black">{stat.value || '—'}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* Nav Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono tracking-[0.2em] text-gray-500 uppercase">Explore</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {navCards.map((card, i) => (
              <motion.div
                key={card.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={createPageUrl(card.page)}
                  className="group flex flex-col items-center justify-center gap-2 p-4 h-24 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{card.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events - takes 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-[#E5FF00] rounded-full" />
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-300">Upcoming Races</h2>
              </div>
              <Link to={createPageUrl('ScheduleHome')} className="text-xs text-gray-500 hover:text-[#E5FF00] flex items-center gap-1 transition-colors">
                Full Schedule <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 6).map((event, i) => {
                const days = differenceInDays(parseISO(event.event_date), parseISO(new Date().toISOString().split('T')[0]));
                const isToday = days === 0;
                const isSoon = days <= 3;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isToday
                        ? 'bg-[#E5FF00]/10 border-[#E5FF00]/30'
                        : isSoon
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <div className="text-center min-w-[48px]">
                      <div className={`text-lg font-black ${isToday ? 'text-[#E5FF00]' : 'text-white'}`}>
                        {isToday ? 'NOW' : days === 1 ? 'TMW' : format(parseISO(event.event_date), 'MMM d')}
                      </div>
                      {!isToday && days > 1 && (
                        <div className="text-xs text-gray-500">{format(parseISO(event.event_date), 'yyyy')}</div>
                      )}
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{event.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{event.location_note || event.series}</div>
                    </div>
                    {isSoon && (
                      <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full ${isToday ? 'bg-[#E5FF00] text-black' : 'bg-white/10 text-gray-400'}`}>
                        <Activity className="w-3 h-3" />
                        {isToday ? 'LIVE' : `${days}d`}
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {upcomingEvents.length === 0 && (
                <div className="text-center py-12 text-gray-600 text-sm">No upcoming events found.</div>
              )}
            </div>
          </div>

          {/* Right Column: Active Series + Next Race Countdown */}
          <div className="space-y-6">
            {/* Next Race Countdown */}
            {nextEvent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#E5FF00]/15 to-[#E5FF00]/5 border border-[#E5FF00]/20 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#E5FF00]" />
                  <span className="text-xs font-mono tracking-widest text-[#E5FF00] uppercase">Next Race</span>
                </div>
                <div className="text-3xl font-black text-white leading-tight">
                  {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} Days`}
                </div>
                <div className="text-sm font-semibold text-white mt-2 leading-snug">{nextEvent.name}</div>
                <div className="text-xs text-gray-400 mt-1">{nextEvent.location_note || nextEvent.series}</div>
                <Link
                  to={createPageUrl('ScheduleHome')}
                  className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#E5FF00] hover:underline"
                >
                  View Full Schedule <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            )}

            {/* Active Series */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-300">Active Series</h2>
              </div>
              <div className="space-y-2">
                {allSeries.slice(0, 5).map((series, i) => (
                  <motion.div
                    key={series.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Link
                      to={createPageUrl('SeriesHome')}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/15 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-md bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate group-hover:text-white transition-colors">{series.name}</div>
                        <div className="text-[10px] text-gray-600">{series.discipline} · {series.region}</div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
                <Link
                  to={createPageUrl('SeriesHome')}
                  className="flex items-center justify-center gap-1 py-2.5 text-xs text-gray-600 hover:text-gray-300 transition-colors"
                >
                  View all series <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Results */}
        {recentResults.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-green-500 rounded-full" />
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-300">Recent Results</h2>
              </div>
              <Link to={createPageUrl('ResultsHome')} className="text-xs text-gray-500 hover:text-green-400 flex items-center gap-1 transition-colors">
                All Results <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentResults.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] font-mono text-green-400 uppercase">Completed</span>
                  </div>
                  <div className="font-semibold text-sm leading-snug">{event.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{event.series}</div>
                  <div className="text-xs text-gray-600 mt-2 font-mono">{format(parseISO(event.event_date), 'MMM d, yyyy')}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <Link
            to={createPageUrl('DriverDirectory')}
            className="group flex items-center justify-between p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
          >
            <div>
              <div className="font-bold text-sm">Driver Profiles</div>
              <div className="text-xs text-gray-500 mt-0.5">{allDrivers.length} drivers in the database</div>
            </div>
            <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          </Link>
          <Link
            to={createPageUrl('TeamDirectory')}
            className="group flex items-center justify-between p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
          >
            <div>
              <div className="font-bold text-sm">Team Directory</div>
              <div className="text-xs text-gray-500 mt-0.5">{allTeams.length} teams registered</div>
            </div>
            <Building2 className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
          </Link>
          <Link
            to={createPageUrl('TrackDirectory')}
            className="group flex items-center justify-between p-5 rounded-xl bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
          >
            <div>
              <div className="font-bold text-sm">Track Directory</div>
              <div className="text-xs text-gray-500 mt-0.5">{allTracks.length} venues and circuits</div>
            </div>
            <MapPin className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}