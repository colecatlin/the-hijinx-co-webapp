import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, AlertCircle } from 'lucide-react';

export default function EventStandingsImpact({ standingsImpact, series, event }) {
  if (!standingsImpact || !standingsImpact.available) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-foreground-quiet flex-shrink-0" />
        <p className="text-sm text-foreground-quiet">Standings not calculated yet for this season.</p>
      </div>
    );
  }

  const leaders = standingsImpact.leaders || [];
  return (
    <div className="space-y-4">
      <section className="bg-surface border border-divider rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Championship Standings</h2>
          {series?.profile_url && (
            <Link to={`${series.profile_url}`} className="text-xs text-motion hover:underline">View Series →</Link>
          )}
        </div>
        {leaders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-divider">
                <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Pos</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Racer</th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet hidden md:table-cell">Class</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Points</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet hidden sm:table-cell">Wins</th>
                <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet hidden sm:table-cell">Starts</th>
              </tr></thead>
              <tbody>
                {leaders.map((s, i) => (
                  <tr key={s.standings_id || i} className={`border-b border-divider/60 hover:bg-surface-interactive/50 ${i === 0 ? 'bg-motion/5' : ''}`}>
                    <td className="py-2 px-2 font-mono font-bold text-motion">{s.position || i + 1}</td>
                    <td className="py-2 px-2">
                      <Link to={s.racer_url || '#'} className="font-medium text-foreground hover:text-motion transition-colors">
                        {s.racer_name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-xs text-foreground-quiet hidden md:table-cell">{s.class_name || '—'}</td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-foreground">{s.points_total}</td>
                    <td className="py-2 px-2 text-right text-xs text-foreground-secondary hidden sm:table-cell">{s.wins}</td>
                    <td className="py-2 px-2 text-right text-xs text-foreground-quiet hidden sm:table-cell">{s.starts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-foreground-quiet">No standings data available.</p>
        )}
        {standingsImpact.full_standings_count > leaders.length && (
          <p className="text-xs text-foreground-quiet mt-3">Showing top {leaders.length} of {standingsImpact.full_standings_count} championship positions.</p>
        )}
      </section>
    </div>
  );
}