import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StandingsStatusCard({ standings, results }) {
  const latestStanding = standings && standings.length > 0
    ? standings.reduce((latest, current) =>
        new Date(current.last_calculated || 0) > new Date(latest.last_calculated || 0)
          ? current
          : latest
      )
    : null;

  const lastCalculated = latestStanding?.last_calculated
    ? new Date(latestStanding.last_calculated).toLocaleDateString()
    : 'Unknown';

  const needsRecalc = latestStanding && results && results.length > 0
    ? results.some(r => new Date(r.updated_date || 0) > new Date(latestStanding.last_calculated || 0))
    : false;

  const status = standings && standings.length > 0
    ? needsRecalc ? 'Needs Recalc' : 'Current'
    : 'Not Calculated';

  const statusColor = status === 'Current'
    ? 'bg-green-500/20 text-green-400'
    : status === 'Needs Recalc'
    ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-gray-500/20 text-gray-400';

  return (
    <Card className="bg-[#171717] border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Standings Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="text-xs text-gray-400">Last Updated</div>
            <div className="text-xs text-gray-300 text-right">{lastCalculated}</div>
          </div>
          {standings && standings.length > 0 && (
            <div className="flex justify-between items-start">
              <div className="text-xs text-gray-400">Entries</div>
              <div className="text-xs text-gray-300">{standings.length}</div>
            </div>
          )}
          <div className="pt-3 border-t border-gray-700">
            <Badge className={statusColor}>{status}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}