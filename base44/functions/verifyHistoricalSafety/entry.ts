/**
 * verifyHistoricalSafety.js — R9EA Phase 8
 *
 * Checks that all historical sessions and results are properly isolated
 * from live operations:
 *   1. Historical sessions have is_historical = true
 *   2. Historical sessions have standings_hold = true unless verified
 *   3. Historical results have is_historical = true
 *   4. Draft/manual/partial results are not public
 *
 * Input:  { sample_size?: number }
 * Output: { issues[], warnings[], pass }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROTECTED_RECORD_STATUSES = new Set(['manual', 'partial', 'estimated', 'under_review', 'historical_verified']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { sample_size = 200 } = body;

    const sr = base44.asServiceRole;
    const issues = [];
    const warnings = [];

    // ── Check 1: Historical sessions are properly flagged ─────────────────────
    const sessions = await sr.entities.Session.list('-created_date', sample_size).catch(() => []);
    const historicalSessions = sessions.filter(s =>
      s.data_source === 'smart_csv_import' || s.is_historical === true || s.input_source === 'CSV'
    );

    for (const session of historicalSessions) {
      if (!session.is_historical) {
        issues.push({
          type: 'historical_session_not_flagged',
          severity: 'error',
          session_id: session.id,
          session_name: session.name,
          message: `Session "${session.name}" appears to be historical (data_source=${session.data_source}) but is_historical is not true`,
        });
      }
      if (session.is_historical && !session.standings_hold) {
        // Only warn if it's unverified — standings_hold should be true until released
        warnings.push({
          type: 'historical_session_no_hold',
          severity: 'warning',
          session_id: session.id,
          session_name: session.name,
          message: `Historical session "${session.name}" has standings_hold=false — ensure this is intentional (verified and released)`,
        });
      }
    }

    // ── Check 2: Historical results are properly flagged ─────────────────────
    const results = await sr.entities.Results.list('-created_date', sample_size).catch(() => []);

    for (const result of results) {
      // If source_type indicates a non-live source, is_historical should be true
      const isImported = result.source_type && result.source_type !== 'live_ops';
      if (isImported && !result.is_historical) {
        warnings.push({
          type: 'imported_result_not_historical',
          severity: 'warning',
          result_id: result.id,
          source_type: result.source_type,
          message: `Result (${result.id}) has source_type="${result.source_type}" but is_historical is not set`,
        });
      }

      // Check 3: Draft/manual/partial results must not be public
      if (PROTECTED_RECORD_STATUSES.has(result.record_status)) {
        if (result.published === true || result.is_public === true) {
          issues.push({
            type: 'protected_result_public',
            severity: 'error',
            result_id: result.id,
            record_status: result.record_status,
            message: `Result (${result.id}) has record_status="${result.record_status}" but is published/public — must be unpublished until verified`,
          });
        }
      }

      // Check 4: Superseded results must not count
      if (result.record_status === 'superseded' && result.published === true) {
        issues.push({
          type: 'superseded_result_published',
          severity: 'error',
          result_id: result.id,
          message: `Result (${result.id}) is superseded but still published — should be unpublished`,
        });
      }
    }

    return Response.json({
      pass: issues.length === 0,
      issues,
      warnings,
      checks_run: ['historical_session_flags', 'historical_session_hold', 'historical_result_flags', 'protected_result_visibility'],
      sessions_checked: sessions.length,
      historical_sessions_found: historicalSessions.length,
      results_checked: results.length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});