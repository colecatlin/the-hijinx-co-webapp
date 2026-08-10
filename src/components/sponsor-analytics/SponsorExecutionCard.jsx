import React from 'react';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

function MetricStat({ label, metric }) {
  if (!metric) return null;
  const { value, classification, reason } = metric;
  return (
    <div className="rounded-lg p-3" style={{ background: 'hsl(var(--surface-elevated))' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-50 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">
        {classification === 'Unavailable' ? '—' : value != null ? value : '—'}
      </p>
      <p className="text-[9px] font-mono uppercase opacity-40">{classification}</p>
      {reason && <p className="text-[9px] opacity-40 mt-0.5">{reason}</p>}
    </div>
  );
}

export default function SponsorExecutionCard({ activations, deliverables }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Execution Metrics</h3>
      </div>

      {/* Activations */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Activations</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <MetricStat label="Total" metric={activations?.total} />
          <MetricStat label="Planned" metric={activations?.planned} />
          <MetricStat label="Active" metric={activations?.active} />
          <MetricStat label="Completed" metric={activations?.completed} />
          <MetricStat label="Cancelled" metric={activations?.cancelled} />
          <MetricStat label="Done %" metric={activations?.completion_percent} />
        </div>
      </div>

      {/* Deliverables */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Deliverables</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <MetricStat label="Total" metric={deliverables?.total} />
          <MetricStat label="Completed" metric={deliverables?.completed} />
          <MetricStat label="Outstanding" metric={deliverables?.outstanding} />
          <MetricStat label="Cancelled" metric={deliverables?.cancelled} />
          <MetricStat label="Done %" metric={deliverables?.completion_percent} />
          <MetricStat label="Over-delivered" metric={deliverables?.over_delivered} />
        </div>
      </div>

      {/* By Type breakdowns */}
      {activations?.by_type?.classification === 'Derived' && Array.isArray(activations.by_type.value) && activations.by_type.value.length > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--divider) / 0.5)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Activations by Type</p>
          <div className="flex flex-wrap gap-2">
            {activations.by_type.value.map((item) => (
              <span key={item.type} className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'hsl(var(--surface-interactive))' }}>
                {item.type}: {item.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {deliverables?.by_type?.classification === 'Derived' && Array.isArray(deliverables.by_type.value) && deliverables.by_type.value.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Deliverables by Type</p>
          <div className="flex flex-wrap gap-2">
            {deliverables.by_type.value.map((item) => (
              <span key={item.type} className="text-xs px-2 py-1 rounded-md font-mono" style={{ background: 'hsl(var(--surface-interactive))' }}>
                {item.type}: {item.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}