/**
 * buildSourceImportReport.js
 *
 * Standardized report builder for source import outcomes.
 * Input: row-level results from import operations
 * Output: structured report with metrics and per-row details
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { rows = [], source_path = 'unknown', total_rows = rows.length } = body;

    const report = {
      source_path,
      total_rows,
      created_rows: 0,
      updated_rows: 0,
      skipped_rows: 0,
      warning_rows: 0,
      error_rows: 0,
      rows: rows.map((r, idx) => ({
        row_number: (r.row_number !== undefined) ? r.row_number : idx + 2, // 1-indexed + header
        entity_type: r.entity_type || 'unknown',
        action: r.action || 'unknown', // created | updated | skipped | warning | error
        matched_by: r.matched_by || null,
        warning: r.warning || null,
        error: r.error || null,
      })),
      generated_at: new Date().toISOString(),
    };

    // Calculate summary stats
    for (const row of report.rows) {
      if (row.action === 'created') report.created_rows++;
      else if (row.action === 'updated') report.updated_rows++;
      else if (row.action === 'skipped') report.skipped_rows++;
      else if (row.action === 'warning') report.warning_rows++;
      else if (row.action === 'error') report.error_rows++;
    }

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});