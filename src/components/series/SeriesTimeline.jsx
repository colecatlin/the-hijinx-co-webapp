import React from 'react';
import { Clock, Trophy, Calendar, FileText } from 'lucide-react';

const iconMap = {
  creation: Calendar,
  event: Calendar,
  race_winner: Trophy,
  media: FileText,
};

export default function SeriesTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Timeline</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No timeline events available.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Timeline</h2>
      </div>
      <div className="space-y-3">
        {timeline.map((event, idx) => {
          const Icon = iconMap[event.type] || Calendar;
          return (
            <div key={idx} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-motion/10 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-motion" />
              </div>
              <div className="flex-1 pb-3 border-b border-divider/60 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm">{event.title}</span>
                  {event.date && <span className="text-xs text-foreground-quiet flex-shrink-0 ml-2">{event.date}</span>}
                </div>
                {event.description && <p className="text-xs text-foreground-quiet mt-0.5">{event.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}