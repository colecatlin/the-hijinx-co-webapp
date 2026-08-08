import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function SeriesTeamRoster({ teams }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Team Roster</h2>
        <p className="text-foreground-quiet text-sm">No teams participating in this season yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Team Roster</h2>
        <span className="text-sm text-foreground-quiet">({teams.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map(team => (
          <div key={team.team_id} className="border border-divider rounded-lg p-3 hover:border-motion/40 transition-colors">
            <div className="flex items-center gap-3">
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded object-contain flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-surface-interactive flex items-center justify-center text-sm font-bold text-foreground-quiet flex-shrink-0">
                  {team.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {team.profile_url ? (
                  <Link to={team.profile_url} className="font-semibold text-foreground hover:text-motion transition-colors truncate block">{team.name}</Link>
                ) : (
                  <div className="font-semibold text-foreground truncate">{team.name}</div>
                )}
                <div className="text-xs text-foreground-quiet">
                  {team.racer_count} racers · {team.entry_count} entries
                </div>
              </div>
            </div>
            {team.class_names?.length > 0 && (
              <div className="text-xs text-foreground-quiet mt-2">{team.class_names.join(', ')}</div>
            )}
            {team.wins > 0 && (
              <div className="text-xs text-motion mt-1">{team.wins} win{team.wins !== 1 ? 's' : ''}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}