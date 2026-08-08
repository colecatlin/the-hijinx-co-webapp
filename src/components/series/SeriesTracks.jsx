import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function SeriesTracks({ tracks }) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Tracks</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No tracks associated with this series yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Tracks</h2>
        <span className="text-sm text-foreground-quiet">({tracks.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tracks.map(track => (
          <div key={track.track_id} className="border border-divider rounded-lg p-4 hover:border-motion/40 transition-colors">
            {track.profile_url ? (
              <Link to={track.profile_url} className="font-semibold text-foreground hover:text-motion transition-colors block">{track.name}</Link>
            ) : (
              <div className="font-semibold text-foreground">{track.name}</div>
            )}
            <div className="text-sm text-foreground-quiet mt-1">
              {track.location_city}{track.location_state ? `, ${track.location_state}` : ''}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-foreground-quiet">
              <span>{track.events_hosted} event{track.events_hosted !== 1 ? 's' : ''}</span>
              {track.rounds_hosted > 0 && <span>{track.rounds_hosted} rounds</span>}
            </div>
            {track.winner_history && track.winner_history.length > 0 && (
              <div className="mt-2 pt-2 border-t border-divider/60">
                <div className="text-xs text-foreground-quiet mb-1">Recent Winners:</div>
                {track.winner_history.slice(0, 3).map((w, idx) => (
                  <div key={idx} className="text-xs text-foreground-secondary">{w.racer.display_name}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}