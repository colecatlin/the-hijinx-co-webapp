import React from 'react';
import { Pencil, Archive, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS = {
  planned: 'hsl(var(--foreground-quiet))',
  approved: 'hsl(var(--warning))',
  active: 'hsl(var(--motion))',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--danger))',
  archived: 'hsl(var(--foreground-quiet))',
};

export default function ActivationCard({ activation, deliverables, onEdit, onArchive, onAddDeliverable, onEditDeliverable, onCompleteDeliverable, onArchiveDeliverable }) {
  const statusColor = STATUS_COLORS[activation.status] || 'hsl(var(--foreground-quiet))';
  const budget = activation.budget_amount ? `$${(activation.budget_amount / 100).toLocaleString()}` : null;
  const completionPct = deliverables.length > 0
    ? Math.round((deliverables.filter(d => d.status === 'completed').length / deliverables.length) * 100)
    : 0;

  return (
    <div className="rounded-xl border" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--divider))' }}>
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{activation.title}</h4>
            <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${statusColor} / 0.15`, color: statusColor }}>
              {activation.status}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-secondary))' }}>
              {activation.activation_type}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {activation.location && <span>{activation.location}</span>}
            {budget && <span>{budget}</span>}
            {activation.estimated_reach != null && <span>Est. reach: {activation.estimated_reach.toLocaleString()}</span>}
            {deliverables.length > 0 && <span>{deliverables.length} deliverable(s) · {completionPct}% complete</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(activation)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!activation.is_archived && (
            <button onClick={() => onArchive(activation)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {deliverables.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          {deliverables.map(d => (
            <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--surface-interactive) / 0.4)' }}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[9px] font-mono uppercase" style={{ color: STATUS_COLORS[d.status] || 'hsl(var(--foreground-quiet))' }}>●</span>
                <span className="text-xs truncate" style={{ color: 'hsl(var(--foreground-secondary))' }}>{d.title}</span>
                <span className="text-[9px] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>{d.quantity_completed || 0}/{d.quantity_required || 1}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.status !== 'completed' && (
                  <button onClick={() => onCompleteDeliverable(d)} title="Mark complete" className="p-1 rounded" style={{ color: 'hsl(var(--success))' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => onEditDeliverable(d)} className="p-1 rounded" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  <Pencil className="w-3 h-3" />
                </button>
                {!d.is_archived && (
                  <button onClick={() => onArchiveDeliverable(d)} className="p-1 rounded" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    <Archive className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-4 pb-3">
        <button onClick={onAddDeliverable} className="text-xs font-semibold tracking-wide" style={{ color: 'hsl(var(--motion))' }}>
          + Add Deliverable
        </button>
      </div>
    </div>
  );
}