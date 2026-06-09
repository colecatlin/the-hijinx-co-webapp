/**
 * REVISION R8F Part 2 — EventSettingsPanel
 * R9BQ Sprint 2: Added Officials assignment section for admin / canManageOfficials users.
 */
import React from 'react';
import EventSettingsEditor from './EventSettingsEditor';
import { useEventWorkspace } from '../EventWorkspaceContext';
import OfficialsAssignmentSection from '@/components/racecontrol/OfficialsAssignmentSection';

export default function EventSettingsPanel() {
  const { isAdmin, eventPermissions, eventId } = useEventWorkspace();
  const canManageOfficials = isAdmin || !!eventPermissions?.canManageOfficials;

  return (
    <div className="space-y-8">
      <EventSettingsEditor />
      {canManageOfficials && (
        <div className="p-4 bg-[#0d0f11] border border-gray-800/60 rounded-xl max-w-2xl">
          <OfficialsAssignmentSection eventId={eventId} />
        </div>
      )}
    </div>
  );
}