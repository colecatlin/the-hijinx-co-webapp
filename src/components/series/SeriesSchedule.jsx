import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SeriesSchedule({ schedule, allSeasons, selectedSeason, onSeasonChange }) {
  const statusColors = {
    Draft: 'bg-surface-interactive text-foreground-secondary',
    Published: 'bg-blue-500/15 text-blue-600',
    Live: 'bg-success/15 text-success',
    Completed: 'bg-surface-interactive text-foreground-quiet',
    Cancelled: 'bg-danger/15 text-danger',
  };

  return (
    <div className="space-y-4">
      {/* Season selector */}
      {allSeasons && allSeasons.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-surface-elevated border border-divider rounded-lg">
          <span className="text-sm font-medium text-foreground-secondary">Season:</span>
          <select
            value={selectedSeason || ''}
            onChange={e => onSeasonChange(e.target.value)}
            className="bg-surface border border-divider rounded px-3 py-1.5 text-sm text-foreground"
          >
            {allSeasons.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Event Schedule{selectedSeason ? ` — ${selectedSeason}` : ''}</h2>
        {schedule.length === 0 ? (
          <p className="text-foreground-quiet text-sm">No events scheduled for this season yet.</p>
        ) : (
          <div className="space-y-3">
            {schedule.map(event => (
              <div key={event.event_id} className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {event.round_number && <span className="text-xs font-mono text-foreground-quiet">R{event.round_number}</span>}
                      <Link to={event.profile_url} className="font-semibold text-foreground hover:text-motion transition-colors">{event.name}</Link>
                      <Badge className={statusColors[event.status] || statusColors.Draft}>{event.status}</Badge>
                    </div>
                    <div className="text-sm text-foreground-secondary flex flex-wrap gap-3">
                      {event.track?.name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.track.name}{event.track.location_state ? `, ${event.track.location_state}` : ''}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.event_date}{event.end_date && event.end_date !== event.event_date ? ` — ${event.end_date}` : ''}</span>
                      {event.entry_count > 0 && <span>{event.entry_count} entries</span>}
                    </div>
                    {event.winner && (
                      <div className="text-xs text-motion mt-2 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />Winner: {event.winner.racer.display_name}
                        {event.winner.team?.name && ` — ${event.winner.team.name}`}
                      </div>
                    )}
                  </div>
                  <Link to={event.profile_url} className="text-xs font-medium text-motion hover:text-motion-hover transition-colors flex-shrink-0">
                    View Event →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}