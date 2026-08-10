import React from 'react';
import { Clock, Calendar, Zap, CheckCircle2, Megaphone, FileText, Handshake } from 'lucide-react';

const TYPE_CONFIG = {
  creation: { icon: Clock, color: 'hsl(var(--motion))', label: 'Created' },
  sponsorship_start: { icon: Handshake, color: 'hsl(var(--motion))', label: 'Partnership' },
  sponsorship_completion: { icon: CheckCircle2, color: 'hsl(var(--success))', label: 'Completed' },
  activation: { icon: Zap, color: 'hsl(var(--motion))', label: 'Activation' },
  activation_completed: { icon: CheckCircle2, color: 'hsl(var(--success))', label: 'Completed' },
  deliverable_completed: { icon: CheckCircle2, color: 'hsl(var(--success))', label: 'Delivered' },
  advertisement: { icon: Megaphone, color: 'hsl(var(--foreground-secondary))', label: 'Advertisement' },
  media: { icon: FileText, color: 'hsl(var(--foreground-secondary))', label: 'Media' },
};

export default function SponsorTimeline({ timeline = [] }) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: 'hsl(var(--surface) / 0.5)', border: '1px dashed hsl(var(--divider))' }}>
        <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--foreground-quiet))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4" style={{ color: 'hsl(var(--motion))' }}>
        Sponsor Timeline ({timeline.length})
      </h3>
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: 'hsl(var(--divider))' }} />
        {timeline.map((event, i) => {
          const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.creation;
          const Icon = config.icon;
          return (
            <div key={i} className="relative">
              <div className="absolute -left-4 w-3 h-3 rounded-full flex items-center justify-center"
                style={{ background: config.color, top: '4px' }}>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--surface-elevated) / 0.6)', border: '1px solid hsl(var(--divider))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                  <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: config.color }}>{config.label}</span>
                  {event.date && (
                    <span className="text-[10px] font-mono ml-auto" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{event.title}</div>
                {event.description && (
                  <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>{event.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}