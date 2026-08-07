import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EventClassesGrid({ classes, onJumpToSessions }) {
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <p className="text-sm text-foreground-quiet">No classes have been configured for this event.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((cls) => (
        <div key={cls.event_class_id} className="bg-surface border border-divider rounded-lg p-5 hover:border-motion/40 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-foreground">{cls.class_name}</div>
              {cls.series_class_name && cls.series_class_name !== cls.class_name && (
                <div className="text-xs text-foreground-quiet mt-0.5">{cls.series_class_name}</div>
              )}
            </div>
            <Badge className={cls.class_status === 'Open' ? 'bg-success/15 text-success' : cls.class_status === 'Full' ? 'bg-warning/15 text-warning' : 'bg-surface-interactive text-foreground-quiet'}>
              {cls.class_status}
            </Badge>
          </div>
          {cls.vehicle_type && <p className="text-xs text-foreground-quiet mb-3">{cls.vehicle_type}</p>}
          <div className="flex items-center gap-4 text-xs text-foreground-secondary mb-4">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.entry_count} entries</span>
            <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{cls.session_count} sessions</span>
          </div>
          {cls.top_qualifier && (
            <div className="mb-3 p-2 bg-motion/5 rounded border border-motion/20">
              <div className="text-[10px] font-mono uppercase tracking-wider text-motion mb-1">Top Qualifier</div>
              <Link to={cls.top_qualifier.racer?.profile_url || '#'} className="text-sm font-medium text-foreground hover:text-motion transition-colors">
                #{cls.top_qualifier.car_number} {cls.top_qualifier.racer?.display_name}
              </Link>
            </div>
          )}
          {cls.feature_results && cls.feature_results.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-quiet mb-1">Feature Result</div>
              <div className="space-y-0.5">
                {cls.feature_results.slice(0, 3).map((r, i) => (
                  <Link key={r.result_id} to={r.racer?.profile_url || '#'} className="flex items-center gap-2 text-xs hover:text-motion transition-colors">
                    <span className="font-mono font-bold text-motion w-6">P{r.position}</span>
                    <span className="text-foreground-secondary truncate">#{r.car_number} {r.racer?.display_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {onJumpToSessions && (
            <button onClick={() => onJumpToSessions(cls.event_class_id)} className="text-xs text-motion hover:underline font-medium">
              View Sessions →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}