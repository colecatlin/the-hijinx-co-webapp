import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Clock, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, parseISO, isValid } from 'date-fns';

function ResultRow({ result, showGap, fastestLapMs }) {
  const gap = showGap && fastestLapMs && result.best_lap_time_ms ? `+${(result.best_lap_time_ms - fastestLapMs).toFixed(3)}s` : null;
  return (
    <tr className="border-b border-divider/60 hover:bg-surface-interactive/50">
      <td className="py-2 px-2 font-mono font-bold text-motion w-12">{result.position ? `P${result.position}` : '—'}</td>
      <td className="py-2 px-2 text-sm">
        <Link to={result.racer?.profile_url || '#'} className="font-medium text-foreground hover:text-motion transition-colors">
          {result.car_number && <span className="text-motion font-mono text-xs mr-1">#{result.car_number}</span>}
          {result.racer?.display_name || 'Unknown'}
        </Link>
      </td>
      <td className="py-2 px-2 text-xs text-foreground-secondary hidden md:table-cell">{result.team?.name || '—'}</td>
      <td className="py-2 px-2 text-xs text-foreground-quiet hidden lg:table-cell">{result.vehicle?.manufacturer || '—'}</td>
      <td className="py-2 px-2 text-right text-xs font-mono text-foreground-secondary">
        {result.best_lap_time_ms ? `${(result.best_lap_time_ms / 1000).toFixed(3)}s` : '—'}
        {gap && <div className="text-[10px] text-foreground-quiet">{gap}</div>}
      </td>
      <td className="py-2 px-2 text-right text-xs">
        {result.points ? <span className="font-mono text-motion">{result.points}</span> : <span className="text-foreground-quiet">—</span>}
      </td>
      <td className="py-2 px-2 text-right">
        {result.status && result.status !== 'Running' && <Badge className="bg-warning/15 text-warning text-[10px]">{result.status}</Badge>}
      </td>
    </tr>
  );
}

function SessionResultsTable({ session }) {
  const fastestLap = session.results?.reduce((min, r) => (r.best_lap_time_ms && (!min || r.best_lap_time_ms < min)) ? r.best_lap_time_ms : min, null);
  return (
    <div className="bg-surface border border-divider rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{session.name}</h3>
          {session.class_name && <span className="text-xs text-foreground-quiet">{session.class_name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={session.status === 'Official' || session.status === 'Locked' ? 'bg-success/15 text-success' : 'bg-surface-interactive text-foreground-quiet'}>{session.status}</Badge>
          {session.results_count > 0 && <span className="text-xs text-foreground-quiet">{session.results_count} results</span>}
        </div>
      </div>
      {session.results && session.results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-divider">
              <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Pos</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Racer</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet hidden md:table-cell">Team</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet hidden lg:table-cell">Vehicle</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Best Lap</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Pts</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Status</th>
            </tr></thead>
            <tbody>
              {session.results.map(r => <ResultRow key={r.result_id} result={r} fastestLapMs={fastestLap} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-foreground-quiet py-4 text-center">No results published for this session.</p>
      )}
    </div>
  );
}

export default function EventResultsView({ sessions, qualifying, heat_feature_results }) {
  const raceSessions = (heat_feature_results || []).filter(s => ['Heat', 'LCQ', 'Feature', 'Final'].includes(s.session_type));
  const featureSessions = raceSessions.filter(s => ['Feature', 'Final'].includes(s.session_type));
  const heatSessions = raceSessions.filter(s => s.session_type === 'Heat');
  const lcqSessions = raceSessions.filter(s => s.session_type === 'LCQ');

  if ((!sessions || sessions.length === 0) && (!qualifying || qualifying.length === 0) && (!heat_feature_results || heat_feature_results.length === 0)) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <Trophy className="w-8 h-8 text-foreground-quiet mx-auto mb-3" />
        <p className="text-sm text-foreground-quiet">No results have been published yet for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Sessions</TabsTrigger>
          {qualifying && qualifying.length > 0 && <TabsTrigger value="qualifying">Qualifying</TabsTrigger>}
          {heatSessions.length > 0 && <TabsTrigger value="heats">Heats</TabsTrigger>}
          {featureSessions.length > 0 && <TabsTrigger value="features">Features</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {sessions && sessions.length > 0 ? (
            sessions.map(s => <SessionResultsTable key={s.session_id} session={s} />)
          ) : (
            <p className="text-sm text-foreground-quiet">No sessions available.</p>
          )}
        </TabsContent>

        {qualifying && qualifying.length > 0 && (
          <TabsContent value="qualifying" className="space-y-3">
            {qualifying.map(q => {
              const fastestLap = q.results?.reduce((min, r) => (r.best_lap_time_ms && (!min || r.best_lap_time_ms < min)) ? r.best_lap_time_ms : min, null);
              return (
                <div key={q.session_id} className="bg-surface border border-divider rounded-lg p-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">{q.class_name || 'Qualifying'}</h3>
                  {q.results && q.results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-divider">
                          <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Pos</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet">Racer</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-foreground-quiet hidden md:table-cell">Team</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Best Lap</th>
                          <th className="text-right py-2 px-2 text-xs font-semibold text-foreground-quiet">Gap</th>
                        </tr></thead>
                        <tbody>
                          {q.results.map(r => (
                            <tr key={r.result_id} className="border-b border-divider/60 hover:bg-surface-interactive/50">
                              <td className="py-2 px-2 font-mono font-bold text-motion w-12">P{r.position}</td>
                              <td className="py-2 px-2 text-sm">
                                <Link to={r.racer?.profile_url || '#'} className="font-medium text-foreground hover:text-motion">
                                  {r.car_number && <span className="text-motion font-mono text-xs mr-1">#{r.car_number}</span>}
                                  {r.racer?.display_name || 'Unknown'}
                                </Link>
                              </td>
                              <td className="py-2 px-2 text-xs text-foreground-secondary hidden md:table-cell">{r.team?.name || '—'}</td>
                              <td className="py-2 px-2 text-right text-xs font-mono text-foreground-secondary">
                                {r.best_lap_time_ms ? `${(r.best_lap_time_ms / 1000).toFixed(3)}s` : '—'}
                              </td>
                              <td className="py-2 px-2 text-right text-xs font-mono text-foreground-quiet">
                                {r.gap_to_leader_ms === 0 ? '—' : `+${(r.gap_to_leader_ms / 1000).toFixed(3)}s`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-foreground-quiet">No qualifying results.</p>}
                </div>
              );
            })}
          </TabsContent>
        )}

        {heatSessions.length > 0 && (
          <TabsContent value="heats" className="space-y-3">
            {heatSessions.map(s => <SessionResultsTable key={s.session_id} session={s} />)}
          </TabsContent>
        )}

        {featureSessions.length > 0 && (
          <TabsContent value="features" className="space-y-3">
            {featureSessions.map(s => <SessionResultsTable key={s.session_id} session={s} />)}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}