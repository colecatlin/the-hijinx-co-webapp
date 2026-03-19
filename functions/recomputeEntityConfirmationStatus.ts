import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Compute effective_status for an EntityConfirmation record.
 * Rules:
 * - confirmed: track = accepted AND (no series OR series = accepted)
 * - rejected: track = rejected OR (series exists AND series = rejected)
 * - pending_confirmation: otherwise
 */
function computeEffectiveStatus(trackStatus, seriesStatus, hasSeriesId) {
  if (trackStatus === 'rejected' || (hasSeriesId && seriesStatus === 'rejected')) {
    return 'rejected';
  }
  if (trackStatus === 'accepted' && (!hasSeriesId || seriesStatus === 'accepted')) {
    return 'confirmed';
  }
  return 'pending_confirmation';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirmation_id } = await req.json();
    if (!confirmation_id) {
      return Response.json({ error: 'confirmation_id is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const confirmation = await sr.entities.EntityConfirmation.get(confirmation_id);
    if (!confirmation) {
      return Response.json({ error: `EntityConfirmation not found: ${confirmation_id}` }, { status: 404 });
    }

    const hasSeriesId = !!confirmation.series_entity_id;
    const newEffectiveStatus = computeEffectiveStatus(
      confirmation.track_status,
      confirmation.series_status,
      hasSeriesId
    );

    const now = new Date().toISOString();
    const changed = newEffectiveStatus !== confirmation.effective_status;

    await sr.entities.EntityConfirmation.update(confirmation_id, {
      effective_status: newEffectiveStatus,
      last_computed_at: now,
      updated_at: now,
    });

    return Response.json({
      confirmation_id,
      previous_status: confirmation.effective_status,
      effective_status: newEffectiveStatus,
      changed,
      track_status: confirmation.track_status,
      series_status: confirmation.series_status,
      has_series: hasSeriesId,
      last_computed_at: now,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});