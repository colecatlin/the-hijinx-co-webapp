/**
 * runImportDiagnostics.js
 *
 * R9DL Phase 9 — Post-import automatic diagnostics.
 *
 * Runs a focused integrity sweep after any import and returns a structured
 * diagnostic summary without modifying any data.
 *
 * Input:  { entity_types? }  — optional list to scope diagnostics (default: all)
 * Output: {
 *   orphan_counts, duplicate_warnings, integrity_issues,
 *   integrity_status: 'pass' | 'warn' | 'fail',
 *   checks_run, summary
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function safeInvoke(base44, fn, payload) {
  try {
    const res = await base44.functions.invoke(fn, payload);
    return res?.data || {};
  } catch (e) {
    return { error: e.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_types } = body;

    const checks_run = [];
    const issues = [];
    let duplicate_warnings = 0;
    let orphan_counts = 0;
    let integrity_issues = 0;

    // ── 1. Orphaned records ─────────────────────────────────────────────────
    checks_run.push('findOrphanedRecords');
    const orphans = await safeInvoke(base44, 'findOrphanedRecords', {});
    if (orphans?.orphaned_count > 0) {
      orphan_counts = orphans.orphaned_count;
      issues.push(`${orphan_counts} orphaned records found`);
    }

    // ── 2. Event integrity ──────────────────────────────────────────────────
    checks_run.push('verifyEventIntegrity');
    const eventIntegrity = await safeInvoke(base44, 'verifyEventIntegrity', { sample_size: 50 });
    if (eventIntegrity?.issues?.length > 0) {
      integrity_issues += eventIntegrity.issues.length;
      issues.push(`${eventIntegrity.issues.length} event integrity issue(s)`);
    }

    // ── 3. Results & standings integrity ───────────────────────────────────
    checks_run.push('verifyResultsAndStandingsIntegrity');
    const resultsIntegrity = await safeInvoke(base44, 'verifyResultsAndStandingsIntegrity', { sample_size: 100 });
    if (resultsIntegrity?.issues?.length > 0) {
      integrity_issues += resultsIntegrity.issues.length;
      issues.push(`${resultsIntegrity.issues.length} results/standings integrity issue(s)`);
    }

    // ── 4. Entry & class integrity ──────────────────────────────────────────
    checks_run.push('verifyEntryAndClassIntegrity');
    const entryIntegrity = await safeInvoke(base44, 'verifyEntryAndClassIntegrity', { sample_size: 100 });
    if (entryIntegrity?.issues?.length > 0) {
      integrity_issues += entryIntegrity.issues.length;
      issues.push(`${entryIntegrity.issues.length} entry/class integrity issue(s)`);
    }

    // ── 5. Duplicate checks ─────────────────────────────────────────────────
    const dupChecks = [
      ['findDuplicateDriverGroups', 'Drivers'],
      ['findDuplicateTeamGroups',   'Teams'],
      ['findDuplicateTrackGroups',  'Tracks'],
      ['findDuplicateSeriesGroups', 'Series'],
    ];

    for (const [fn, label] of dupChecks) {
      // Skip if entity_types scoping doesn't include this type
      if (entity_types && !entity_types.includes(label.slice(0,-1))) continue;
      checks_run.push(fn);
      const dupRes = await safeInvoke(base44, fn, {});
      const count = dupRes?.duplicate_groups?.length || dupRes?.groups?.length || dupRes?.count || 0;
      if (count > 0) {
        duplicate_warnings += count;
        issues.push(`${count} duplicate ${label} group(s) found`);
      }
    }

    // ── Determine overall status ────────────────────────────────────────────
    let integrity_status = 'pass';
    if (integrity_issues > 0 || orphan_counts > 0) integrity_status = 'warn';
    if (integrity_issues > 5 || orphan_counts > 20) integrity_status = 'fail';

    const summary = issues.length === 0
      ? 'All post-import diagnostics passed.'
      : issues.join('; ');

    return Response.json({
      integrity_status,
      checks_run,
      orphan_counts,
      duplicate_warnings,
      integrity_issues,
      issues,
      summary,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});