/**
 * R8H Part 3 — EventExportsPanel
 * Thin adapter that bridges ExportsDataHub into the EventFile workspace.
 * Pulls context from useEventWorkspace() and passes expected props.
 * Does NOT modify ExportsDataHub.
 */
import React from 'react';
import { Download } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import ExportsDataHub from '../../ExportsDataHub';

export default function EventExportsPanel() {
  const {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    eventPermissions,
    isAdmin,
  } = useEventWorkspace();

  // ── Permission gate ────────────────────────────────────────────────────────
  const canViewExports =
    isAdmin ||
    eventPermissions?.canViewExports === true ||
    eventPermissions?.canManageEntries === true ||
    eventPermissions?.canManageResults === true ||
    eventPermissions?.canManageStandings === true;

  if (!canViewExports) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Download className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">Your access does not include Exports.</p>
      </div>
    );
  }

  return (
    <ExportsDataHub
      selectedEvent={selectedEvent}
      selectedTrack={selectedTrack}
      selectedSeries={selectedSeries}
      dashboardContext={dashboardContext}
      dashboardPermissions={dashboardPermissions}
    />
  );
}