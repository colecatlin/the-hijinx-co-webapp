import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Runs recorded in the app, mirroring what was written into the workbook's
 * Import Log. This exists so a failed write is visible here too — a reporting
 * layer that fails silently would reproduce the problem it was built to cure.
 */
export default function WorkbookRecentRuns({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <section className="rounded-lg border border-divider bg-surface p-4 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Recent runs</h2>
        <p className="text-xs text-foreground-quiet">
          No import has reported yet. The next import to finish will appear here and in the workbook.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-divider bg-surface p-4 space-y-3">
      <h2 className="text-sm font-bold text-foreground">Recent runs</h2>
      <ul className="divide-y divide-divider">
        {runs.map((run) => {
          const failed = run.status === 'failed';
          return (
            <li key={run.id} className="flex items-start gap-2 py-2">
              {failed
                ? <AlertTriangle className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-danger" />
                : <CheckCircle2 className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-success" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {run.function_name || run.operation_type}
                </p>
                <p className="break-words text-[10px] text-foreground-quiet">
                  {run.created_date} · {run.message || run.status}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}