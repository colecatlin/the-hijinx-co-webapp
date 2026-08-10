import React from 'react';
import { Calendar, Trophy, Users, Car, Flag, BarChart3 } from 'lucide-react';

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-motion" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-quiet">{label}</span>
      </div>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

export default function TrackStatisticsBreakdown({ statistics = {} }) {
  if (!statistics || Object.keys(statistics).length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No statistics computed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Events" value={statistics.total_events || 0} />
        <StatCard icon={Trophy} label="Wins" value={statistics.total_wins || 0} />
        <StatCard icon={Trophy} label="Podiums" value={statistics.total_podiums || 0} />
        <StatCard icon={Flag} label="Entries" value={statistics.total_entries || 0} />
        <StatCard icon={Users} label="Racers" value={statistics.racers_count || 0} />
        <StatCard icon={Flag} label="Teams" value={statistics.teams_count || 0} />
        <StatCard icon={Car} label="Vehicles" value={statistics.vehicles_count || 0} />
        <StatCard icon={Flag} label="Series" value={statistics.series_count || 0} />
        <StatCard icon={BarChart3} label="Classes" value={statistics.classes_count || 0} />
        <StatCard icon={Calendar} label="Seasons" value={statistics.seasons_count || 0} />
        <StatCard icon={Car} label="Mfrs" value={statistics.manufacturers_count || 0} />
        <StatCard icon={BarChart3} label="Avg Field" value={statistics.avg_field_size || 0} />
      </div>
    </div>
  );
}