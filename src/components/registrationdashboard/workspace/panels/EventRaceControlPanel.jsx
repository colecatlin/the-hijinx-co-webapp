/**
 * R9BQ Sprint 2 — EventRaceControlPanel
 * Adapter panel that mounts RaceControlCenter inside the EventWorkspaceShell.
 * Guards rendering to users with canViewRaceControl permission.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import RaceControlCenter from '@/components/racecontrol/RaceControlCenter';
import { Radio, PackageX } from 'lucide-react';
import { useModules } from '@/components/racecore/modules/ModuleProvider';

export default function EventRaceControlPanel() {
  const { isAdmin, eventPermissions } = useEventWorkspace();
  const { governanceEnabled } = useModules();

  // R9BX: Module disabled state — clean, no crash, no redirect
  if (!governanceEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3 px-6">
        <PackageX className="w-8 h-8 text-gray-700" />
        <p className="text-gray-400 text-sm font-semibold">Governance Module Disabled</p>
        <p className="text-gray-600 text-xs max-w-xs">
          Race Control, Officials, Incidents, Penalties, and Protests are not enabled for this series.
          Enable the Governance module in Series Settings to use these features.
        </p>
      </div>
    );
  }

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