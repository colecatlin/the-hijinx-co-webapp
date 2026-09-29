import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/** Tab names are stable and must match the writer exactly. */
export const DOMAIN_TABS = ['Racers', 'Teams', 'Organizations', 'Tracks', 'Series', 'Events'];

/**
 * Per-tab freshness. Refreshing is also how a tab heals after a failed write —
 * the next successful refresh rebuilds it from the platform.
 */
export default function WorkbookTabStatus({ config, busyTab, onRefresh }) {
  const state = (config && config.tab_refresh_state) || {};

  return (
    <section className="rounded-lg border border-divider bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">Detail tabs</h2>
        <Button variant="outline" size="sm" onClick={() => onRefresh('all')} disabled={!!busyTab}>
          <RefreshCw className="mr-1 w-3 h-3" />
          Refresh all
        </Button>
      </div>

      <ul className="divide-y divide-divider">
        {DOMAIN_TABS.map((tab) => {
          const tabState = state[tab];
          return (
            <li key={tab} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{tab}</p>
                <p className="text-[10px] text-foreground-quiet">
                  {tabState
                    ? (tabState.rows || 0) + ' rows · ' + (tabState.refreshed_at || '')
                    : 'not refreshed yet'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefresh(tab)}
                disabled={!!busyTab}
                className="text-[10px] uppercase tracking-wider"
              >
                {busyTab === tab ? 'Refreshing…' : 'Refresh'}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}