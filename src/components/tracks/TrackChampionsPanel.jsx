import React from 'react';
import { Trophy } from 'lucide-react';

export default function TrackChampionsPanel({ champions = [] }) {
  if (!champions.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Trophy className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No champions recorded at this track yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {champions.map((champ, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--motion) / 0.15)' }}>
            <Trophy className="w-4 h-4 text-motion" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {champ.racer?.display_name || 'Unknown'}
            </p>
            <p className="text-xs text-foreground-quiet">
              {champ.season_year}
              {champ.series_name ? ` · ${champ.series_name}` : ''}
              {champ.class_name ? ` · ${champ.class_name}` : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {champ.wins > 0 && <p className="text-xs font-mono text-motion">{champ.wins}W</p>}
            {champ.points_total > 0 && <p className="text-[10px] font-mono text-foreground-quiet">{champ.points_total} pts</p>}
          </div>
        </div>
      ))}
    </div>
  );
}