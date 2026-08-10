import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function SponsorStatistics({ statistics, commercialSummary }) {
  if (!statistics) return null;

  const stats = [
    { label: 'Active Sponsorships', value: statistics.active_sponsorships },
    { label: 'Historical Sponsorships', value: statistics.historical_sponsorships },
    { label: 'Current Racers', value: statistics.current_racers },
    { label: 'Current Teams', value: statistics.current_teams },
    { label: 'Current Vehicles', value: statistics.current_vehicles },
    { label: 'Current Series', value: statistics.current_series },
    { label: 'Current Events', value: statistics.current_events },
    { label: 'Current Tracks', value: statistics.current_tracks },
    { label: 'Current Media', value: statistics.current_media },
    { label: 'Total Activations', value: statistics.total_activations },
    { label: 'Completed Activations', value: statistics.completed_activations },
    { label: 'Activation Completion', value: `${statistics.activation_completion_percent}%` },
    { label: 'Total Deliverables', value: statistics.total_deliverables },
    { label: 'Deliverables Completed', value: statistics.deliverables_completed },
    { label: 'Public Media Count', value: statistics.public_media_count },
    { label: 'Advertisement Count', value: statistics.advertisement_count },
    { label: 'Asset Count', value: statistics.asset_count },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4" style={{ color: 'hsl(var(--motion))' }} />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--motion))' }}>Derived Statistics</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="p-4 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>{s.label}</div>
            <div className="text-2xl font-black mt-1" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {commercialSummary && (
        <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.8)', border: '1px solid hsl(var(--divider))' }}>
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>Commercial Breakdown</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase mb-2" style={{ color: 'hsl(var(--motion))' }}>Industries</p>
              <div className="flex flex-wrap gap-2">
                {commercialSummary.industries?.map(i => (
                  <span key={i} className="text-xs px-2 py-1 rounded-md" style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-secondary))' }}>{i}</span>
                ))}
                {commercialSummary.industries?.length === 0 && <span className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>None</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase mb-2" style={{ color: 'hsl(var(--motion))' }}>Tiers</p>
              <div className="flex flex-wrap gap-2">
                {commercialSummary.tiers?.map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-md" style={{ background: 'hsl(var(--motion) / 0.12)', color: 'hsl(var(--motion))' }}>{t}</span>
                ))}
                {commercialSummary.tiers?.length === 0 && <span className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>None</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}