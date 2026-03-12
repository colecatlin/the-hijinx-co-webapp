/**
 * Run Operational Import Preflight
 * 
 * Evaluates all rows before import to surface unresolved references.
 * Admins can review and fix source data before attempting import.
 * 
 * Input:
 * {
 *   rows: array of operational rows,
 *   row_type: "entry" | "result" | "standing" | "class",
 *   context: { event_id?, series_id?, ... }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { rows, row_type, context } = body;

    if (!rows || !row_type) {
      return Response.json(
        { error: 'Missing rows or row_type' },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    let resolvable_rows = 0;
    let unresolved_rows = 0;
    let warning_rows = 0;
    const unresolved_breakdown = {};
    const row_results = [];

    // Evaluate each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const res = await base44.asServiceRole.functions.invoke('resolveSourceReferencesForOperationalRow', {
          row,
          context,
          row_type
        });

        const result = {
          row_number: i + 1,
          ok: res.data?.ok,
          unresolved: res.data?.unresolved || [],
          warnings: res.data?.warnings || []
        };

        if (res.data?.ok) {
          resolvable_rows++;
        } else {
          unresolved_rows++;
          // Track which fields are unresolved
          for (const unresolv of (res.data?.unresolved || [])) {
            const field = unresolv.field || 'unknown';
            unresolved_breakdown[field] = (unresolved_breakdown[field] || 0) + 1;
          }
        }

        if ((res.data?.warnings || []).length > 0) {
          warning_rows++;
        }

        row_results.push(result);
      } catch (err) {
        unresolved_rows++;
        row_results.push({
          row_number: i + 1,
          ok: false,
          error: err.message,
          unresolved: [],
          warnings: []
        });
      }
    }

    return Response.json({
      total_rows: rows.length,
      resolvable_rows,
      unresolved_rows,
      warning_rows,
      unresolved_breakdown: Object.entries(unresolved_breakdown).map(([field, count]) => ({
        field,
        count
      })),
      row_results: row_results.slice(0, 100), // Cap at 100 for response size
      row_results_truncated: row_results.length > 100,
      preflight_passed: unresolved_rows === 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});