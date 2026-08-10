import React from 'react';
import { TrendingUp } from 'lucide-react';

function TrendChart({ label, metric }) {
  if (!metric) return null;
  const { value, classification, reason } = metric;

  if (classification === 'Unavailable' || !Array.isArray(value) || value.length === 0) {
    return (
      <div className="rounded-lg p-4" style={{ background: 'hsl(var(--surface-elevated))' }}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
        <p className="text-sm opacity-40">{reason || 'No data available'}</p>
      </div>
    );
  }

  const maxCount = Math.max(...value.map((p) => p.count), 1);

  return (
    <div className="rounded-lg p-4" style={{ background: 'hsl(var(--surface-elevated))' }}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-3">{label}</p>
      <div className="space-y-1.5">
        {value.map((point) => (
          <div key={point.month} className="flex items-center gap-2">
            <span className="text-[10px] font-mono opacity-50 w-16 flex-shrink-0">{point.month}</span>
            <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: 'hsl(var(--surface-interactive))' }}>
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${(point.count / maxCount) * 100}%`,
                  background: 'hsl(var(--motion))',
                  minWidth: point.count > 0 ? '4px' : '0',
                }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold w-6 text-right">{point.count}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] font-mono uppercase opacity-40 mt-2">{classification}</p>
    </div>
  );
}

export default function SponsorTrendCard({ trends }) {
  if (!trends) return null;

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Trend Metrics</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TrendChart label="Activations Over Time" metric={trends.activations_over_time} />
        <TrendChart label="Deliverables Completed Over Time" metric={trends.deliverables_over_time} />
        <TrendChart label="Revenue Events Over Time" metric={trends.revenue_events_over_time} />
        <TrendChart label="Sponsorship Growth" metric={trends.sponsorship_growth} />
      </div>
    </div>
  );
}