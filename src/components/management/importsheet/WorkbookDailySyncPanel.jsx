import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * WorkbookDailySyncPanel — manual trigger for the daily workbook sync.
 *
 * The sync runs automatically every day at 10am UTC via the Daily Workbook
 * Sync workflow. This panel lets an admin run it on demand and see the result.
 * It runs the import (workbook → platform) then the outbound sync
 * (platform → workbook), using RaceCore IDs as the authoritative identifier.
 */
export default function WorkbookDailySyncPanel({ ready }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSync = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      // Step 1: Import new workbook rows into the platform
      const importRes = await base44.functions.invoke('runDailyWorkbookImport', { limit: 100 });
      const importData = importRes.data;

      // Step 2: Sync platform records back to the workbook
      const syncRes = await base44.functions.invoke('syncPlatformToWorkbook', {});
      const syncData = syncRes.data;

      setResult({ import: importData, sync: syncData });
    } catch (err) {
      setError(
        (err && err.response && err.response.data && err.response.data.error) ||
        (err && err.message) ||
        'The sync could not complete.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="rounded-lg border border-divider bg-surface-elevated p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-motion" />
            Daily Workbook Sync
          </h3>
          <p className="text-xs text-foreground-quiet mt-1">
            Runs automatically every day at 10am UTC. Import new workbook rows into the platform,
            then sync platform records back — using RaceCore IDs to prevent duplicates.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={busy}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap"
          style={{
            background: busy ? 'hsl(var(--surface-interactive))' : 'hsl(var(--motion))',
            color: busy ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--canvas))',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <RefreshCw className={'w-3.5 h-3.5 ' + (busy ? 'animate-spin' : '')} />
          {busy ? 'Syncing…' : 'Run Sync Now'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-2.5 text-xs text-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div>
                <span className="font-semibold">Import:</span>{' '}
                {result.import.counts.created} created,{' '}
                {result.import.counts.skipped} skipped,{' '}
                {result.import.counts.failed} failed
              </div>
              <div>
                <span className="font-semibold">Outbound sync:</span>{' '}
                {result.sync.counts.synced} updated,{' '}
                {result.sync.counts.appended} appended,{' '}
                {result.sync.counts.ids_assigned} IDs assigned,{' '}
                {result.sync.counts.skipped} skipped
              </div>
            </div>
          </div>
          {result.sync.problems && result.sync.problems.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-foreground-secondary space-y-1">
              <p className="font-semibold">{result.sync.problems.length} flag(s) for review:</p>
              {result.sync.problems.slice(0, 5).map((p, i) => (
                <p key={i} className="text-foreground-quiet">
                  {p.reference}: {p.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}