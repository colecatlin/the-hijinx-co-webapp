import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, ScanSearch, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * One action for the whole workbook: Check reads every tab and reports what
 * would happen without writing anything; Import does it and stamps each row in
 * place. The tab-by-tab result is the answer to "what is waiting?".
 */
export default function WorkbookImportPanel({ ready, busy, result, onRun }) {
  const problems = (result && result.problems) || [];
  const tabs = (result && result.tabs) || [];

  return (
    <section className="rounded-lg border border-divider bg-surface p-4 space-y-3">
      <header className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-motion" />
        <h2 className="text-sm font-bold text-foreground">Import from the workbook</h2>
      </header>

      <p className="text-xs text-foreground-secondary">
        Every tab is read in one pass. A row that matches a record the platform already holds is
        skipped and flagged — never merged over. Rows you type into the tabs are the import.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onRun('check')} disabled={!ready || !!busy}>
          <ScanSearch className="mr-1 w-3.5 h-3.5" />
          {busy === 'check' ? 'Checking…' : 'Check'}
        </Button>
        <Button size="sm" onClick={() => onRun('import')} disabled={!ready || !!busy}>
          <Upload className="mr-1 w-3.5 h-3.5" />
          {busy === 'import' ? 'Importing…' : 'Import'}
        </Button>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-divider bg-surface-elevated p-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-foreground-quiet">
              {result.mode === 'check' ? 'Check result' : 'Import result'}
            </span>
            <span className="text-foreground">Read {result.counts?.read || 0}</span>
            <span className="text-motion">{result.mode === 'check' ? 'Would create' : 'Created'} {result.counts?.created || 0}</span>
            <span className="text-warning">Skipped {result.counts?.skipped || 0}</span>
            <span className="text-danger">Failed {result.counts?.failed || 0}</span>
          </div>

          {result.mode === 'check' ? (
            <p className="text-[10px] text-foreground-quiet">
              Nothing has been written — not to the platform, not to the sheet. Run Import to apply it.
            </p>
          ) : null}

          {tabs.length > 0 ? (
            <ul className="divide-y divide-divider rounded-md border border-divider">
              {tabs.map((t) => (
                <li key={t.tab} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">{t.tab}</span>
                  <span className="text-foreground-secondary">
                    {t.waiting || 0} waiting · <span className="text-motion">{t.created || 0} {result.mode === 'check' ? 'to create' : 'created'}</span> ·{' '}
                    <span className="text-warning">{t.skipped || 0} skipped</span>
                    {t.failed ? <span className="text-danger"> · {t.failed} failed</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {problems.length > 0 ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                <AlertTriangle className="w-3 h-3" />
                Flagged rows
              </p>
              <ul className="space-y-1">
                {problems.slice(0, 12).map((p, i) => (
                  <li key={i} className="rounded border border-divider bg-surface-elevated px-2 py-1 text-[11px] text-foreground-secondary">
                    <span className="font-mono text-[10px] text-foreground-quiet">{p.tab} · row {p.sheet_row}</span>
                    <span className="ml-2">{p.reason}</span>
                  </li>
                ))}
              </ul>
              {problems.length > 12 ? (
                <p className="text-[10px] text-foreground-quiet">
                  {problems.length - 12} more — they are all listed in the workbook’s Problems tab.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] text-success">
              <CheckCircle2 className="w-3 h-3" />
              Nothing was flagged.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}