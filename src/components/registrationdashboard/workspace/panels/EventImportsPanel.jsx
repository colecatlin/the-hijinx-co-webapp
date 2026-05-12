/**
 * R8H Part 4 — EventImportsPanel
 * Thin adapter that bridges CSVImportManager into the EventFile workspace.
 * Pulls context from useEventWorkspace() and passes expected props.
 * Ensures dashboardContext.season is populated from selectedEvent.season
 * so runStandingsImport resolves season_year correctly.
 * Does NOT modify CSVImportManager.
 */
import React, { useMemo } from 'react';
import { Upload } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import CSVImportManager from '../../CSVImportManager';

export default function EventImportsPanel() {
  const {
    selectedEvent,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    invalidateAfterOperation,
    eventPermissions,
    isAdmin,
  } = useEventWorkspace();

  // ── dashboardContext safety ────────────────────────────────────────────────
  // CSVImportManager uses dashboardContext?.season for standings season_year
  // and for standings cache invalidation. Ensure it is always populated from
  // selectedEvent.season when operating inside EventFile (where dashboardContext
  // may not carry season independently).
  // IMPORTANT: this hook must be called before any early return (rules-of-hooks).
  const adaptedDashboardContext = useMemo(() => {
    if (!dashboardContext) {
      return {
        eventId: selectedEvent?.id,
        season: selectedEvent?.season || new Date().getFullYear().toString(),
        series_id: selectedSeries?.id || null,
      };
    }
    // Merge: existing dashboardContext wins on all other keys, but season falls
    // back to selectedEvent.season if not already set.
    return {
      ...dashboardContext,
      season: dashboardContext.season || selectedEvent?.season || new Date().getFullYear().toString(),
    };
  }, [dashboardContext, selectedEvent?.id, selectedEvent?.season, selectedSeries?.id]);

  // ── Permission gate ────────────────────────────────────────────────────────
  const canViewImports =
    isAdmin ||
    eventPermissions?.canViewImports === true ||
    eventPermissions?.canManageEntries === true ||
    eventPermissions?.canManageResults === true ||
    eventPermissions?.canManageStandings === true;

  if (!canViewImports) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Upload className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">Your access does not include Imports.</p>
      </div>
    );
  }

  return (
    <CSVImportManager
      selectedEvent={selectedEvent}
      selectedSeries={selectedSeries}
      dashboardContext={adaptedDashboardContext}
      dashboardPermissions={dashboardPermissions}
      invalidateAfterOperation={invalidateAfterOperation}
    />
  );
}