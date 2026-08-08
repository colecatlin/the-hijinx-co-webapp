import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function SeriesRacerRoster({ racers }) {
  if (!racers || racers.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Racer Roster</h2>
        <p className="text-foreground-quiet text-sm">No racers registered for this season yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Racer Roster</h2>
        <span className="text-sm text-foreground-quiet">({racers.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {racers.map(racer => (
          <div key={racer.racer_profile_id || racer.display_name} className="border border-divider rounded-lg p-3 hover:border-motion/40 transition-colors">
            <div className="flex items-center gap-3">
              {racer.profile_image_url ? (
                <img src={racer.profile_image_url} alt={racer.display_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-interactive flex items-center justify-center text-sm font-bold text-foreground-quiet flex-shrink-0">
                  {racer.display_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {racer.profile_url ? (
                  <Link to={racer.profile_url} className="font-semibold text-foreground hover:text-motion transition-colors truncate block">{racer.display_name}</Link>
                ) : (
                  <div className="font-semibold text-foreground truncate">{racer.display_name}</div>
                )}
                <div className="text-xs text-foreground-quiet flex flex-wrap gap-2">
                  {racer.car_number && <span>#{racer.car_number}</span>}
                  {racer.racer_type && racer.racer_type !== 'Driver' && <span>{racer.racer_type}</span>}
                </div>
              </div>
            </div>
            {racer.classes?.length > 0 && (
              <div className="text-xs text-foreground-quiet mt-2">{racer.classes.join(', ')}</div>
            )}
            {racer.current_standing && (
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-motion">P{racer.current_standing.position}</span>
                <span className="text-foreground-quiet">{racer.current_standing.points_total} pts</span>
                <span className="text-foreground-quiet">{racer.current_standing.wins}W</span>
              </div>
            )}
            {racer.team?.name && (
              <div className="text-xs text-foreground-quiet mt-1">{racer.team.name}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}