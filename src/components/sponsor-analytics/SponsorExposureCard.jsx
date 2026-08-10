import React from 'react';
import { Eye, Users, Car, Flag } from 'lucide-react';

function ExposureStat({ label, metric, icon: Icon }) {
  if (!metric) return null;
  const { value, classification, reason } = metric;
  return (
    <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: 'hsl(var(--surface-elevated))' }}>
      {Icon && <Icon className="w-4 h-4 opacity-40 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50">{label}</p>
        <p className="text-lg font-bold font-mono">
          {classification === 'Unavailable' ? '—' : value != null ? value : '—'}
        </p>
        <p className="text-[9px] font-mono uppercase opacity-40">{classification}</p>
      </div>
    </div>
  );
}

export default function SponsorExposureCard({ exposure }) {
  if (!exposure) return null;

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Exposure Metrics</h3>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Current Sponsorships</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <ExposureStat label="Racers" metric={exposure.sponsored_racers_current} icon={Users} />
        <ExposureStat label="Teams" metric={exposure.sponsored_teams_current} icon={Users} />
        <ExposureStat label="Vehicles" metric={exposure.sponsored_vehicles_current} icon={Car} />
        <ExposureStat label="Series" metric={exposure.sponsored_series_current} icon={Flag} />
        <ExposureStat label="Events" metric={exposure.sponsored_events_current} icon={Flag} />
        <ExposureStat label="Tracks" metric={exposure.sponsored_tracks_current} icon={Flag} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">All-Time</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <ExposureStat label="All Racers" metric={exposure.sponsored_racers_all} />
        <ExposureStat label="All Teams" metric={exposure.sponsored_teams_all} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Campaigns & Reach</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ExposureStat label="Current Campaigns" metric={exposure.current_campaigns} />
        <ExposureStat label="Historical Campaigns" metric={exposure.historical_campaigns} />
        <ExposureStat label="Est. Reach Sum" metric={exposure.estimated_reach_sum} />
        <ExposureStat label="Actual Reach Sum" metric={exposure.actual_reach_sum} />
      </div>

      {exposure.audience_reach?.reason && (
        <p className="text-[10px] opacity-40 mt-3 font-mono">{exposure.audience_reach.reason}</p>
      )}
    </div>
  );
}