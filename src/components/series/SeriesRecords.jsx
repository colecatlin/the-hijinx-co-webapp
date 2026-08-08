import React from 'react';
import { Link } from 'react-router-dom';
import { Award, TrendingUp } from 'lucide-react';

export default function SeriesRecords({ records }) {
  if (!records) return null;

  const sections = [
    { key: 'most_championships', label: 'Most Championships', icon: Award },
    { key: 'most_wins', label: 'Most Wins', icon: TrendingUp },
    { key: 'most_podiums', label: 'Most Podiums', icon: TrendingUp },
    { key: 'most_starts', label: 'Most Starts', icon: TrendingUp },
    { key: 'most_top5', label: 'Most Top 5s', icon: TrendingUp },
    { key: 'most_points', label: 'Most Points', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-surface-elevated border border-divider rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-motion" />
          <h2 className="text-xl font-bold text-foreground">Series Records</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(section => {
            const data = records[section.key];
            if (!data || data.length === 0) return null;
            return (
              <div key={section.key} className="border border-divider rounded-lg p-4">
                <div className="text-xs font-mono uppercase tracking-widest text-foreground-quiet mb-3">{section.label}</div>
                <div className="space-y-2">
                  {data.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-foreground-quiet flex-shrink-0">#{idx + 1}</span>
                        {entry.racer?.profile_url ? (
                          <Link to={entry.racer.profile_url} className="text-sm font-medium text-foreground hover:text-motion transition-colors truncate">{entry.racer.display_name}</Link>
                        ) : (
                          <span className="text-sm font-medium text-foreground truncate">{entry.racer?.display_name || 'N/A'}</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-motion flex-shrink-0">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {records.coverage && (
          <div className="text-xs text-foreground-quiet mt-4 italic">{records.coverage.note}</div>
        )}
      </div>

      {/* Team and manufacturer records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.most_successful_team && records.most_successful_team.length > 0 && (
          <div className="bg-surface-elevated border border-divider rounded-lg p-6">
            <div className="text-xs font-mono uppercase tracking-widest text-foreground-quiet mb-3">Most Successful Teams</div>
            <div className="space-y-2">
              {records.most_successful_team.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-foreground-quiet flex-shrink-0">#{idx + 1}</span>
                    {entry.team?.profile_url ? (
                      <Link to={entry.team.profile_url} className="text-sm font-medium text-foreground hover:text-motion transition-colors truncate">{entry.team.name}</Link>
                    ) : (
                      <span className="text-sm font-medium text-foreground truncate">{entry.team?.name || 'N/A'}</span>
                    )}
                  </div>
                  <span className="text-sm text-foreground-quiet flex-shrink-0">{entry.wins}W · {entry.podiums}P</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {records.most_successful_manufacturer && records.most_successful_manufacturer.length > 0 && (
          <div className="bg-surface-elevated border border-divider rounded-lg p-6">
            <div className="text-xs font-mono uppercase tracking-widest text-foreground-quiet mb-3">Most Successful Manufacturers</div>
            <div className="space-y-2">
              {records.most_successful_manufacturer.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{entry.manufacturer}</span>
                  <span className="text-sm text-foreground-quiet">{entry.wins}W · {entry.podiums}P</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}