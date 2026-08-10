import React from 'react';
import { Zap, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';

export default function SponsorActivationTimeline({ activations }) {
  const { current_activations = [], completed_activations = [], public_deliverables = [], activations_by_type = [] } = activations || {};

  if (current_activations.length === 0 && completed_activations.length === 0 && public_deliverables.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
        <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No public activations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activations_by_type.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>Activation Types</h3>
          <div className="flex flex-wrap gap-2">
            {activations_by_type.map(t => (
              <span key={t.type} className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md"
                style={{ background: 'hsl(var(--motion) / 0.1)', color: 'hsl(var(--motion))' }}>
                {t.type} ({t.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {current_activations.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--motion))' }}>
            Current Activations ({current_activations.length})
          </h3>
          <div className="space-y-2">
            {current_activations.map(a => <ActivationCard key={a.id} activation={a} />)}
          </div>
        </div>
      )}

      {completed_activations.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Completed Activations ({completed_activations.length})
          </h3>
          <div className="space-y-2">
            {completed_activations.map(a => <ActivationCard key={a.id} activation={a} completed />)}
          </div>
        </div>
      )}

      {public_deliverables.length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Deliverables ({public_deliverables.length})
          </h3>
          <div className="space-y-2">
            {public_deliverables.map(d => <DeliverableCard key={d.id} deliverable={d} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivationCard({ activation, completed }) {
  return (
    <div className="p-4 rounded-xl" style={{
      background: 'hsl(var(--surface-elevated) / 0.8)',
      border: `1px solid ${completed ? 'hsl(var(--divider))' : 'hsl(var(--motion) / 0.2)'}`,
    }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: completed ? 'hsl(var(--surface-interactive))' : 'hsl(var(--motion) / 0.12)' }}>
          {completed ? <CheckCircle2 className="w-5 h-5" style={{ color: 'hsl(var(--success))' }} /> : <Zap className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{activation.title}</span>
            <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded"
              style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-quiet))' }}>
              {activation.activation_type}
            </span>
          </div>
          {activation.description && (
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-secondary))' }}>{activation.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            {activation.start_date && (
              <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                <Calendar className="w-3 h-3 inline mr-1" />{activation.start_date.split('T')[0]}
              </span>
            )}
            {activation.location && (
              <span className="text-[10px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                <MapPin className="w-3 h-3 inline mr-1" />{activation.location}
              </span>
            )}
            {activation.estimated_reach != null && (
              <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--motion))' }}>
                Est. reach: {activation.estimated_reach.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-1 rounded flex-shrink-0"
          style={{
            background: completed ? 'hsl(var(--success) / 0.12)' : 'hsl(var(--motion) / 0.12)',
            color: completed ? 'hsl(var(--success))' : 'hsl(var(--motion))',
          }}>
          {activation.status}
        </span>
      </div>
    </div>
  );
}

function DeliverableCard({ deliverable }) {
  const completion = deliverable.quantity_required > 0
    ? Math.round((deliverable.quantity_completed / deliverable.quantity_required) * 100)
    : 0;
  const isComplete = deliverable.status === 'completed';

  return (
    <div className="p-3 rounded-xl flex items-center gap-3" style={{
      background: 'hsl(var(--surface-elevated) / 0.6)',
      border: '1px solid hsl(var(--divider))',
    }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{deliverable.title}</span>
          <span className="text-[10px] font-mono uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>{deliverable.deliverable_type}</span>
        </div>
        {deliverable.due_date && (
          <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            <Clock className="w-3 h-3 inline mr-1" />Due: {deliverable.due_date.split('T')[0]}
          </span>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-xs font-bold" style={{ color: isComplete ? 'hsl(var(--success))' : 'hsl(var(--foreground))' }}>
          {deliverable.quantity_completed}/{deliverable.quantity_required}
        </div>
        <div className="text-[9px] font-mono" style={{ color: 'hsl(var(--foreground-quiet))' }}>{completion}%</div>
      </div>
    </div>
  );
}