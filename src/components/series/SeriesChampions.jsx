import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function SeriesChampions({ champions }) {
  if (!champions || champions.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Champions</h2>
        </div>
        <p className="text-foreground-quiet text-sm">No champions have been determined yet. Champions are derived from final standings of completed seasons.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-motion" />
        <h2 className="text-xl font-bold text-foreground">Champions</h2>
      </div>
      <div className="space-y-3">
        {champions.map((champ, idx) => (
          <div key={`${champ.season_year}-${champ.class_id || 'overall'}-${idx}`} className="border border-divider rounded-lg p-4 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-motion/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-motion" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{champ.racer?.display_name || 'N/A'}</span>
                {champ.racer?.profile_url && (
                  <Link to={champ.racer.profile_url} className="text-xs text-motion hover:text-motion-hover">View Profile</Link>
                )}
              </div>
              <div className="text-sm text-foreground-quiet">
                {champ.season_year} {champ.class_name || 'Overall'}
                {champ.team?.name && ` · ${champ.team.name}`}
              </div>
              <div className="text-xs text-foreground-quiet mt-1">
                {champ.points_total} pts · {champ.wins} win{champ.wins !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}