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
  // Inject checkin: true into .tabs so CheckInManager's canTab() check passes.
  // No longer injects a broad fake role — canEdit is passed explicitly instead.
  const adaptedDashboardPermissions = eventPermissions
    ? {
        ...dashboardPermissions,
        tabs: {
          ...(dashboardPermissions?.tabs || {}),
          checkin: canViewCheckIn,
        },
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
      canEdit={canViewCheckIn}
    />
  );
}