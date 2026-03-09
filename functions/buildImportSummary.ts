/**
 * buildImportSummary.js
 *
 * Returns a standardized import summary object consumed by all importer flows.
 *
 * Input:
 *   imported_rows    — array of successfully imported rows/ids
 *   updated_rows     — array of updated rows/ids (optional)
 *   skipped_rows     — array of rows skipped (not errors, e.g. duplicates)
 *   unresolved_rows  — array of rows where a required entity (e.g. driver) could not be resolved
 *   warning_rows     — array of rows that imported with a warning (e.g. weak match used)
 *   error_rows       — array of rows that failed with an error
 *   importer_name    — e.g. 'smart_csv_import', 'registration_dashboard_csv'
 *   entity_name      — e.g. 'Driver', 'Results', 'Entry'
 *
 * Output: { summary }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      imported_rows  = [],
      updated_rows   = [],
      skipped_rows   = [],
      unresolved_rows = [],
      warning_rows   = [],
      error_rows     = [],
      importer_name  = null,
      entity_name    = null,
    } = body;

    const total_processed =
      imported_rows.length +
      updated_rows.length +
      skipped_rows.length +
      unresolved_rows.length +
      error_rows.length;

    const summary = {
      importer_name,
      entity_name,
      imported_count:    imported_rows.length,
      updated_count:     updated_rows.length,
      skipped_count:     skipped_rows.length,
      unresolved_count:  unresolved_rows.length,
      warning_count:     warning_rows.length,
      error_count:       error_rows.length,
      total_processed,
      success: error_rows.length < total_processed,
      rows: {
        imported_rows,
        updated_rows,
        skipped_rows,
        unresolved_rows,
        warning_rows,
        error_rows,
      },
    };

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});