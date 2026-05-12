/**
 * R8H Part 2 — EventCheckInPanel
 * Thin adapter that bridges CheckInManager into the EventFile workspace.
 * Pulls context from useEventWorkspace() and passes expected props.
 * Does NOT modify CheckInManager.
 */
import React from 'react';
import { Shield } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import CheckInManager from '../../CheckInManager';

export default function EventCheckInPanel() {
  const {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    invalidateAfterOperation,
    eventPermissions,
    isAdmin,
  } = useEventWorkspace();

  // ── Permission gate ────────────────────────────────────────────────────────
  const canViewCheckIn =
    isAdmin ||
    eventPermissions?.canManageCheckIn === true ||
    eventPermissions?.canManageEntries === true ||
    eventPermissions?.canManageCompliance === true;

  if (!canViewCheckIn) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Shield className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">Your access does not include Check-In.</p>
      </div>
    );
  }

  // ── Adapted dashboardPermissions ──────────────────────────────────────────
  // When operating inside EventFile (eventPermissions present), synthesize a
  // dashboardPermissions-compatible object so CheckInManager's internal
  // canTab / role checks resolve correctly without modifying CheckInManager.
  const adaptedDashboardPermissions = eventPermissions
    ? {
        ...dashboardPermissions,
        role: canViewCheckIn ? 'entity_editor' : 'viewer',
        checkin: canViewCheckIn,
      }
    : dashboardPermissions;

  return (
    <CheckInManager
      selectedEvent={selectedEvent}
      selectedTrack={selectedTrack}
      selectedSeries={selectedSeries}
      dashboardContext={dashboardContext}
      dashboardPermissions={adaptedDashboardPermissions}
      invalidateAfterOperation={invalidateAfterOperation}
    />
  );
}