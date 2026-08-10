import React from 'react';
import { DollarSign, TrendingUp, FileText } from 'lucide-react';

function MetricRow({ label, metric, formatCurrency }) {
  if (!metric) return null;
  const { value, classification, reason } = metric;
  const displayValue = classification === 'Unavailable'
    ? 'Unavailable'
    : formatCurrency && typeof value === 'number'
      ? `$${(value / 100).toFixed(2)}`
      : value != null ? value : '—';

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'hsl(var(--divider) / 0.5)' }}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {reason && <p className="text-[10px] opacity-50 mt-0.5">{reason}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold font-mono">{displayValue}</p>
        <p className="text-[9px] font-mono uppercase tracking-wider opacity-40">{classification}</p>
      </div>
    </div>
  );
}

export default function SponsorFinancialCard({ financial }) {
  if (!financial) return null;

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 opacity-60" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Financial Metrics</h3>
        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--danger) / 0.15)', color: 'hsl(var(--danger))' }}>Admin Only</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <div>
          <MetricRow label="Gross Revenue" metric={financial.gross_revenue} formatCurrency />
          <MetricRow label="Platform Revenue" metric={financial.platform_revenue} formatCurrency />
          <MetricRow label="Creator Revenue" metric={financial.creator_revenue} formatCurrency />
          <MetricRow label="Outlet Revenue" metric={financial.outlet_revenue} formatCurrency />
        </div>
        <div>
          <MetricRow label="Agreement Count" metric={financial.agreement_count} />
          <MetricRow label="Active Agreements" metric={financial.active_agreements} />
          <MetricRow label="Avg Agreement Value" metric={financial.average_agreement_value} formatCurrency />
          <MetricRow label="Revenue Events" metric={financial.revenue_event_count} />
        </div>
      </div>

      {financial.revenue_by_sponsorship?.classification === 'Derived' && Array.isArray(financial.revenue_by_sponsorship.value) && financial.revenue_by_sponsorship.value.length > 0 && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--divider) / 0.5)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Revenue by Sponsorship</p>
          <div className="space-y-1">
            {financial.revenue_by_sponsorship.value.map((item) => (
              <div key={item.sponsorship_id} className="flex justify-between text-xs">
                <span className="font-mono opacity-60 truncate max-w-[200px]">{item.sponsorship_id.substring(0, 12)}...</span>
                <span className="font-mono font-bold">${(item.amount / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}