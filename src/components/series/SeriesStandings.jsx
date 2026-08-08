import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function SeriesStandings({ standings, classes, selectedClass, onClassChange }) {
  return (
    <div className="space-y-4">
      {classes && classes.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-surface-elevated border border-divider rounded-lg">
          <span className="text-sm font-medium text-foreground-secondary">Class:</span>
          <select
            value={selectedClass || ''}
            onChange={e => onClassChange(e.target.value)}
            className="bg-surface border border-divider rounded px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">Overall</option>
            {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
          </select>
        </div>
      )}

      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Standings</h2>
        </div>
        {!standings || standings.length === 0 ? (
          <p className="text-foreground-quiet text-sm">No standings available yet for this season.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-left py-3 px-2 font-semibold text-foreground-quiet">#</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground-quiet">Racer</th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground-quiet">No.</th>
                  <th className="text-right py-3 px-2 font-semibold text-foreground-quiet">Points</th>
                  <th className="text-right py-3 px-2 font-semibold text-foreground-quiet">Wins</th>
                  <th className="text-right py-3 px-2 font-semibold text-foreground-quiet">Podiums</th>
                  <th className="text-right py-3 px-2 font-semibold text-foreground-quiet">Starts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(s => (
                  <tr key={s.standings_id} className="border-b border-divider/60 hover:bg-surface-interactive/40">
                    <td className="py-3 px-2 font-semibold text-foreground">{s.position}</td>
                    <td className="py-3 px-2 font-medium text-foreground">
                      {s.racer?.profile_url ? (
                        <Link to={s.racer.profile_url} className="hover:text-motion transition-colors">{s.racer.display_name}</Link>
                      ) : s.racer?.display_name || 'N/A'}
                    </td>
                    <td className="py-3 px-2 text-foreground-quiet">{s.car_number || '—'}</td>
                    <td className="py-3 px-2 text-right font-semibold text-foreground">{s.points_total}</td>
                    <td className="py-3 px-2 text-right text-foreground-secondary">{s.wins}</td>
                    <td className="py-3 px-2 text-right text-foreground-secondary">{s.podiums}</td>
                    <td className="py-3 px-2 text-right text-foreground-secondary">{s.starts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}