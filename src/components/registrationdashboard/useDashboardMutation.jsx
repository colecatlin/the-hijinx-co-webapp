/**
 * useDashboardMutation.js
 * Shared mutation wrapper for RegistrationDashboard tabs.
 *
 * Handles:
 *  - Executing the mutationFn
 *  - Operation logging (via logOperation)
 *  - Cache invalidation (via invalidateAfterOperation)
 *  - Consistent toast feedback on success/error
 *
 * Usage:
 *   const { mutateAsync, isPending, error } = useDashboardMutation({
 *     operationType: 'entry_updated',
 *     entityName: 'Entry',
 *     mutationFn: async (input) => base44.entities.Entry.update(input.id, input.data),
 *     invalidateAfterOperation,
 *     dashboardContext,
 *     selectedEvent,
 *     selectedSeries,
 *     selectedTrack,
 *     successMessage,   // optional override, default: 'Saved'
 *     errorMessage,     // optional override prefix, default: 'Action failed'
 *   });
 *
 *   await mutateAsync({ id, data });
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logOperation } from './operationLogger';

export default function useDashboardMutation({
  operationType,
  entityName,
  mutationFn,
  invalidateAfterOperation,
  dashboardContext,
  selectedEvent,
  selectedSeries,
  selectedTrack,
  successMessage = 'Saved',
  errorMessage = 'Action failed',
}) {
  // Derive context ids
  const eventId    = selectedEvent?.id ?? dashboardContext?.eventId ?? null;
  const seriesId   = dashboardContext?.orgType === 'series'
    ? dashboardContext?.orgId
    : (selectedEvent?.series_id ?? selectedSeries?.id ?? null);
  const trackId    = selectedTrack?.id ?? null;
  const seasonYear = dashboardContext?.season ?? null;

  const { mutateAsync: _mutateAsync, isPending, error } = useMutation({
    mutationFn: async (input) => {
      let result;
      try {
        result = await mutationFn(input);
      } catch (err) {
        // Log failure
        await logOperation({
          operation_type: operationType,
          status: 'failed',
          entity_name: entityName,
          entity_id: input?.id ?? input?.entity_id ?? undefined,
          event_id: eventId,
          series_id: seriesId,
          track_id: trackId,
          season_year: seasonYear,
          message: err?.message ?? 'Unknown error',
        });
        throw err;
      }

      // Log success
      const entityId = result?.id ?? input?.id ?? input?.entity_id ?? undefined;
      await logOperation({
        operation_type: operationType,
        status: 'success',
        entity_name: entityName,
        entity_id: entityId,
        event_id: eventId,
        series_id: seriesId,
        track_id: trackId,
        season_year: seasonYear,
        meta_json: input?.meta ?? undefined,
      });

      // Invalidate
      if (invalidateAfterOperation) {
        invalidateAfterOperation(operationType, {
          eventId,
          seriesId,
          trackId,
          seasonYear,
          orgType: dashboardContext?.orgType,
          orgId: dashboardContext?.orgId,
        });
      }

      return result;
    },
    onSuccess: () => {
      toast.success(successMessage);
    },
    onError: (err) => {
      toast.error(`${errorMessage}: ${err?.message ?? 'Unknown error'}`);
    },
  });

  return { mutateAsync: _mutateAsync, isPending, error };
}