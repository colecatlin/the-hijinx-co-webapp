import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SeriesStandingsSyncSection({ seriesId }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const { data: series } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  const currentYear = new Date().getFullYear();

  const { data: standings = [], isLoading: loadingStandings, refetch } = useQuery({
    queryKey: ['driverStandings', seriesId, currentYear],
    queryFn: () => base44.entities.DriverStanding.filter({ series_id: seriesId, season_year: currentYear }, 'position', 50),
    enabled: !!seriesId,
  });

  const handleSync = async () => {
    if (!series?.standings_url) {
      toast.error('No Standings Web URL configured. Add one in the Core tab first.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await base44.functions.invoke('syncSeriesStandings', { series_id: seriesId });
      const result = res?.data?.results?.[0];
      setLastResult(result);
      if (result?.status === 'ok') {
        toast.success(`Sync complete — ${result.created} created, ${result.updated} updated`);
        refetch();
      } else {
        toast.error(result?.error || 'Sync failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const lastSynced = standings[0]?.last_synced_at;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Driver Standings Sync
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Pulls live standings data from the configured web URL and upserts records for the {currentYear} season.
            </p>
            {series?.standings_url ? (
              <a href={series.standings_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline mt-1 block truncate max-w-sm">
                {series.standings_url}
              </a>
            ) : (
              <p className="text-xs text-amber-600 mt-1">⚠ No Standings Web URL configured — go to the Core tab to add one.</p>
            )}
            {lastSynced && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last synced: {format(new Date(lastSynced), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          <Button onClick={handleSync} disabled={isSyncing || !series?.standings_url} className="flex-shrink-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {lastResult && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${lastResult.status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {lastResult.status === 'ok'
              ? <><CheckCircle2 className="w-4 h-4" /> {lastResult.created} created, {lastResult.updated} updated</>
              : <><AlertCircle className="w-4 h-4" /> {lastResult.error}</>
            }
          </div>
        )}
      </Card>

      {/* Standings table */}
      {loadingStandings ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : standings.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500 text-sm">No standings data yet for {currentYear}.</p>
          <p className="text-gray-400 text-xs mt-1">Click "Sync Now" to pull the latest standings.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['POS', 'Driver', 'NO.', 'MFR', 'Points', 'Stage Pts', 'Behind', 'Starts', 'Wins', 'Top 5', 'Top 10', 'DNFs', 'Laps Led'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-gray-800">{s.position ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{s.driver_name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.car_number || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.manufacturer || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{s.points?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.stage_points ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.behind ? `-${s.behind}` : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.starts ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.wins ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.top_5s ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.top_10s ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.dnfs ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.laps_led?.toLocaleString() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}