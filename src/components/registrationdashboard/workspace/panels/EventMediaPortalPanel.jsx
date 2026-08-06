/**
 * R8Z Part 2 — EventMediaPortalPanel
 * Adapter that bridges EventWorkspaceContext into the existing MediaPortal component.
 * Scoped entirely to the EventFile — no dependency on RaceCoreDashboard selectedEvent.
 */
import React from 'react';
import { Lock } from 'lucide-react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import MediaPortal from '../../media/MediaPortal';

export default function EventMediaPortalPanel() {
  const {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    isAdmin,
    user,
    invalidateAfterOperation,
    eventPermissions,
  } = useEventWorkspace();

  // Permission gate: admin always allowed; otherwise require canManageMedia
  const canAccess = isAdmin || (eventPermissions ? !!eventPermissions.canManageMedia : true);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Lock className="w-8 h-8 text-foreground-quiet" />
        <p className="text-foreground-quiet text-sm font-medium">Access Denied</p>
        <p className="text-foreground-quiet text-xs">You do not have permission to access the Media Portal for this event.</p>
      </div>
    );
  }

  return (
    <MediaPortal
      dashboardContext={dashboardContext}
      selectedEvent={selectedEvent}
      selectedTrack={selectedTrack}
      selectedSeries={selectedSeries}
      dashboardPermissions={dashboardPermissions}
      currentUser={user}
      isAdmin={isAdmin}
      invalidateAfterOperation={invalidateAfterOperation}
    />
  );
}