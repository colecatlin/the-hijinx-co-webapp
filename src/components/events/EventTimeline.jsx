import React from 'react';
import { Trophy, Flag, Calendar, Radio, FileText, CheckCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const TYPE_ICONS = {
  race_winner: Trophy,
  session_completed: CheckCircle,
  session_live: Radio,
  publication: FileText,
  creation: Calendar,
  media: FileText,
};

function safeDate(dateStr) {
  if (!dateStr) return null;
  try { const d = parseISO(dateStr); return isValid(d) ? format(d, 'MMM d, yyyy · HH:mm') : null; } catch { return null; }
}

export default function EventTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <Calendar className="w-8 h-8 text-foreground-quiet mx-auto mb-3" />
        <p className="text-sm text-foreground-quiet">No timeline events yet.</p>
      </div>
    );
  }
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-divider" />
      <div className="space-y-4">
        {timeline.map((item, i) => {
          const Icon = TYPE_ICONS[item.type] || Flag;
          return (
            <div key={i} className="relative">
              <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-motion border-2 border-canvas" />
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 text-motion flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  {item.description && <div className="text-xs text-foreground-secondary mt-0.5">{item.description}</div>}
                  {item.date && <div className="text-[10px] font-mono text-foreground-quiet mt-1">{safeDate(item.date)}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}