import React from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';

export default function TrackTeamLeaders({ teams = [] }) {
  if (!teams.length) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Flag className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No team data at this track yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {teams.map((team, idx) => {
        const content = (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-motion transition-colors" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name || ''} className="w-8 h-8 rounded object-contain flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--surface-interactive))' }}>
                <Flag className="w-3.5 h-3.5 text-foreground-quiet" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{team.name || 'Unknown'}</p>
              <div className="flex gap-3 text-xs text-foreground-quiet mt-0.5">
                <span>{team.wins}W</span>
                <span>{team.podiums}P</span>
                <span>{team.starts}S</span>
              </div>
            </div>
          </div>
        );
        return team.profile_url ? (
          <Link key={idx} to={team.profile_url}>{content}</Link>
        ) : (
          <div key={idx}>{content}</div>
        );
      })}
    </div>
  );
}