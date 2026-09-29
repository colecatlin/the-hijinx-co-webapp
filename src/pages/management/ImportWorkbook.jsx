import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminGuard from '@/components/management/AdminGuard';
import WorkbookConnectPanel from '@/components/management/importsheet/WorkbookConnectPanel';
import WorkbookTabStatus from '@/components/management/importsheet/WorkbookTabStatus';
import WorkbookRecentRuns from '@/components/management/importsheet/WorkbookRecentRuns';

/**
 * Import Workbook — connect the master workbook and keep its detail tabs current.
 *
 * The workbook is written BY the platform and never read back: there is no
 * push, no import-from-sheet, and no approval gate. This page only connects it
 * and refreshes tabs on demand.
 */
export default function ImportWorkbook() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyTab, setBusyTab] = useState('');

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
      await base44.functions.invoke('importSheetSetup', { spreadsheet_url: url });
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

  return (
    <ManagementLayout currentPage="management/platform/import-workbook">
      <AdminGuard>
        <ManagementShell
          title="Import Workbook"
          subtitle="Every import reports into one master workbook — what came in, what was created, what was skipped and why"
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
                  <WorkbookTabStatus config={config} busyTab={busyTab} onRefresh={handleRefresh} />
                  <WorkbookRecentRuns runs={runs} />
                  <p className="text-[10px] text-foreground-quiet">
                    Reading and filtering happen in the workbook itself — Import Log,
                    Problems, the domain tabs and the reference tabs are all there.
                  </p>
                </>
              ) : null}
            </div>
          )}
        </ManagementShell>
      </AdminGuard>
    </ManagementLayout>
  );
}