import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/** Tab names are stable and must match the template definition exactly. */
export const DOMAIN_TABS = ['Racers', 'Teams', 'Organizations', 'Tracks', 'Series', 'Events'];

/**
 * Per-tab readiness. The waiting count comes from the last Check or Import, so
 * the page shows what is queued without re-reading the sheet on every visit.
 * Rebuilding a tab rewrites its header and notes only — typed rows are left alone.
 */
export default function WorkbookTabStatus({ config, busyTab, onRefresh }) {
  const state = (config && config.tab_refresh_state) || {};

  return (
    <section className="rounded-lg border border-divider bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">Template tabs</h2>
        <Button variant="outline" size="sm" onClick={() => onRefresh('all')} disabled={!!busyTab}>
          <RefreshCw className="mr-1 w-3 h-3" />
          Rebuild headers
        </Button>
      </div>

      <ul className="divide-y divide-divider">
        {DOMAIN_TABS.map((tab) => {
          const tabState = state[tab];
          const waiting = tabState && typeof tabState.waiting === 'number' ? tabState.waiting : null;
          return (
            <li key={tab} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{tab}</p>
                <p className="text-[10px] text-foreground-quiet">
                  {waiting === null
                    ? 'not checked yet'
                    : waiting + ' row' + (waiting === 1 ? '' : 's') + ' waiting'}
                  {tabState && tabState.checked_at ? ' · checked ' + tabState.checked_at : ''}
                  {tabState && tabState.last_run_name ? ' · last import ' + tabState.last_run_name : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(tab)}
                disabled={!!busyTab}
                className="text-[10px] uppercase tracking-wider"
              >
                {busyTab === tab ? 'Rebuilding…' : 'Rebuild'}
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-foreground-quiet">
        Rebuilding fixes a header or a dropdown. It rewrites row 1 and the notes row only — the rows you
        typed are never touched.
      </p>
    </section>
  );
}