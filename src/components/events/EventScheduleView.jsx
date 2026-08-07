import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';

const SESSION_TYPE_COLORS = {
  Practice: 'bg-surface-interactive text-foreground-secondary',
  Qualifying: 'bg-motion/15 text-motion',
  Heat: 'bg-warning/15 text-warning',
  LCQ: 'bg-warning/15 text-warning',
  Feature: 'bg-success/15 text-success',
  Final: 'bg-success/15 text-success',
};

export default function EventScheduleView({ schedule }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <Calendar className="w-8 h-8 text-foreground-quiet mx-auto mb-3" />
        <p className="text-sm text-foreground-quiet">No schedule has been published yet for this event.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {schedule.map((day) => (
        <section key={day.day_id || day.date} className="bg-surface border border-divider rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{day.label || 'Schedule'}</h2>
              {day.date && <p className="text-xs text-foreground-quiet mt-0.5">{format(parseISO(day.date), 'EEEE, MMMM d, yyyy')}</p>}
            </div>
            {day.round_label && <Badge className="bg-motion/15 text-motion">{day.round_label}</Badge>}
          </div>
          {day.sessions.length > 0 ? (
            <div className="space-y-2">
              {day.sessions.map((session) => (
                <div key={session.session_id} className="flex items-center gap-4 p-3 border border-divider rounded-lg hover:border-motion/30 transition-colors">
                  <div className="flex-shrink-0 w-20">
                    {session.scheduled_time ? (
                      <div className="text-xs font-mono text-foreground-secondary">
                        {format(parseISO(session.scheduled_time), 'HH:mm')}
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-foreground-quiet">TBA</div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Badge className={SESSION_TYPE_COLORS[session.session_type] || 'bg-surface-interactive text-foreground-secondary'}>
                      {session.session_type}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{session.name}</div>
                    {session.class_name && <div className="text-xs text-foreground-quiet mt-0.5">{session.class_name}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {session.entry_count > 0 && <span className="text-xs text-foreground-quiet">{session.entry_count} entries</span>}
                    <Badge className={
                      session.status === 'Completed' || session.status === 'Official' || session.status === 'Locked' ? 'bg-success/15 text-success' :
                      session.status === 'Live' ? 'bg-motion/15 text-motion' :
                      'bg-surface-interactive text-foreground-quiet'
                    }>{session.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground-quiet">No sessions scheduled for this day.</p>
          )}
        </section>
      ))}
    </div>
  );
}