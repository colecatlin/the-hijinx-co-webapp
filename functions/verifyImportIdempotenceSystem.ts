/**
 * Verify Import Idempotence System
 * 
 * Tests that repeated imports remain idempotent and don't create duplicates.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get import operation logs
    const importLogs = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: { $in: [
        'operational_import_completed',
        'csv_import_completed',
        'entries_csv_import',
        'smartCSVImport',
        'importNascarDrivers',
        'syncNascarScheduleToEvents',
        'syncNascarCalendar'
      ] }
    }, '-created_date', 100);

    const violations = [];
    const idempotentImports = [];
    const importsCreatingDuplicates = [];
    const normalizationFailures = [];

    // Group logs by source path to detect repeated runs
    const importsByPath = {};
    importLogs.forEach(log => {
      const source = log.metadata?.source_path || log.source_type || 'unknown';
      if (!importsByPath[source]) {
        importsByPath[source] = [];
      }
      importsByPath[source].push(log);
    });

    // Analyze each import source for idempotence
    Object.entries(importsByPath).forEach(([source, logs]) => {
      if (logs.length < 2) return; // Need at least 2 runs

      // Check if repeated runs create new records or update
      let isIdempotent = true;
      const createdCounts = [];
      const updatedCounts = [];

      logs.forEach(log => {
        const metadata = log.metadata || {};
        createdCounts.push(metadata.created_count || 0);
        updatedCounts.push(metadata.updated_count || 0);
      });

      // If first run creates N records, subsequent runs should create 0 and update N
      if (createdCounts[0] > 0 && logs.length > 1) {
        for (let i = 1; i < createdCounts.length; i++) {
          if (createdCounts[i] > 0 && updatedCounts[i] === 0) {
            isIdempotent = false;
            importsCreatingDuplicates.push({
              source: source,
              first_run_created: createdCounts[0],
              run_created_duplicates: createdCounts[i],
              severity: 'critical'
            });
          }
        }
      }

      if (isIdempotent) {
        idempotentImports.push({
          source: source,
          runs_tested: logs.length,
          verified: true
        });
      }

      // Check for normalized key issues
      logs.forEach(log => {
        const metadata = log.metadata || {};
        if (metadata.unresolved_breakdown) {
          const unresolvedFields = Object.values(metadata.unresolved_breakdown).reduce((a, b) => a + b, 0);
          if (unresolvedFields > (logs[0]?.metadata?.unresolved_breakdown ? 
              Object.values(logs[0].metadata.unresolved_breakdown).reduce((a, b) => a + b, 0) : 0)) {
            normalizationFailures.push({
              source: source,
              issue: 'unresolved count increased on repeated run',
              severity: 'high'
            });
          }
        }
      });
    });

    return Response.json({
      imports_checked: Object.keys(importsByPath).length,
      idempotent_imports: idempotentImports.length,
      imports_creating_duplicates: importsCreatingDuplicates.length,
      normalization_failures: normalizationFailures.length,
      violations: violations.concat(importsCreatingDuplicates).concat(normalizationFailures),
      severity: importsCreatingDuplicates.length > 0 ? 'critical' :
                normalizationFailures.length > 0 ? 'high' : 'healthy',
      idempotent_imports_list: idempotentImports,
      problematic_imports: importsCreatingDuplicates,
      recommendation: importsCreatingDuplicates.length === 0
        ? 'All imports are idempotent — normalized keys working correctly'
        : 'Fix imports to use normalized keys for deduplication',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});