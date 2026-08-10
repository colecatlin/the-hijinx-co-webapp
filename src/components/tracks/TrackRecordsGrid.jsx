import React from 'react';
import { Trophy, Flag, Users, Car, Award } from 'lucide-react';

function RecordRow({ label, icon: Icon, items, valueKey = 'value' }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-motion" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">{label}</h3>
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: 'hsl(var(--surface-interactive) / 0.4)' }}>
            <span className="text-sm text-foreground truncate">
              {item.racer?.display_name || item.team?.name || item.manufacturer || '—'}
            </span>
            <span className="text-sm font-bold text-motion ml-2 flex-shrink-0">{item[valueKey] ?? item.wins ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrackRecordsGrid({ records = {} }) {
  if (!records || Object.keys(records).length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-divider rounded-lg">
        <Trophy className="w-8 h-8 mx-auto mb-2 text-foreground-quiet" />
        <p className="text-sm text-foreground-quiet">No records computed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lap Records */}
      {records.lap_records?.fastest_lap && (
        <div className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--motion) / 0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-motion" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-motion">Fastest Lap Record</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{records.lap_records.fastest_lap.racer?.display_name || 'Unknown'}</p>
              <p className="text-xs text-foreground-quiet">{records.lap_records.fastest_lap.event_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-motion">
                {records.lap_records.fastest_lap.lap_time_ms ? `${(records.lap_records.fastest_lap.lap_time_ms / 1000).toFixed(3)}s` : '—'}
              </p>
              <p className="text-[10px] font-mono text-foreground-quiet">{records.lap_records.fastest_lap.session_type || ''}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecordRow label="Most Wins" icon={Trophy} items={records.most_wins} />
        <RecordRow label="Most Starts" icon={Flag} items={records.most_starts} />
        <RecordRow label="Most Podiums" icon={Award} items={records.most_podiums} />
        <RecordRow label="Most Championships" icon={Trophy} items={records.most_championships} />
        <RecordRow label="Best Avg Finish" icon={Users} items={records.best_average_finish} />
        <RecordRow label="Top Teams" icon={Flag} items={records.most_successful_team} valueKey="wins" />
      </div>

      {/* Manufacturer Trends */}
      {records.most_successful_manufacturer?.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Car className="w-3.5 h-3.5 text-motion" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">Manufacturer Trends</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {records.most_successful_manufacturer.map((mfr, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg border border-divider text-sm" style={{ background: 'hsl(var(--surface-interactive) / 0.4)' }}>
                <span className="font-semibold text-foreground">{mfr.manufacturer}</span>
                <span className="text-foreground-quiet ml-2 text-xs">{mfr.wins}W · {mfr.podiums}P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.coverage && (
        <p className="text-[10px] font-mono text-foreground-quiet pt-2 border-t border-divider">
          Coverage: {records.coverage.based_on_results} results · {records.coverage.based_on_standings} standings
        </p>
      )}
    </div>
  );
}