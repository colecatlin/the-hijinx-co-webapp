import React from 'react';
import { History, Trophy, Flag, MapPin } from 'lucide-react';

export default function SeriesHistory({ history }) {
  if (!history || !history.seasons || history.seasons.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">History</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No historical data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Championship History</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-foreground-quiet uppercase tracking-widest mb-2">Seasons</div>
            <div className="flex flex-wrap gap-2">
              {history.seasons.map(y => (
                <span key={y} className="px-2 py-1 bg-surface-interactive rounded text-xs font-mono text-foreground">{y}</span>
              ))}
            </div>
          </div>
          {history.years_active && (
            <div>
              <div className="text-xs text-foreground-quiet uppercase tracking-widest mb-2">Years Active</div>
              <div className="text-foreground font-medium">{history.years_active.start} — {history.years_active.end}</div>
              <div className="text-xs text-foreground-quiet mt-1">{history.total_seasons} season{history.total_seasons !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      </div>

      {history.past_champions && history.past_champions.length > 0 && (
        <div className="bg-surface-elevated border border-divider rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-motion" />
            <h2 className="text-lg font-bold text-foreground">Past Champions</h2>
          </div>
          <div className="space-y-2">
            {history.past_champions.map((champ, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-divider/60 pb-2 last:border-0">
                <div>
                  <span className="font-medium text-foreground">{champ.racer?.display_name || 'N/A'}</span>
                  {champ.team?.name && <span className="text-foreground-quiet text-sm ml-2">{champ.team.name}</span>}
                </div>
                <div className="text-sm text-foreground-quiet">
                  {champ.season_year} {champ.class_name || 'Overall'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.past_tracks && history.past_tracks.length > 0 && (
        <div className="bg-surface-elevated border border-divider rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-motion" />
            <h2 className="text-lg font-bold text-foreground">Tracks Visited</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.past_tracks.map((track, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-surface-interactive rounded text-sm text-foreground">
                {track.name}{track.location_state ? `, ${track.location_state}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {history.past_classes && history.past_classes.length > 0 && (
        <div className="bg-surface-elevated border border-divider rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-4 h-4 text-motion" />
            <h2 className="text-lg font-bold text-foreground">Past Classes</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.past_classes.map((cls, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-surface-interactive rounded text-sm text-foreground">
                {cls.class_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}