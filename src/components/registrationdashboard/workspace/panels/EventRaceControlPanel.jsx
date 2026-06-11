/**
 * R9CQ — EventRaceControlPanel
 * Adds Quick Incident fast-path above RaceControlCenter.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import RaceControlCenter from '@/components/racecontrol/RaceControlCenter';
import QuickIncidentModal from '@/components/racecontrol/modals/QuickIncidentModal';
import { Radio, PackageX, AlertCircle, Plus } from 'lucide-react';
import { useModules } from '@/components/racecore/modules/ModuleProvider';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EventRaceControlPanel() {
  const { isAdmin, eventPermissions, selectedEvent } = useEventWorkspace();
  const { governanceEnabled } = useModules();
  const [quickIncidentOpen, setQuickIncidentOpen] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Session.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const activeSession = sessions.find(s => s.status === 'Live');

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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setQuickIncidentOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-red-900/30 border-red-700/40 text-red-300 hover:bg-red-900/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Incident
        </button>
        {activeSession && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-700/40 bg-red-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] text-red-300 font-semibold">Live: {activeSession.name}</span>
          </div>
        )}
      </div>

      {/* Race Control Center */}
      <RaceControlCenter />

      {/* Quick Incident Modal */}
      <QuickIncidentModal
        open={quickIncidentOpen}
        onClose={() => setQuickIncidentOpen(false)}
        eventId={selectedEvent?.id}
        activeSessionId={activeSession?.id}
      />
    </div>
  );
}