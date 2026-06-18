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
    const warnings = [];
    const blocking_issues = []; // issues that cause import_status = 'blocked'
    let duplicate_warnings = 0;
    let orphan_counts = 0;
    let integrity_issues = 0;
    let review_queue_items = 0;

    // ── 1. Orphaned records ─────────────────────────────────────────────────
    checks_run.push('findOrphanedRecords');
    const orphans = await safeInvoke(base44, 'findOrphanedRecords', {});
    if (orphans?.total_orphaned > 0) {
      orphan_counts = orphans.total_orphaned;
      blocking_issues.push(`${orphan_counts} orphaned records found`);
      issues.push(`${orphan_counts} orphaned records found`);
    }

    // ── 2. Event integrity ──────────────────────────────────────────────────
    checks_run.push('verifyEventIntegrity');
    const eventIntegrity = await safeInvoke(base44, 'verifyEventIntegrity', { sample_size: 50 });
    if (eventIntegrity?.failures?.length > 0) {
      integrity_issues += eventIntegrity.failures.length;
      issues.push(`${eventIntegrity.failures.length} event integrity issue(s)`);
    }

    // ── 3. Results & standings integrity ───────────────────────────────────
    checks_run.push('verifyResultsAndStandingsIntegrity');
    const resultsIntegrity = await safeInvoke(base44, 'verifyResultsAndStandingsIntegrity', { sample_size: 100 });
    if (resultsIntegrity?.failures?.length > 0) {
      integrity_issues += resultsIntegrity.failures.length;
      issues.push(`${resultsIntegrity.failures.length} results/standings integrity issue(s)`);
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
      if (entity_types && !entity_types.includes(label.slice(0,-1))) continue;
      checks_run.push(fn);
      const dupRes = await safeInvoke(base44, fn, {});
      const count = dupRes?.duplicate_groups?.length || dupRes?.groups?.length || dupRes?.count || 0;
      if (count > 0) {
        duplicate_warnings += count;
        issues.push(`${count} duplicate ${label} group(s) found`);
      }
    }

    // ── 6. R9EA: Round assignment completeness ──────────────────────────────
    checks_run.push('verifyRoundAssignmentCompleteness');
    const roundCheck = await safeInvoke(base44, 'verifyRoundAssignmentCompleteness', { sample_size: 100 });
    if (roundCheck?.issues?.length > 0) {
      integrity_issues += roundCheck.issues.length;
      for (const iss of roundCheck.issues) blocking_issues.push(iss.message);
      issues.push(`${roundCheck.issues.length} missing round assignment(s) on Final/points-enabled sessions`);
    }
    if (roundCheck?.warnings?.length > 0) {
      for (const w of roundCheck.warnings) warnings.push(w.message);
    }

    // ── 7. R9EA: Class + series alignment ──────────────────────────────────
    checks_run.push('verifyClassSeriesAlignment');
    const classCheck = await safeInvoke(base44, 'verifyClassSeriesAlignment', { sample_size: 100 });
    if (classCheck?.issues?.length > 0) {
      integrity_issues += classCheck.issues.length;
      for (const iss of classCheck.issues) blocking_issues.push(iss.message);
      issues.push(`${classCheck.issues.length} class/series alignment issue(s)`);
    }
    if (classCheck?.warnings?.length > 0) {
      for (const w of classCheck.warnings) warnings.push(w.message);
    }

    // ── 8. R9EA: Identity ↔ Driver linkage ────────────────────────────────
    checks_run.push('verifyIdentityDriverLinkage');
    const identityCheck = await safeInvoke(base44, 'verifyIdentityDriverLinkage', { sample_size: 100 });
    if (identityCheck?.issues?.length > 0) {
      integrity_issues += identityCheck.issues.length;
      for (const iss of identityCheck.issues) blocking_issues.push(iss.message);
      issues.push(`${identityCheck.issues.length} identity↔driver linkage issue(s)`);
    }
    if (identityCheck?.warnings?.length > 0) {
      for (const w of identityCheck.warnings) warnings.push(w.message);
    }
    // Count review queue items as warnings
    const reviewQueueItems = await base44.asServiceRole.entities.IdentityReviewQueue.filter({ status: 'pending' }).catch(() => []);
    if (reviewQueueItems.length > 0) {
      review_queue_items = reviewQueueItems.length;
      warnings.push(`${review_queue_items} identity review queue item(s) pending`);
    }

    // ── 9. R9EA: Historical safety check ──────────────────────────────────
    checks_run.push('verifyHistoricalSafety');
    const histCheck = await safeInvoke(base44, 'verifyHistoricalSafety', { sample_size: 100 });
    if (histCheck?.issues?.length > 0) {
      integrity_issues += histCheck.issues.length;
      for (const iss of histCheck.issues) blocking_issues.push(iss.message);
      issues.push(`${histCheck.issues.length} historical safety issue(s)`);
    }
    if (histCheck?.warnings?.length > 0) {
      for (const w of histCheck.warnings) warnings.push(w.message);
    }

    // ── Phase 9: Import success gating ─────────────────────────────────────
    // success       — all checks clean
    // success_with_warnings — review items, optional field gaps, preserved historical
    // blocked       — orphans, class mismatch, identity link failures, historical safety failures
    // failed        — only set by caller when file parse/backend exception occurs
    let import_status = 'success';
    if (blocking_issues.length > 0) {
      import_status = 'blocked';
    } else if (warnings.length > 0 || review_queue_items > 0 || duplicate_warnings > 0) {
      import_status = 'success_with_warnings';
    }

    // Legacy field — derive from import_status
    let integrity_status = 'pass';
    if (import_status === 'blocked') integrity_status = 'fail';
    else if (import_status === 'success_with_warnings') integrity_status = 'warn';

    const summary = issues.length === 0
      ? 'All post-import diagnostics passed.'
      : issues.join('; ');

    return Response.json({
      import_status,
      integrity_status,
      checks_run,
      orphan_counts,
      duplicate_warnings,
      integrity_issues,
      review_queue_items,
      issues,
      warnings,
      blocking_issues,
      summary,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});