import React from 'react';
import CompetitionLevelBadge from '@/components/competition/CompetitionLevelBadge';
import GeographicScopeTag from '@/components/competition/GeographicScopeTag';
import { Link } from 'react-router-dom';

export default function SeriesClasses({ classes, onViewStandings }) {
  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Racing Classes</h2>
      {classes.length === 0 ? (
        <p className="text-foreground-quiet text-sm">No classes defined for this series yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls.class_id} className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors">
              <div className="font-semibold text-foreground mb-2">{cls.class_name}</div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {cls.competition_level && <CompetitionLevelBadge level={cls.competition_level} size="sm" />}
                {cls.geographic_scope && <GeographicScopeTag scope={cls.geographic_scope} size="sm" />}
              </div>
              {cls.vehicle_type && <p className="text-xs text-foreground-quiet mb-2">Vehicle: {cls.vehicle_type}</p>}
              {cls.description_summary && <p className="text-sm text-foreground-secondary mb-3">{cls.description_summary}</p>}
              <div className="flex items-center justify-between text-xs text-foreground-quiet mb-3">
                <span>{cls.entry_count} entries</span>
                {cls.standings_leader && <span>Leader: {cls.standings_leader.racer.display_name}</span>}
              </div>
              <button
                onClick={() => onViewStandings?.(cls.class_id)}
                className="w-full text-xs font-medium text-motion hover:text-motion-hover transition-colors text-left"
              >
                View Standings →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}