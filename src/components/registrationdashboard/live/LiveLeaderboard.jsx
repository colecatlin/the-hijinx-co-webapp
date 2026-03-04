/**
 * Live Leaderboard component with real-time polling
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { computeLeaderboard, getStatusLabel, getStatusColor } from './computeLeaderboard';

const DQ = applyDefaultQueryOptions();

export default function LiveLeaderboard({
  session,
  entries = [],
  results = [],
  drivers = [],
  teams = [],
}) {
  const queryClient = useQueryClient();
  const [pollInterval, setPollInterval] = useState(5000);

  const eventId = session?.event_id;
  const sessionId = session?.id;

  // Determine if polling should be active
  const shouldPoll = session && ['Draft', 'Provisional'].includes(session.status);

  // Fetch results with polling
  const { data: liveResults = [] } = useQuery({
    queryKey: ['liveResults', eventId, sessionId],
    queryFn: () =>
      sessionId
        ? base44.entities.Results.filter({ event_id: eventId, session_id: sessionId }).catch(() => [])
        : Promise.resolve([]),
    enabled: !!eventId && !!sessionId,
    refetchInterval: shouldPoll ? pollInterval : false,
    ...DQ,
  });

  // Compute leaderboard from live data
  const leaderboard = useMemo(() => {
    return computeLeaderboard({
      session,
      resultsList: liveResults,
      entriesList: entries,
      drivers,
      teams,
    });
  }, [session, liveResults, entries, drivers, teams]);

  // Guard
  if (!session || !sessionId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8 text-center">
          <p className="text-gray-400">No session selected</p>
        </CardContent>
      </Card>
    );
  }

  const isLive = ['Draft', 'Provisional'].includes(session.status);
  const sessionLabel = `${session.class_name || 'Unknown'} – ${session.session_type || 'Session'}`;

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-sm">{sessionLabel}</CardTitle>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-red-400">LIVE</span>
              </div>
            )}
          </div>
          {isLive && (
            <span className="text-xs text-gray-500">Updates every 5s</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {leaderboard.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="w-5 h-5 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No results yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wide bg-[#1a1a1a]">
                  <th className="text-left px-3 py-2 w-8">Pos</th>
                  <th className="text-left px-3 py-2 w-12">Car</th>
                  <th className="text-left px-3 py-2 flex-1">Driver</th>
                  <th className="text-left px-3 py-2 flex-1">Team</th>
                  <th className="text-right px-3 py-2 w-16">Laps</th>
                  <th className="text-right px-3 py-2 w-24">Best Lap</th>
                  <th className="text-right px-3 py-2 w-20">Interval</th>
                  <th className="text-right px-3 py-2 w-20">Gap</th>
                  <th className="text-left px-3 py-2 w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {leaderboard.map((row, idx) => (
                  <tr key={row.result_id || idx} className="hover:bg-[#1e1e1e] transition-colors">
                    {/* Position */}
                    <td className="px-3 py-2 text-white font-semibold">
                      {row.position_computed}
                    </td>

                    {/* Car Number */}
                    <td className="px-3 py-2 text-white font-medium">
                      {row.car_number}
                    </td>

                    {/* Driver Name */}
                    <td className="px-3 py-2 text-gray-300">
                      {row.driver_name}
                    </td>

                    {/* Team */}
                    <td className="px-3 py-2 text-gray-500 truncate">
                      {row.team_name}
                    </td>

                    {/* Laps */}
                    <td className="px-3 py-2 text-right text-white">
                      {row.laps_completed || 0}
                    </td>

                    {/* Best Lap */}
                    <td className="px-3 py-2 text-right text-gray-400">
                      {row.best_lap_time_ms ? formatLapTime(row.best_lap_time_ms) : '—'}
                    </td>

                    {/* Interval */}
                    <td className="px-3 py-2 text-right text-gray-400">
                      {row.interval}
                    </td>

                    {/* Gap */}
                    <td className="px-3 py-2 text-right text-gray-400">
                      {row.gap}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-left">
                      <Badge className={`text-xs ${getStatusColor(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format lap time in MM:SS.mmm format
 */
function formatLapTime(ms) {
  if (!ms || ms === Infinity) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(Math.floor(millis / 10)).padStart(2, '0')}`;
}