import React from 'react';
import { format, parseISO } from 'date-fns';
import { Flag, Calendar, Trophy } from 'lucide-react';

const TYPE_META = {
  creation: { label: 'Creation', color: 'hsl(var(--motion))' },
  opened: { label: 'Opened', color: 'hsl(var(--success))' },
  expansion: { label: 'Expansion', color: 'hsl(var(--motion))' },
  renovation: { label: 'Renovation', color: 'hsl(var(--warning))' },
  ownership: { label: 'Ownership', color: 'hsl(var(--foreground-secondary))' },
  historic_race: { label: 'Historic Race', color: 'hsl(var(--chart-gold))' },
  anniversary: { label: 'Anniversary', color: 'hsl(var(--chart-bronze))' },
  national_event: { label: 'National Event', color: 'hsl(var(--motion-hover))' },
  international_event: { label: 'International Event', color: 'hsl(var(--chart-ocean))' },
  event: { label: 'Event', color: 'hsl(var(--foreground-quiet))' },
  race_winner: { label: 'Race Winner', color: 'hsl(var(--success))' },
  media: { label: 'Media', color: 'hsl(var(--chart-slate))' },
  milestone: { label: 'Milestone', color: 'hsl(var(--motion))' },
};

export default function TrackTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map((item, idx) => {
        const meta = TYPE_META[item.type] || TYPE_META.milestone;
        const dateStr = item.date ? format(parseISO(item.date), 'MMM d, yyyy') : '';
        return (
          <div key={idx} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full border-2 mt-1.5 flex-shrink-0" style={{ borderColor: meta.color, background: 'hsl(var(--surface))' }} />
              {idx < timeline.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--divider))' }} />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}15` }}>
                  {meta.label}
                </span>
                {dateStr && <span className="text-[10px] font-mono text-foreground-quiet">{dateStr}</span>}
              </div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.description && <p className="text-xs text-foreground-secondary mt-0.5">{item.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}