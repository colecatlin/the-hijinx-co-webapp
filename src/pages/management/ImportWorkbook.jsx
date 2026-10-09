import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import WorkbookConnectPanel from '@/components/management/importsheet/WorkbookConnectPanel';
import WorkbookImportPanel from '@/components/management/importsheet/WorkbookImportPanel';
import WorkbookTabStatus from '@/components/management/importsheet/WorkbookTabStatus';
import WorkbookRecentRuns from '@/components/management/importsheet/WorkbookRecentRuns';
import WorkbookDailySyncPanel from '@/components/management/importsheet/WorkbookDailySyncPanel';

/**
 * Import Workbook — the six record tabs are the import templates.
 *
 * Type rows into the tabs in the workbook, then Check or Import here. One pass
 * covers every tab, so adding racers, teams, tracks, series, events and
 * organizations no longer means running several separate imports.
 */
export default function ImportWorkbook() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyTab, setBusyTab] = useState('');
  const [runMode, setRunMode] = useState('');
  const [runResult, setRunResult] = useState(null);
  // A run stops after this many rows per tab so a large tab can be worked
  // through in passes instead of one request that would never finish.
  const [batchSize, setBatchSize] = useState(150);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['importSheetConfig'],
    queryFn: () => base44.entities.ImportSheetConfig.filter({ is_active: true }),
  });
  const config = (configs && configs[0]) || null;

  const { data: runs } = useQuery({
    queryKey: ['importSheetRuns'],
    queryFn: async () => {
      const rows = await base44.entities.OperationLog.list('-created_date', 100);
      return (rows || [])
        .filter((r) => r.operation_type === 'import_sheet_report' || r.operation_type === 'import_sheet_write_failed')
        .slice(0, 12);
    },
  });

  const errorText = (err) => (err && err.response && err.response.data && err.response.data.error) || (err && err.message) || 'Something went wrong.';

  const handleConnect = async (url) => {
    setError('');
    setBusy(true);
    try {
      await base44.functions.invoke('importSheetSetup', url
        ? { spreadsheet_url: url }
        : { spreadsheet_id: config.spreadsheet_id });
      await queryClient.invalidateQueries({ queryKey: ['importSheetConfig'] });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async (tab) => {
    setError('');
    setBusyTab(tab);
    try {
      await base44.functions.invoke('importSheetRefresh', { tab });
      await queryClient.invalidateQueries({ queryKey: ['importSheetConfig'] });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyTab('');
    }
  };

  const handleRun = async (mode) => {
    setError('');
    setRunMode(mode);
    setRunResult(null);
    try {
      const res = await base44.functions.invoke('importFromWorkbook', { mode, limit: batchSize });
      setRunResult(res.data);
      await queryClient.invalidateQueries({ queryKey: ['importSheetConfig'] });
      await queryClient.invalidateQueries({ queryKey: ['importSheetRuns'] });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRunMode('');
    }
  };

  return (
    <ManagementLayout currentPage="management/platform/import-workbook">
      <AdminGuard>
        <ManagementShell
          title="Import Workbook"
          subtitle="The six record tabs are the import templates — type rows into them and pull every tab in with one action"
        >
          {isLoading ? (
            <p className="text-xs text-foreground-quiet">Loading workbook configuration…</p>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{error}</div>
              ) : null}

              <WorkbookConnectPanel config={config} busy={busy} onConnect={handleConnect} />

              {config ? (
                <>
                  <WorkbookImportPanel
                    ready={!!config}
                    busy={runMode}
                    result={runResult}
                    onRun={handleRun}
                    batchSize={batchSize}
                    onBatchSizeChange={setBatchSize}
                  />
                  <WorkbookDailySyncPanel ready={!!config} />
                  <WorkbookTabStatus config={config} busyTab={busyTab} onRefresh={handleRefresh} />
                  <WorkbookRecentRuns runs={runs} />
                  <p className="text-[10px] text-foreground-quiet">
                    Rows you type into a tab stay there. An import only writes the platform columns beside
                    each row — the Read Me tab in the workbook explains the rest.
                  </p>
                </>
              ) : (
                <p className="text-xs text-foreground-quiet">
                  Connect a workbook to build the six record templates.
                </p>
              )}
            </div>
          )}
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}