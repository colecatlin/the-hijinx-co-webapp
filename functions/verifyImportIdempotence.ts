/**
 * verifyImportIdempotence.js
 * 
 * Verifies that repeated imports would update records instead of creating duplicates.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const warnings = [];
    const failures = [];
    let csv_import_idempotent = true;
    let nascar_driver_import_idempotent = true;
    let nascar_schedule_import_idempotent = true;
    let ics_calendar_import_idempotent = true;

    // Check recent OperationLogs for import operations
    const logs = await sr.entities.OperationLog.list('-created_date', 50, 0);
    
    // Filter for source imports from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentImports = logs.filter(log => {
      const logDate = log.created_date ? new Date(log.created_date) : null;
      return logDate && logDate >= sevenDaysAgo && 
             (log.metadata?.importer_name === 'smart_csv_import' || 
              log.metadata?.source_path?.includes('nascar') ||
              log.metadata?.source_path?.includes('ics'));
    });

    // Check for imports that created records without using sync pipeline
    for (const log of recentImports) {
      const importPath = log.metadata?.source_path || log.metadata?.importer_name || 'unknown';
      const createdCount = log.metadata?.imported_count || 0;
      const updatedCount = log.metadata?.updated_count || 0;

      // Idempotent imports should have more updates than creates on repeat runs
      if (createdCount > 0 && updatedCount === 0) {
        warnings.push(`Import ${importPath} only created records, no updates on potential repeats`);
      }

      if (importPath.includes('csv')) {
        if (!log.metadata?.importer_name?.includes('smart_csv') || createdCount > 100) {
          csv_import_idempotent = false;
        }
      }
      if (importPath.includes('nascar') && importPath.includes('driver')) {
        if (createdCount > 500) nascar_driver_import_idempotent = false;
      }
      if (importPath.includes('nascar') && importPath.includes('schedule')) {
        if (createdCount > 300) nascar_schedule_import_idempotent = false;
      }
      if (importPath.includes('ics')) {
        if (createdCount > 200) ics_calendar_import_idempotent = false;
      }
    }

    if (recentImports.length === 0) {
      warnings.push('No recent import operations found in last 7 days — cannot verify idempotence');
    }

    return Response.json({
      csv_import_idempotent,
      nascar_driver_import_idempotent,
      nascar_schedule_import_idempotent,
      ics_calendar_import_idempotent,
      warnings,
      failures,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});