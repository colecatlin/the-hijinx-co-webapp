import React from 'react';
import { BarChart3 } from 'lucide-react';

function StatCard({ label, value, classification }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'hsl(var(--surface-elevated))' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono">
        {classification === 'Unavailable' ? '—' : value != null ? value : '—'}
      </p>
      <p className="text-[9px] font-mono uppercase opacity-40">{classification}</p>
    </div>
  );
}

export default function SponsorStatisticsGrid({ analytics }) {
  const commercial = analytics.commercial_metrics;
  const performance = analytics.performance_metrics;
  const completeness = analytics.completeness_summary;

  return (
    <div className="rounded-xl border p-5 h-full" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Statistics Grid</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Sponsorships" value={commercial?.total_sponsorships?.value} classification={commercial?.total_sponsorships?.classification} />
        <StatCard label="Active" value={commercial?.active_sponsorships?.value} classification={commercial?.active_sponsorships?.classification} />
        <StatCard label="Agreements" value={commercial?.agreement_count?.value} classification={commercial?.agreement_count?.classification} />
        <StatCard label="Rev. Events" value={commercial?.revenue_event_count?.value} classification={commercial?.revenue_event_count?.classification} />
      </div>

      {performance && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2 mt-4">Sponsored Racer Performance</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Wins" value={performance.total_wins?.value} classification={performance.total_wins?.classification} />
            <StatCard label="Podiums" value={performance.total_podiums?.value} classification={performance.total_podiums?.classification} />
            <StatCard label="Championships" value={performance.total_championships?.value} classification={performance.total_championships?.classification} />
            <StatCard label="Starts" value={performance.total_starts?.value} classification={performance.total_starts?.classification} />
          </div>
          {performance.note && (
            <p className="text-[10px] opacity-40 mt-2 italic">{performance.note}</p>
          )}
        </>
      )}

      {completeness && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2 mt-4">Measurement Completeness</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--divider))' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${completeness.score}%`,
                  background: completeness.score >= 70 ? 'hsl(var(--success))' : completeness.score >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--danger))',
                }}
              />
            </div>
            <span className="text-sm font-bold font-mono">{completeness.score}%</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {completeness.checks?.filter(c => !c.passed).map(c => (
              <span key={c.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--danger) / 0.15)', color: 'hsl(var(--danger))' }}>
                {c.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}