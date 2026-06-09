/**
 * applyPenaltyCascade
 * R9BS Sprint 4 — Applies an Approved penalty to Results and Standings.
 *
 * STRICT RULES (from spec):
 *   - Penalty.status must be "Approved"
 *   - User must have canApplyPenalty OR be platform admin
 *   - Session must not be Locked unless platform admin
 *   - Penalty must not already be Applied
 *   - Target Result must exist for position/time/points/DSQ types
 *   - All mutations are logged with original values stored
 *   - Approval and Application remain separate steps (this function only applies)
 *
 * Cascade matrix:
 *   Position                → shift positions, recalculate points
 *   Time                    → add seconds, re-sort, recalculate points
 *   Points Deduction        → subtract from Result.points (floor 0), no reorder
 *   Championship Points Ded → subtract from Standings directly, no Result change
 *   Disqualification        → DSQ result, points=0, session hold
 *   Warning/Fine/Probation/Suspension → disciplinary only, no Result mutation
 *   Drive-Through/Stop-and-Go/Grid Penalty → treated as Position by delta
 *
 * Returns:
 *   { success, penalty, affected_results, affected_standings, standings_recalculated, warnings }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APPLY_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

// Types that require a Result record
const RESULT_MUTATING_TYPES = [
  'Position', 'Time', 'Points Deduction', 'Disqualification',
  'Drive-Through', 'Stop-and-Go', 'Grid Penalty',
];

// Types that are disciplinary only — no Result mutation
const DISCIPLINARY_ONLY_TYPES = ['Warning', 'Fine', 'Probation', 'Suspension'];

// Types that mutate Standings directly (not Results)
const STANDINGS_DIRECT_TYPES = ['Championship Points Deduction'];

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

// Resolve PointsConfig for a session
async function resolvePoints(base44, session, event) {
  try {
    const res = await base44.functions.invoke('resolvePointsConfig', {
      series_id: event?.series_id,
      series_class_id: session?.series_class_id,
      season: event?.season,
      event_id: event?.id,
    });
    return res?.data?.pointsConfig || null;
  } catch (_) {
    return null;
  }
}

// Recalculate points for a position using the config
function calcPoints(position, pointsConfig) {
  if (!pointsConfig || !position || position <= 0) return 0;
  const arr = pointsConfig.points_by_position || [];
  return arr[position - 1] || 0;
}

Deno.serve(async (req) => {
  const warnings = [];

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { penalty_id, admin_override = false } = body;
    if (!penalty_id) return Response.json({ error: 'penalty_id is required' }, { status: 400 });

    // ── Load penalty ──────────────────────────────────────────────────────────
    let penalties;
    try {
      penalties = await base44.asServiceRole.entities.Penalty.filter({ id: penalty_id });
    } catch (_) {
      return Response.json({ error: 'Penalty not found' }, { status: 404 });
    }
    if (!penalties?.length) return Response.json({ error: 'Penalty not found' }, { status: 404 });
    const penalty = penalties[0];

    // ── Permission check ──────────────────────────────────────────────────────
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: penalty.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        o => APPLY_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) {
        return Response.json({ error: 'Forbidden: canApplyPenalty required' }, { status: 403 });
      }
    }

    // ── Guard: must be Approved ───────────────────────────────────────────────
    if (penalty.status !== 'Approved') {
      return Response.json({
        error: `Cannot apply: penalty status is "${penalty.status}". Must be "Approved".`,
        current_status: penalty.status,
      }, { status: 409 });
    }

    // ── Load event and session ────────────────────────────────────────────────
    const events = await base44.asServiceRole.entities.Event.filter({ id: penalty.event_id });
    const event = events?.[0] || null;

    let session = null;
    if (penalty.session_id) {
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: penalty.session_id });
      session = sessions?.[0] || null;
    }

    // ── Guard: session lock (non-admin cannot apply to Locked session) ────────
    if (session?.status === 'Locked' && !isAdmin) {
      return Response.json({
        error: 'Cannot apply penalty to a Locked session. Admin override required.',
      }, { status: 409 });
    }

    const affectedResults = [];
    const affectedStandings = [];
    let standingsRecalculated = false;

    // ════════════════════════════════════════════════════════════════════════
    // DISCIPLINARY ONLY — Warning, Fine, Probation, Suspension
    // ════════════════════════════════════════════════════════════════════════
    if (DISCIPLINARY_ONLY_TYPES.includes(penalty.penalty_type)) {
      const updated = await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        status: 'Applied',
        applied_at: new Date().toISOString(),
      });
      await logOp(base44, penalty.event_id, 'penalty_applied', penalty_id,
        `${penalty.penalty_number} (${penalty.penalty_type}) applied — disciplinary, no result mutation`,
        { penalty_type: penalty.penalty_type, driver_id: penalty.driver_id });

      return Response.json({
        success: true, penalty: updated,
        affected_results: [], affected_standings: [],
        standings_recalculated: false,
        warnings: [`${penalty.penalty_type} applied: disciplinary record only, no result or standings change.`],
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHAMPIONSHIP POINTS DEDUCTION — apply to Standings directly
    // ════════════════════════════════════════════════════════════════════════
    if (STANDINGS_DIRECT_TYPES.includes(penalty.penalty_type)) {
      const deduction = penalty.points_deduction || 0;
      if (deduction <= 0) {
        return Response.json({ error: 'points_deduction must be > 0 for Championship Points Deduction' }, { status: 400 });
      }

      // Find driver's standing
      const standingsList = await base44.asServiceRole.entities.Standings.filter({
        driver_id: penalty.driver_id,
        series_id: event?.series_id,
        season_year: event?.season,
      });

      if (standingsList.length > 0) {
        const standing = standingsList[0];
        const originalPoints = standing.points_total || 0;
        const adjustedPoints = Math.max(0, originalPoints - deduction);
        const updatedStanding = await base44.asServiceRole.entities.Standings.update(standing.id, {
          points_total: adjustedPoints,
          last_calculated: new Date().toISOString(),
        });
        affectedStandings.push({ id: standing.id, original_points: originalPoints, adjusted_points: adjustedPoints });
        standingsRecalculated = true;
        await logOp(base44, penalty.event_id, 'standings_penalty_applied', penalty_id,
          `${penalty.penalty_number}: Championship points deducted ${deduction} from driver ${penalty.driver_id}. ${originalPoints} → ${adjustedPoints}`,
          { original_points: originalPoints, adjusted_points: adjustedPoints, deduction });
      } else {
        warnings.push('No standing record found for driver — standings not modified.');
      }

      const updated = await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        status: 'Applied',
        applied_at: new Date().toISOString(),
        original_points: affectedStandings[0]?.original_points || 0,
        adjusted_points: affectedStandings[0]?.adjusted_points || 0,
      });

      return Response.json({
        success: true, penalty: updated,
        affected_results: [], affected_standings: affectedStandings,
        standings_recalculated: standingsRecalculated,
        warnings,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // RESULT-MUTATING TYPES — require a session + result record
    // ════════════════════════════════════════════════════════════════════════
    if (!session) {
      return Response.json({
        error: `${penalty.penalty_type} penalty requires a session_id to locate the target result.`,
      }, { status: 400 });
    }

    // Load all results for this session
    const sessionResults = await base44.asServiceRole.entities.Results.filter({
      session_id: session.id,
    });

    // Find target driver's result
    const targetResult = sessionResults.find(r => r.driver_id === penalty.driver_id);
    if (!targetResult && RESULT_MUTATING_TYPES.includes(penalty.penalty_type)) {
      return Response.json({
        error: `No Result record found for driver ${penalty.driver_id} in session ${session.id}.`,
      }, { status: 404 });
    }

    // Resolve points config
    const pointsConfig = await resolvePoints(base44, session, event);
    if (!pointsConfig) {
      warnings.push('Could not resolve PointsConfig — points will not be recalculated.');
    }

    // Sort results by position ascending
    const sorted = [...sessionResults].sort((a, b) => (a.position || 999) - (b.position || 999));

    // ── DISQUALIFICATION ──────────────────────────────────────────────────────
    if (penalty.penalty_type === 'Disqualification') {
      const originalPosition = targetResult.position;
      const originalPoints = targetResult.points || 0;

      const updatedResult = await base44.asServiceRole.entities.Results.update(targetResult.id, {
        status: 'DSQ',
        points: 0,
      });
      affectedResults.push({
        result_id: targetResult.id, driver_id: penalty.driver_id,
        original_position: originalPosition, adjusted_position: null,
        original_points: originalPoints, adjusted_points: 0,
        mutation: 'DSQ',
      });

      // Store originals on penalty
      await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        original_position: originalPosition,
        original_points: originalPoints,
        adjusted_position: null,
        adjusted_points: 0,
        applied_to_result_id: targetResult.id,
      });

      // Set session hold — DSQ requires Race Director release
      await base44.asServiceRole.entities.Session.update(session.id, {
        results_on_hold: true,
        standings_hold: true,
        hold_reason: `DSQ penalty: ${penalty.penalty_number} — ${penalty.reason}`,
        hold_started_at: new Date().toISOString(),
      });

      await logOp(base44, penalty.event_id, 'penalty_applied_dsq', penalty_id,
        `${penalty.penalty_number} DSQ applied to driver ${penalty.driver_id}. Session hold activated.`,
        { driver_id: penalty.driver_id, original_position: originalPosition, session_id: session.id });

      const appliedPenalty = await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        status: 'Applied',
        applied_at: new Date().toISOString(),
        applied_to_result_id: targetResult.id,
      });

      return Response.json({
        success: true, penalty: appliedPenalty,
        affected_results: affectedResults, affected_standings: [],
        standings_recalculated: false,
        warnings: ['DSQ applied. Session is now on hold — standings will not recalculate until hold is released by a Race Director.'],
      });
    }

    // ── POSITION PENALTY (Position / Drive-Through / Stop-and-Go / Grid Penalty) ─
    if (['Position', 'Drive-Through', 'Stop-and-Go', 'Grid Penalty'].includes(penalty.penalty_type)) {
      const delta = penalty.position_delta;
      if (!delta || delta <= 0) {
        return Response.json({ error: 'position_delta must be > 0 for position penalty' }, { status: 400 });
      }

      const originalPosition = targetResult.position;
      const adjustedPosition = originalPosition + delta;
      const originalPoints = targetResult.points || 0;

      // Store original on penalty
      await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        original_position: originalPosition,
        adjusted_position: adjustedPosition,
        original_points: originalPoints,
        applied_to_result_id: targetResult.id,
      });

      // Shift target driver down
      const targetNewPoints = pointsConfig ? calcPoints(adjustedPosition, pointsConfig) : originalPoints;
      await base44.asServiceRole.entities.Results.update(targetResult.id, {
        position: adjustedPosition,
        points: targetNewPoints,
      });
      affectedResults.push({
        result_id: targetResult.id, driver_id: penalty.driver_id,
        original_position: originalPosition, adjusted_position: adjustedPosition,
        original_points: originalPoints, adjusted_points: targetNewPoints,
        mutation: 'position_penalty',
      });
      await logOp(base44, penalty.event_id, 'result_position_adjusted', targetResult.id,
        `${penalty.penalty_number}: Driver ${penalty.driver_id} moved from P${originalPosition} to P${adjustedPosition}`,
        { original: originalPosition, adjusted: adjustedPosition, original_points: originalPoints, adjusted_points: targetNewPoints });

      // Shift drivers between original and new position up by 1
      const toBump = sorted.filter(r =>
        r.id !== targetResult.id &&
        r.position >= originalPosition + 1 &&
        r.position <= adjustedPosition &&
        r.status !== 'DSQ' && r.status !== 'DNS' && r.status !== 'DNF'
      );
      for (const r of toBump) {
        const newPos = r.position - 1;
        const newPts = pointsConfig ? calcPoints(newPos, pointsConfig) : (r.points || 0);
        await base44.asServiceRole.entities.Results.update(r.id, {
          position: newPos, points: newPts,
        });
        affectedResults.push({
          result_id: r.id, driver_id: r.driver_id,
          original_position: r.position, adjusted_position: newPos,
          original_points: r.points, adjusted_points: newPts,
          mutation: 'bumped_up',
        });
        await logOp(base44, penalty.event_id, 'result_position_bumped', r.id,
          `Cascade bump: Driver ${r.driver_id} P${r.position} → P${newPos}`,
          { original: r.position, adjusted: newPos });
      }
    }

    // ── TIME PENALTY ──────────────────────────────────────────────────────────
    else if (penalty.penalty_type === 'Time') {
      const addSeconds = penalty.time_seconds;
      if (!addSeconds || addSeconds <= 0) {
        return Response.json({ error: 'time_seconds must be > 0 for Time penalty' }, { status: 400 });
      }

      const originalPosition = targetResult.position;
      const originalPoints = targetResult.points || 0;
      const originalTime = targetResult.best_lap_time_ms || 0;
      const adjustedTime = originalTime + (addSeconds * 1000);

      // Store original on penalty
      await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        original_position: originalPosition,
        original_points: originalPoints,
        applied_to_result_id: targetResult.id,
      });

      // Apply time adjustment to target
      await base44.asServiceRole.entities.Results.update(targetResult.id, {
        best_lap_time_ms: adjustedTime,
      });

      // Re-sort all running results by adjusted time
      const runningResults = sorted.filter(r => r.status === 'Running' || r.status == null);
      const withAdjustedTime = runningResults.map(r =>
        r.id === targetResult.id ? { ...r, best_lap_time_ms: adjustedTime } : r
      );
      withAdjustedTime.sort((a, b) => {
        const at = a.best_lap_time_ms || 999999999;
        const bt = b.best_lap_time_ms || 999999999;
        return at - bt;
      });

      // Reassign positions
      for (let i = 0; i < withAdjustedTime.length; i++) {
        const r = withAdjustedTime[i];
        const newPos = i + 1;
        const newPts = pointsConfig ? calcPoints(newPos, pointsConfig) : (r.points || 0);
        await base44.asServiceRole.entities.Results.update(r.id, {
          position: newPos, points: newPts,
        });
        affectedResults.push({
          result_id: r.id, driver_id: r.driver_id,
          original_position: r.position, adjusted_position: newPos,
          original_points: r.points, adjusted_points: newPts,
          mutation: r.id === targetResult.id ? 'time_penalty_target' : 'time_penalty_cascade',
        });
      }

      await logOp(base44, penalty.event_id, 'penalty_applied_time', penalty_id,
        `${penalty.penalty_number}: +${addSeconds}s added to driver ${penalty.driver_id}. ${affectedResults.length} results re-sorted.`,
        { driver_id: penalty.driver_id, time_added_seconds: addSeconds, results_affected: affectedResults.length });
    }

    // ── POINTS DEDUCTION ──────────────────────────────────────────────────────
    else if (penalty.penalty_type === 'Points Deduction') {
      const deduction = penalty.points_deduction || 0;
      if (deduction <= 0) {
        return Response.json({ error: 'points_deduction must be > 0 for Points Deduction' }, { status: 400 });
      }

      const originalPoints = targetResult.points || 0;
      const adjustedPoints = Math.max(0, originalPoints - deduction);

      await base44.asServiceRole.entities.Penalty.update(penalty_id, {
        original_points: originalPoints,
        adjusted_points: adjustedPoints,
        applied_to_result_id: targetResult.id,
      });

      await base44.asServiceRole.entities.Results.update(targetResult.id, {
        points: adjustedPoints,
      });
      affectedResults.push({
        result_id: targetResult.id, driver_id: penalty.driver_id,
        original_position: targetResult.position, adjusted_position: targetResult.position, // position unchanged
        original_points: originalPoints, adjusted_points: adjustedPoints,
        mutation: 'points_deduction',
      });
      await logOp(base44, penalty.event_id, 'result_points_deducted', targetResult.id,
        `${penalty.penalty_number}: Points ${originalPoints} → ${adjustedPoints} for driver ${penalty.driver_id}`,
        { original_points: originalPoints, adjusted_points: adjustedPoints, deduction });
    }

    // ── Mark penalty Applied ──────────────────────────────────────────────────
    const appliedPenalty = await base44.asServiceRole.entities.Penalty.update(penalty_id, {
      status: 'Applied',
      applied_at: new Date().toISOString(),
    });

    await logOp(base44, penalty.event_id, 'penalty_applied', penalty_id,
      `${penalty.penalty_number} (${penalty.penalty_type}) applied by ${user.id}`,
      { penalty_type: penalty.penalty_type, driver_id: penalty.driver_id, results_affected: affectedResults.length });

    // ── Standings recalculation ───────────────────────────────────────────────
    // Only if session has no standings_hold and event has a series
    const freshSession = (await base44.asServiceRole.entities.Session.filter({ id: session.id }))?.[0];
    const hasStandingsHold = freshSession?.standings_hold === true;

    if (!hasStandingsHold && event?.series_id && event?.season) {
      try {
        await base44.functions.invoke('recalculateStandings', {
          series_id: event.series_id,
          season: event.season,
          series_class_id: session?.series_class_id || null,
          event_id: event.id,
        });
        standingsRecalculated = true;
        await logOp(base44, penalty.event_id, 'standings_recalculated_after_penalty', penalty_id,
          `Standings recalculated after penalty ${penalty.penalty_number}`,
          { series_id: event.series_id, season: event.season });
      } catch (err) {
        warnings.push(`Standings recalculation failed: ${err.message}`);
      }
    } else if (hasStandingsHold) {
      warnings.push('Standings held pending official release — standings not recalculated.');
      standingsRecalculated = false;
    } else {
      warnings.push('No series or season on event — standings not recalculated.');
    }

    return Response.json({
      success: true,
      penalty: appliedPenalty,
      affected_results: affectedResults,
      affected_standings: affectedStandings,
      standings_recalculated: standingsRecalculated,
      warnings,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});