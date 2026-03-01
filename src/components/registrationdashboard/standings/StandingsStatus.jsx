import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function StandingsStatus({
  standings,
  results,
  sessions,
  selectedClass,
}) {
  const statusInfo = useMemo(() => {
    if (standings.length === 0) {
      return {
        lastUpdated: null,
        needsRecalc: false,
        hasTies: false,
      };
    }

    const latestStanding = standings.reduce((latest, current) => {
      if (!latest.last_calculated) return current;
      if (!current.last_calculated) return latest;
      return new Date(current.last_calculated) >
        new Date(latest.last_calculated)
        ? current
        : latest;
    });

    // Check for newer official results
    const officialSessions = sessions.filter((s) =>
      ['Official', 'Locked'].includes(s.status)
    );

    const newerResults = results.filter((r) => {
      const resultSession = sessions.find((s) => s.id === r.session_id);
      if (!resultSession || !['Official', 'Locked'].includes(resultSession.status)) {
        return false;
      }
      if (!latestStanding.last_calculated) return true;
      return new Date(r.updated_date) > new Date(latestStanding.last_calculated);
    });

    // Check for ties
    const pointGroups = {};
    standings.forEach((s) => {
      const pts = s.total_points || 0;
      pointGroups[pts] = (pointGroups[pts] || 0) + 1;
    });
    const hasTies = Object.values(pointGroups).some((count) => count > 1);

    return {
      lastUpdated: latestStanding.last_calculated,
      needsRecalc: newerResults.length > 0,
      hasTies,
    };
  }, [standings, results, sessions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Last Updated */}
      <Card className="bg-[#262626] border-gray-700">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Last Updated
              </p>
              <p className="text-sm text-white mt-1">
                {statusInfo.lastUpdated
                  ? format(new Date(statusInfo.lastUpdated), 'MMM d, HH:mm')
                  : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recalculation Needed */}
      <Card
        className={`border-gray-700 ${
          statusInfo.needsRecalc ? 'bg-orange-900/30' : 'bg-[#262626]'
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                statusInfo.needsRecalc ? 'text-orange-500' : 'text-gray-500'
              }`}
            />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Status
              </p>
              <p className="text-sm text-white mt-1">
                {statusInfo.needsRecalc
                  ? 'Recalculation needed'
                  : 'Up to date'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tie Breaker Warning */}
      <Card
        className={`border-gray-700 ${
          statusInfo.hasTies ? 'bg-yellow-900/30' : 'bg-[#262626]'
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                statusInfo.hasTies ? 'text-yellow-500' : 'text-gray-500'
              }`}
            />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Tie Breaker
              </p>
              <p className="text-sm text-white mt-1">
                {statusInfo.hasTies
                  ? 'Ties detected'
                  : 'No ties'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}