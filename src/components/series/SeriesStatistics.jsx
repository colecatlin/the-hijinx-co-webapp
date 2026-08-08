import React from 'react';
import { BarChart3, Calendar, Flag, Users, Trophy, Car, MapPin } from 'lucide-react';

export default function SeriesStatistics({ statistics }) {
  if (!statistics) return null;

  const stats = [
    { label: 'Seasons', value: statistics.seasons_count, icon: Calendar },
    { label: 'Events', value: statistics.events_count, icon: Calendar },
    { label: 'Classes', value: statistics.classes_count, icon: Flag },
    { label: 'Racers', value: statistics.racers_count, icon: Users },
    { label: 'Teams', value: statistics.teams_count, icon: Users },
    { label: 'Vehicles', value: statistics.vehicles_count, icon: Car },
    { label: 'Tracks', value: statistics.tracks_count, icon: MapPin },
    { label: 'Championships', value: statistics.championships_count, icon: Trophy },
    { label: 'Total Entries', value: statistics.total_entries, icon: BarChart3 },
    { label: 'Total Results', value: statistics.total_results, icon: BarChart3 },
    { label: 'Total Wins', value: statistics.total_wins, icon: Trophy },
    { label: 'Total Podiums', value: statistics.total_podiums, icon: Trophy },
    { label: 'Manufacturers', value: statistics.manufacturers_count, icon: Car },
    { label: 'Avg Field Size', value: statistics.avg_field_size, icon: Users },
  ];

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Series Statistics</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="border border-divider rounded-lg p-3">
            <s.icon className="w-3.5 h-3.5 text-motion mb-2" />
            <div className="text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-foreground-quiet">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}