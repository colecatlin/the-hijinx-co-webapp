/**
 * buildImportResolutionSummary.js — R9EB.2
 *
 * Aggregates an array of ResolvedImportRow objects into an ImportResolutionSummary.
 *
 * This is the pre-commit review object that administrators inspect
 * before approving the commit.
 *
 * Input:  { resolved_rows: ResolvedImportRow[], import_run_id, source_name }
 * Output: ImportResolutionSummary
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { resolved_rows = [], import_run_id = null, source_name = 'import' } = body;

    if (!resolved_rows.length) return Response.json({ error: 'resolved_rows is required' }, { status: 400 });

    // ── Aggregate metrics ──────────────────────────────────────────────────────
    let rows_parsed = resolved_rows.length;
    let rows_ready = 0, rows_blocked = 0, rows_needing_review = 0;
    let rows_creating_new = 0, rows_updating_existing = 0;
    let rows_matching_aliases = 0, rows_matching_canonical = 0;
    let duplicate_candidates = 0, identity_review_items = 0, missing_information = 0;
    let total_confidence = 0;

    const entity_breakdown = {};
    const action_breakdown = { MATCH_EXISTING: 0, MATCH_ALIAS: 0, CREATE_NEW: 0, UPDATE_EXISTING: 0, REVIEW_REQUIRED: 0, BLOCK_IMPORT: 0, NO_ACTION: 0 };
    const validation_breakdown = { PASS: 0, WARNING: 0, FAIL: 0, BLOCKED: 0 };
    const blocked_rows = [];
    const review_rows = [];
    const warnings_list = [];
    const errors_list = [];

    for (const row of resolved_rows) {
      total_confidence += row.confidence_score || 0;

      // Ready / Blocked / Review
      if (row.ready_to_commit) rows_ready++;
      if (row.errors?.length > 0 || Object.values(row.entity_resolution || {}).some(e => e.action === 'BLOCK_IMPORT')) {
        rows_blocked++;
        blocked_rows.push({ row_number: row.row_number, errors: row.errors, trace: row.diagnostics?.trace || [] });
      } else if (row.requires_review) {
        rows_needing_review++;
        review_rows.push({ row_number: row.row_number, warnings: row.warnings, entity_type: row.entity_type, trace: row.diagnostics?.trace || [] });
      }

      // Created / Updated / Matched
      if (row.created_entities?.length > 0) rows_creating_new++;
      if (row.updated_entities?.length > 0) rows_updating_existing++;
      if (row.alias_actions?.length > 0) rows_matching_aliases++;
      if (row.entity_resolution) {
        const hasCanonical = Object.values(row.entity_resolution).some(e => e.action === 'MATCH_EXISTING' && e.match_type !== 'entity_alias');
        if (hasCanonical) rows_matching_canonical++;
      }

      // Identity items
      if (row.identity_resolution?.action === 'REVIEW') identity_review_items++;
      if (row.identity_resolution?.action === 'BLOCKED') { identity_review_items++; rows_blocked++; }

      // Missing info
      if (row.validation?.checks?.some(c => c.status === 'FAIL')) missing_information++;

      // Validation breakdown
      const vs = row.validation?.overall || 'PASS';
      if (validation_breakdown[vs] !== undefined) validation_breakdown[vs]++;

      // Entity resolution breakdown
      if (row.entity_type) {
        if (!entity_breakdown[row.entity_type]) entity_breakdown[row.entity_type] = { total: 0, ready: 0, blocked: 0, review: 0, creating: 0 };
        entity_breakdown[row.entity_type].total++;
        if (row.ready_to_commit) entity_breakdown[row.entity_type].ready++;
        if (rows_blocked && !row.ready_to_commit && !row.requires_review) entity_breakdown[row.entity_type].blocked++;
        if (row.requires_review) entity_breakdown[row.entity_type].review++;
        if (row.created_entities?.length > 0) entity_breakdown[row.entity_type].creating++;
      }

      // Action breakdown
      for (const res of Object.values(row.entity_resolution || {})) {
        if (action_breakdown[res.action] !== undefined) action_breakdown[res.action]++;
      }

      // Collect warnings/errors
      for (const w of (row.warnings || [])) warnings_list.push({ row: row.row_number, message: w });
      for (const e of (row.errors || [])) errors_list.push({ row: row.row_number, message: e });
    }

    const overall_confidence = rows_parsed > 0 ? Math.round(total_confidence / rows_parsed) : 0;

    // ── Certification ──────────────────────────────────────────────────────────
    let certification = 'PASS';
    if (rows_blocked > 0) certification = 'BLOCKED';
    else if (rows_needing_review > 0 || missing_information > 0 || identity_review_items > 0) certification = 'PASS_WITH_WARNINGS';

    const summary = {
      import_run_id,
      source_name,
      certification,
      rows_parsed,
      rows_ready,
      rows_blocked,
      rows_needing_review,
      rows_creating_new,
      rows_updating_existing,
      rows_matching_aliases,
      rows_matching_canonical,
      duplicate_candidates,
      identity_review_items,
      missing_information,
      overall_confidence,
      entity_breakdown,
      action_breakdown,
      validation_breakdown,
      blocked_rows,
      review_rows,
      warnings: warnings_list,
      errors: errors_list,
      diagnostics: {
        ready_to_commit: rows_blocked === 0,
        requires_admin_review: rows_needing_review > 0 || identity_review_items > 0,
        safe_to_auto_commit: rows_blocked === 0 && rows_needing_review === 0 && identity_review_items === 0,
      },
    };

    return Response.json(summary);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});