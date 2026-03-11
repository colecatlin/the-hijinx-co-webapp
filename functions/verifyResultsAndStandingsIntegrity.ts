/**
 * verifyResultsAndStandingsIntegrity.js
 *
 * Verifies that Results and Standings are deterministic and duplicate-resistant.
 * Admin only.
 *
 * Output:
 * {
 *   results: { total, missing_identity_key, missing_driver_ref, missing_event_ref, duplicate_groups_count },
 *   standings: { total, missing_identity_key, missing_driver_ref, duplicate_groups_count },
 *   summary: { passed, warnings, failures }
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildResultKey(event_id, session_id, driver_id) {
  return `result:${event_id || 'none'}:${session_id || 'none'}:${driver_id || 'none'}`;
}
function buildStandingKey(series_id, season_year, class_id, driver_id) {
  return `standing:${series_id || 'none'}:${season_year || 'none'}:${class_id || 'none'}:${driver_id || 'none'}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [allResults, allStandings] = await Promise.all([
      base44.asServiceRole.entities.Results.list('-created_date', 10000),
      base44.asServiceRole.entities.Standings.list('-created_date', 10000),
    ]);

    // ── Results analysis ─────────────────────────────────────────────────────
    const activeResults = allResults.filter(r => !r.notes?.includes('DUPLICATE_OF:') && r.status_state !== 'Locked');
    let resultsMissingKey = 0, resultsMissingDriver = 0, resultsMissingEvent = 0, resultsMissingSession = 0;
    const resultKeyMap = new Map();

    for (const r of activeResults) {
      if (!r.result_identity_key) resultsMissingKey++;
      if (!r.driver_id) resultsMissingDriver++;
      if (!r.event_id) resultsMissingEvent++;
      if (!r.session_id) resultsMissingSession++;
      const k = r.result_identity_key || buildResultKey(r.event_id, r.session_id, r.driver_id);
      const a = resultKeyMap.get(k) || []; a.push(r.id); resultKeyMap.set(k, a);
    }
    const resultDuplicateGroups = [...resultKeyMap.values()].filter(ids => ids.length > 1).length;

    // ── Standings analysis ───────────────────────────────────────────────────
    const activeStandings = allStandings.filter(s => !s.notes?.includes('DUPLICATE_OF:'));
    let standingsMissingKey = 0, standingsMissingDriver = 0, standingsMissingYear = 0;
    const standingKeyMap = new Map();

    for (const s of activeStandings) {
      if (!s.standing_identity_key) standingsMissingKey++;
      if (!s.driver_id) standingsMissingDriver++;
      if (!s.season_year) standingsMissingYear++;
      const k = s.standing_identity_key || buildStandingKey(s.series_id, s.season_year, s.series_class_id || null, s.driver_id);
      const a = standingKeyMap.get(k) || []; a.push(s.id); standingKeyMap.set(k, a);
    }
    const standingDuplicateGroups = [...standingKeyMap.values()].filter(ids => ids.length > 1).length;

    // ── Summary ──────────────────────────────────────────────────────────────
    const checks = [
      { label: 'Results: all have identity keys',         pass: resultsMissingKey === 0,        val: resultsMissingKey,      severity: 'high' },
      { label: 'Results: no active duplicate groups',     pass: resultDuplicateGroups === 0,     val: resultDuplicateGroups,  severity: 'high' },
      { label: 'Results: all have driver_id',             pass: resultsMissingDriver === 0,       val: resultsMissingDriver,   severity: 'high' },
      { label: 'Results: all have event_id',              pass: resultsMissingEvent === 0,        val: resultsMissingEvent,    severity: 'high' },
      { label: 'Results: all have session_id',            pass: resultsMissingSession === 0,      val: resultsMissingSession,  severity: 'medium' },
      { label: 'Standings: all have identity keys',       pass: standingsMissingKey === 0,        val: standingsMissingKey,    severity: 'high' },
      { label: 'Standings: no active duplicate groups',   pass: standingDuplicateGroups === 0,    val: standingDuplicateGroups, severity: 'high' },
      { label: 'Standings: all have driver_id',           pass: standingsMissingDriver === 0,     val: standingsMissingDriver, severity: 'high' },
      { label: 'Standings: all have season_year',         pass: standingsMissingYear === 0,       val: standingsMissingYear,   severity: 'medium' },
    ];

    const failures = checks.filter(c => !c.pass && c.severity === 'high').length;
    const warnings = checks.filter(c => !c.pass && c.severity === 'medium').length;
    const passed   = checks.filter(c => c.pass).length;

    return Response.json({
      generated_at: new Date().toISOString(),
      results: {
        total: allResults.length,
        active: activeResults.length,
        missing_identity_key: resultsMissingKey,
        missing_driver_ref: resultsMissingDriver,
        missing_event_ref: resultsMissingEvent,
        missing_session_ref: resultsMissingSession,
        duplicate_groups_count: resultDuplicateGroups,
      },
      standings: {
        total: allStandings.length,
        active: activeStandings.length,
        missing_identity_key: standingsMissingKey,
        missing_driver_ref: standingsMissingDriver,
        missing_season_year: standingsMissingYear,
        duplicate_groups_count: standingDuplicateGroups,
      },
      checks,
      summary: { total_checks: checks.length, passed, warnings, failures, verdict: failures > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed' },
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});