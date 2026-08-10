import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function TrackRacerLeaders({ racers = [] }) {
  if (!racers.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Users className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No racer data at this track yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {racers.map((racer, idx) => {
        const content = (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-motion transition-colors" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
            <span className="text-xs font-mono text-foreground-quiet w-6 text-center flex-shrink-0">#{idx + 1}</span>
            {racer.profile_image_url ? (
              <img src={racer.profile_image_url} alt={racer.display_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--surface-interactive))' }}>
                <Users className="w-3.5 h-3.5 text-foreground-quiet" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{racer.display_name}</p>
              {racer.hometown_city && (
                <p className="text-xs text-foreground-quiet truncate">{racer.hometown_city}{racer.hometown_state ? `, ${racer.hometown_state}` : ''}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-right flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-motion">{racer.wins}</p>
                <p className="text-[9px] font-mono text-foreground-quiet uppercase">Wins</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{racer.starts}</p>
                <p className="text-[9px] font-mono text-foreground-quiet uppercase">Starts</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{racer.win_pct}%</p>
                <p className="text-[9px] font-mono text-foreground-quiet uppercase">Win%</p>
              </div>
              {racer.championships > 0 && (
                <div>
                  <p className="text-sm font-bold text-motion">{racer.championships}</p>
                  <p className="text-[9px] font-mono text-foreground-quiet uppercase">Champ</p>
                </div>
              )}
            </div>
          </div>
        );
        return racer.profile_url ? (
          <Link key={idx} to={racer.profile_url}>{content}</Link>
        ) : (
          <div key={idx}>{content}</div>
        );
      })}
    </div>
  );
}