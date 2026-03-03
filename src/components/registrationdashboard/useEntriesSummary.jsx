/**
 * Hook to compute Entry summary stats for Overview card
 */

import { useMemo } from 'react';

export function useEntriesSummary(entries) {
  return useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        total: 0,
        checkedIn: 0,
        teched: 0,
        withdrawn: 0,
        unpaid: 0,
      };
    }

    return {
      total: entries.length,
      checkedIn: entries.filter(e => e.entry_status === 'Checked In').length,
      teched: entries.filter(e => e.entry_status === 'Teched').length,
      withdrawn: entries.filter(e => e.entry_status === 'Withdrawn').length,
      unpaid: entries.filter(e => e.payment_status === 'Unpaid').length,
    };
  }, [entries]);
}