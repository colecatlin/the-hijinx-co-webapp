import React from 'react';
import { TrendingUp, Activity, DollarSign, Eye } from 'lucide-react';

export default function SponsorAnalyticsHero({ analytics }) {
  const org = analytics.organization;
  const readiness = analytics.readiness;

  const stats = [
    {
      label: 'Sponsorships',
      value: analytics.commercial_metrics?.total_sponsorships?.value ?? 0,
      icon: Activity,
      classification: analytics.commercial_metrics?.total_sponsorships?.classification,
    },
    {
      label: 'Activations',
      value: analytics.activation_metrics?.total?.value ?? 0,
      icon: TrendingUp,
      classification: analytics.activation_metrics?.total?.classification,
    },
    {
      label: 'Revenue Events',
      value: analytics.commercial_metrics?.revenue_event_count?.value ?? 0,
      icon: DollarSign,
      classification: analytics.commercial_metrics?.revenue_event_count?.classification,
    },
    {
      label: 'Readiness',
      value: `${readiness?.score ?? 0}%`,
      icon: Eye,
      classification: readiness?.classification?.classification,
    },
  ];

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Sponsor Analytics</p>
          <h2 className="text-2xl font-bold">{org?.name}</h2>
          <p className="text-sm opacity-60 mt-1">
            {org?.industry || 'Uncategorized'} · Generated {new Date(analytics.generated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg p-4" style={{ background: 'hsl(var(--surface-elevated))' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 opacity-50" />
                <span className="text-xs font-semibold uppercase tracking-wide opacity-60">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.classification && (
                <p className="text-[10px] font-mono uppercase tracking-wider opacity-40 mt-1">{stat.classification}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}