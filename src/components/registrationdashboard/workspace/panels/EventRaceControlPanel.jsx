/**
 * R9BQ Sprint 2 — EventRaceControlPanel
 * Adapter panel that mounts RaceControlCenter inside the EventWorkspaceShell.
 * Guards rendering to users with canViewRaceControl permission.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import RaceControlCenter from '@/components/racecontrol/RaceControlCenter';
import { Radio } from 'lucide-react';

export default function EventRaceControlPanel() {
  const { isAdmin, eventPermissions } = useEventWorkspace();

  const canView = isAdmin || !!eventPermissions?.canViewRaceControl;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <Radio className="w-8 h-8 text-gray-700" />
        <p className="text-gray-500 text-sm">Race Control access required.</p>
        <p className="text-gray-700 text-xs">You do not have a Race Director, Steward, or equivalent official role for this event.</p>
      </div>
    );
  }

  return <RaceControlCenter />;
}