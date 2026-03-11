/**
 * backfillOperationalIdentityKeys.js
 *
 * Populates result_identity_key on Results and standing_identity_key on Standings
 * for all records that are missing them.
 * Never overwrites an existing key.
 *
 * Input:  { dry_run?: boolean }
 * Output: { results_backfilled, standings_backfilled, skipped, warnings }
 * Admin only.
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

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const report = { dry_run, results_backfilled: 0, results_already_complete: 0, standings_backfilled: 0, standings_already_complete: 0, skipped: 0, warnings: [] };

    // ── Results ──────────────────────────────────────────────────────────────
    const allResults = await base44.asServiceRole.entities.Results.list('-created_date', 10000);
    for (const r of allResults) {
      if (r.result_identity_key) { report.results_already_complete++; continue; }
      if (!r.event_id || !r.driver_id) { report.skipped++; continue; }
      const key = buildResultKey(r.event_id, r.session_id, r.driver_id);
      if (!dry_run) {
        await base44.asServiceRole.entities.Results.update(r.id, { result_identity_key: key }).catch(e => report.warnings.push(`result:${r.id}:${e.message}`));
      }
      report.results_backfilled++;
    }

    // ── Standings ────────────────────────────────────────────────────────────
    const allStandings = await base44.asServiceRole.entities.Standings.list('-created_date', 10000);
    for (const s of allStandings) {
      if (s.standing_identity_key) { report.standings_already_complete++; continue; }
      if (!s.series_id || !s.driver_id || !s.season_year) { report.skipped++; continue; }
      const key = buildStandingKey(s.series_id, s.season_year, s.series_class_id || null, s.driver_id);
      if (!dry_run) {
        await base44.asServiceRole.entities.Standings.update(s.id, { standing_identity_key: key }).catch(e => report.warnings.push(`standing:${s.id}:${e.message}`));
      }
      report.standings_backfilled++;
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_identity_backfill_completed',
        entity_name: 'Results',
        status: 'success',
        metadata: { results_backfilled: report.results_backfilled, standings_backfilled: report.standings_backfilled },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});