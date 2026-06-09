/**
 * reversePenaltyCascade
 * R9BS Sprint 4 — Reverses an Applied penalty (appeal overturn).
 *
 * Rules:
 *   - Only Race Director / Chief Steward / Admin
 *   - Only if Penalty.status is Applied, Under Appeal, or Upheld
 *   - Restores original_position, original_points from Penalty record
 *   - Sets Penalty.status = Overturned
 *   - Recalculates standings after reversal unless standings_hold remains
 *   - Logs all reversals
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const REVERSE_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

async function logOp(base44, eventId, type, entityId, message, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: type,
      status: 'success',
      entity_name: 'Penalty',
      entity_id: entityId,
      event_id: eventId,
      message,
      metadata,
    });
  } catch (_) { /* non-blocking */ }
}

Deno.serve(async (req) => {
  const warnings = [];
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { penalty_id, reversal_reason } = await req.json();
    if (!penalty_id) return Response.json({ error: 'penalty_id is required' }, { status: 400 });
    if (!reversal_reason?.trim()) return Response.json({ error: 'reversal_reason is required' }, { status: 400 });

    // Load penalty
    let penalties;
    try {
      penalties = await base44.asServiceRole.entities.Penalty.filter({ id: penalty_id });
    } catch (_) {
      return Response.json({ error: 'Penalty not found' }, { status: 404 });
    }
    if (!penalties?.length) return Response.json({ error: 'Penalty not found' }, { status: 404 });
    const penalty = penalties[0];

    // Permission check
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: penalty.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        o => REVERSE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: Race Director or Chief Steward required' }, { status: 403 });
    }

    // Guard: must be Applied, Under Appeal, or Upheld
    const reversibleStatuses = ['Applied', 'Under Appeal', 'Upheld'];
    if (!reversibleStatuses.includes(penalty.status)) {
      return Response.json({
        error: `Cannot reverse: penalty status is "${penalty.status}". Must be one of: ${reversibleStatuses.join(', ')}.`,
      }, { status: 409 });
    }

    const affectedResults = [];
    let standingsRecalculated = false;

    // Load session and event
    let session = null;
    if (penalty.session_id) {
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: penalty.session_id });
      session = sessions?.[0] || null;
    }
    let event = null;
    if (penalty.event_id) {
      const events = await base44.asServiceRole.entities.Event.filter({ id: penalty.event_id });
      event = events?.[0] || null;
    }

    // ── Restore result record if one was applied ──────────────────────────────
    if (penalty.applied_to_result_id && penalty.original_position != null) {
      const resultsList = await base44.asServiceRole.entities.Results.filter({ id: penalty.applied_to_result_id });
      const result = resultsList?.[0];

      if (result) {
        const currentPosition = result.position;
        const currentPoints = result.points;

        // Restore original values
        const restorePayload = {};
        if (penalty.original_position != null) restorePayload.position = penalty.original_position;
        if (penalty.original_points != null) restorePayload.points = penalty.original_points;

        // For DSQ: also restore status to Running
        if (penalty.penalty_type === 'Disqualification' && result.status === 'DSQ') {
          restorePayload.status = 'Running';
        }

        await base44.asServiceRole.entities.Results.update(result.id, restorePayload);
        affectedResults.push({
          result_id: result.id,
          driver_id: result.driver_id,
          restored_position: penalty.original_position,
          restored_points: penalty.original_points,
          from_position: currentPosition,
          from_points: currentPoints,
        });

        await logOp(base44, penalty.event_id, 'result_penalty_reversed', result.id,
          `Penalty ${penalty.penalty_number} reversed: Driver ${result.driver_id} restored to P${penalty.original_position}`,
          { penalty_id, original_position: penalty.original_position, from_position: currentPosition });

        // For position penalties: reverse the bumped cascade
        // We can't know exactly which results were bumped, so we re-fetch session results
        // and let the caller know to verify — warn about potential positional drift
        if (['Position', 'Drive-Through', 'Stop-and-Go', 'Grid Penalty'].includes(penalty.penalty_type) && penalty.position_delta) {
          // Drivers between adjusted_position and original_position need shifting back down
          const sessionResults = await base44.asServiceRole.entities.Results.filter({ session_id: penalty.session_id });
          const toRestore = sessionResults.filter(r =>
            r.id !== result.id &&
            r.position >= penalty.original_position &&
            r.position < penalty.adjusted_position &&
            r.status !== 'DSQ' && r.status !== 'DNS'
          );
          for (const r of toRestore) {
            const restoredPos = r.position + 1;
            await base44.asServiceRole.entities.Results.update(r.id, { position: restoredPos });
            affectedResults.push({
              result_id: r.id, driver_id: r.driver_id,
              restored_position: restoredPos, from_position: r.position,
              mutation: 'cascade_reverse_shift',
            });
          }
        }

        // Release DSQ session hold if it was caused by this penalty
        if (penalty.penalty_type === 'Disqualification' && session?.results_on_hold) {
          await base44.asServiceRole.entities.Session.update(session.id, {
            results_on_hold: false,
            standings_hold: false,
            hold_released_at: new Date().toISOString(),
            hold_released_by_user_id: user.id,
          });
          await logOp(base44, penalty.event_id, 'session_hold_released_on_reversal', session.id,
            `DSQ reversal: hold released on session ${session.id}`);
        }
      } else {
        warnings.push('Target Result record not found — result was not restored. Manual review required.');
      }
    } else if (penalty.penalty_type === 'Championship Points Deduction' && penalty.original_points != null) {
      // Restore championship standing points
      const standingsList = await base44.asServiceRole.entities.Standings.filter({
        driver_id: penalty.driver_id,
        series_id: event?.series_id,
        season_year: event?.season,
      });
      if (standingsList.length > 0) {
        const standing = standingsList[0];
        await base44.asServiceRole.entities.Standings.update(standing.id, {
          points_total: penalty.original_points,
          last_calculated: new Date().toISOString(),
        });
        await logOp(base44, penalty.event_id, 'standings_penalty_reversed', standing.id,
          `Championship points restored: ${standing.points_total} → ${penalty.original_points}`,
          { original_points: penalty.original_points });
      } else {
        warnings.push('No standing record found — standing points not restored.');
      }
    } else {
      warnings.push('No result record linked or original_position not stored — result not automatically restored. Manual review required.');
    }

    // ── Mark penalty Overturned ───────────────────────────────────────────────
    const overturned = await base44.asServiceRole.entities.Penalty.update(penalty_id, {
      status: 'Overturned',
      internal_note: `REVERSED by ${user.id}: ${reversal_reason}. Previous status: ${penalty.status}`,
    });

    await logOp(base44, penalty.event_id, 'penalty_reversed', penalty_id,
      `${penalty.penalty_number} reversed/overturned by ${user.id}: ${reversal_reason}`,
      { reversal_reason, reversed_by: user.id, previous_status: penalty.status, results_restored: affectedResults.length });

    // ── Recalculate standings after reversal ──────────────────────────────────
    const freshSession = session
      ? (await base44.asServiceRole.entities.Session.filter({ id: session.id }))?.[0]
      : null;
    const hasHold = freshSession?.standings_hold === true;

    if (!hasHold && event?.series_id && event?.season) {
      try {
        await base44.functions.invoke('recalculateStandings', {
          series_id: event.series_id,
          season: event.season,
          series_class_id: session?.series_class_id || null,
          event_id: event.id,
        });
        standingsRecalculated = true;
      } catch (err) {
        warnings.push(`Standings recalculation after reversal failed: ${err.message}`);
      }
    } else if (hasHold) {
      warnings.push('Session standings hold still active — standings not recalculated after reversal.');
    }

    return Response.json({
      success: true,
      penalty: overturned,
      affected_results: affectedResults,
      standings_recalculated: standingsRecalculated,
      warnings,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});