/**
 * R9CQ — EventStandingsPanel
 * Surfaces recalculate button and stale indicator above fold.
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PointsAndStandingsManager from '@/components/registrationdashboard/PointsAndStandingsManager';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Trophy, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EventStandingsPanel() {
  const {
    selectedEvent,
    selectedSeries,
    dashboardContext,
    isAdmin,
    standingsDirty,
    onClearDirty,
    onStandingsCalculated,
    sessions,
  } = useEventWorkspace();

  const queryClient = useQueryClient();

  const recalcMutation = useMutation({
    mutationFn: () => base44.functions.invoke('recalculateStandings', {
      series_id: selectedEvent?.series_id,
      season_year: selectedEvent?.season || new Date().getFullYear().toString(),
      event_id: selectedEvent?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      onStandingsCalculated?.();
      onClearDirty?.();
      toast.success('Standings recalculated');
    },
    onError: () => toast.error('Standings recalculation failed'),
  });

  if (!selectedEvent) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <p className="text-foreground-quiet">Select an event to view standings</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Above-fold: Stale indicator + recalculate */}
      <div className="flex items-center gap-3 flex-wrap">
        {standingsDirty ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-warning/40 bg-warning/10">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="text-[11px] text-warning font-medium">Standings stale — results have changed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-success/40 bg-success/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success font-medium">Standings current</span>
          </div>
        )}

        {(isAdmin || standingsDirty) && selectedEvent?.series_id && (
          <button
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider bg-motion/10 border-motion/40 text-motion hover:bg-motion/20 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
            {recalcMutation.isPending ? 'Calculating…' : 'Recalculate Standings'}
          </button>
        )}
      </div>

      {/* Standings manager */}
      <PointsAndStandingsManager
        selectedEvent={selectedEvent}
        selectedSeries={selectedSeries}
        dashboardContext={dashboardContext}
        isAdmin={isAdmin}
        standingsDirty={standingsDirty}
        onClearDirty={onClearDirty}
        onStandingsCalculated={onStandingsCalculated}
        sessions={sessions}
      />
    </div>
  );
}