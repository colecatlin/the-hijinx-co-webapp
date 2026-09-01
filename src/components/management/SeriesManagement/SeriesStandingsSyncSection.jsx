import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Trophy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import StandingsEditableRow from './StandingsEditableRow';

export default function SeriesStandingsSyncSection({ seriesId }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [showAddRow, setShowAddRow] = useState(false);

  const { data: series } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  const { canEditManagement } = useEntityEditPermission('Series', seriesId, series);

  const { data: standings = [], isLoading: loadingStandings, refetch } = useQuery({
    queryKey: ['driverStandings', seriesId, seasonYear],
    queryFn: () => base44.entities.DriverStanding.filter({ series_id: seriesId, season_year: seasonYear }, 'position', 100),
    enabled: !!seriesId,
  });

  // Driver list for the combobox — cached, only loaded when admin
  const { data: drivers = [] } = useQuery({
    queryKey: ['driversList'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    enabled: !!seriesId && canEditManagement,
    staleTime: 5 * 60 * 1000,
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
  const sorted = [...standings].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  const headers = ['POS', 'Driver', 'NO.', 'MFR', 'Points', 'Stage Pts', 'Behind', 'Starts', 'Wins', 'Top 5', 'Top 10', 'DNFs', 'Laps Led'];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Driver Standings Sync
            </h3>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Pulls live standings data from the configured web URL and upserts records for the {seasonYear} season.
            </p>
            {series?.standings_url ? (
              <a href={series.standings_url} target="_blank" rel="noopener noreferrer"
                className="text-xs hover:underline mt-1 block truncate max-w-sm"
                style={{ color: 'hsl(var(--motion))' }}>
                {series.standings_url}
              </a>
            ) : (
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--warning))' }}>⚠ No Standings Web URL configured — go to the Core tab to add one.</p>
            )}
            {lastSynced && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
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
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${lastResult.status === 'ok' ? '' : ''}`}
            style={lastResult.status === 'ok'
              ? { background: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' }
              : { background: 'hsl(var(--danger) / 0.12)', color: 'hsl(var(--danger))' }}>
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
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'hsl(var(--surface-interactive))' }} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Toolbar: season selector + Add Row */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--divider))' }}>
            <div className="flex items-center gap-2">
              <select
                value={seasonYear}
                onChange={e => setSeasonYear(Number(e.target.value))}
                className="text-sm rounded-md border px-2 py-1.5 outline-none"
                style={{
                  borderColor: 'hsl(var(--divider))',
                  background: 'hsl(var(--surface-elevated))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {canEditManagement && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddRow(true)}
                disabled={showAddRow}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Row
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'hsl(var(--surface-interactive))' }}>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--divider))' }}>
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'hsl(var(--foreground-quiet))' }}>{h}</th>
                  ))}
                  {canEditManagement && <th className="px-3 py-2.5" style={{ width: 80 }} />}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'hsl(var(--divider))' }}>
                {sorted.length === 0 && !showAddRow && (
                  <tr>
                    <td colSpan={canEditManagement ? headers.length + 1 : headers.length} className="px-3 py-8 text-center">
                      <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: 'hsl(var(--divider))' }} />
                      <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No standings data yet for {seasonYear}.</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                        {canEditManagement ? 'Click "Add Row" to enter points manually, or "Sync Now" to pull from a URL.' : 'Click "Sync Now" to pull the latest standings.'}
                      </p>
                    </td>
                  </tr>
                )}
                {sorted.map(s => (
                  <StandingsEditableRow
                    key={s.id}
                    standing={s}
                    seriesId={seriesId}
                    seasonYear={seasonYear}
                    canEdit={canEditManagement}
                    drivers={drivers}
                  />
                ))}
                {showAddRow && canEditManagement && (
                  <StandingsEditableRow
                    standing={null}
                    seriesId={seriesId}
                    seasonYear={seasonYear}
                    canEdit={canEditManagement}
                    drivers={drivers}
                    isNew
                    onDone={() => setShowAddRow(false)}
                  />
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}