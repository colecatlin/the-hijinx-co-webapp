import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';

/**
 * Connect / re-connect the master workbook.
 *
 * Only the EDITING link works — the published /pubhtml key is a separate,
 * read-only handle, so it is called out rather than silently rejected later.
 */
export default function WorkbookConnectPanel({ config, busy, onConnect }) {
  const [url, setUrl] = useState('');

  const submit = () => {
    if (!url.trim()) return;
    onConnect(url.trim());
  };

  return (
    <section className="rounded-lg border border-divider bg-surface p-4 space-y-3">
      <header className="flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-motion" />
        <h2 className="text-sm font-bold text-foreground">Workbook</h2>
      </header>

      {config ? (
        <div className="space-y-1 text-xs text-foreground-secondary">
          <p className="font-semibold text-foreground">{config.spreadsheet_title || 'Connected workbook'}</p>
          <p className="break-all font-mono text-[10px] text-foreground-quiet">{config.spreadsheet_id}</p>
          <p>Setup last run: {config.last_setup_at || '—'}</p>
          <p>Detail tabs last refreshed: {config.last_refresh_at || '—'}</p>
        </div>
      ) : (
        <p className="text-xs text-foreground-secondary">
          Paste the workbook&rsquo;s editing link — the one in the address bar while you are editing it.
          The published <span className="font-mono">/pubhtml</span> link is read-only and cannot be written to.
        </p>
      )}

      {config && config.last_write_error ? (
        <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          <AlertTriangle className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" />
          <span>Last write failed: {config.last_write_error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          className="text-xs"
        />
        <Button onClick={submit} disabled={busy || !url.trim()} size="sm" className="whitespace-nowrap">
          {busy ? 'Building…' : config ? 'Rebuild workbook' : 'Connect & build'}
        </Button>
      </div>
    </section>
  );
}