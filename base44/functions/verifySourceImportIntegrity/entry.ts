/**
 * verifySourceImportIntegrity.js
 *
 * Audits source import paths for compliance with the approved sync pipeline.
 * Verifies:
 * - source import paths use prepareSourcePayloadForSync + syncSourceAndEntityRecord
 * - repeated runs do not create suspicious duplicates
 * - normalization fields are populated on imported records
 * - row-level reporting is present in OperationLog
 *
 * Returns:
 * {
 *   pipeline_compliance_ok,
 *   duplicate_risk_remaining,
 *   normalization_after_import_ok,
 *   reporting_ok,
 *   warnings,
 *   failures
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const failures = [];
    const warnings = [];
    let pipeline_compliance_ok = true;
    let duplicate_risk_remaining = false;
    let normalization_after_import_ok = true;
    let reporting_ok = true;

    const limit = 100;
    let offset = 0;

    // ── Check OperationLog for source imports ──
    const sourcePaths = new Set();
    const recentLogs = [];

    while (true) {
      const batch = await base44.asServiceRole.entities.OperationLog.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const log of batch) {
        // Filter for source entity operations logged in last 30 days
        if (log.created_date) {
          const logDate = new Date(log.created_date);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < thirtyDaysAgo) break;
        }

        if (log.source_type === 'smart_csv_import' || log.source_type === 'api_function' || log.source_type === 'manual') {
          recentLogs.push(log);
          if (log.metadata?.source_path) {
            sourcePaths.add(log.metadata.source_path);
          }
        }
      }
    }

    // ── Check for recent duplicate creation from imports ──
    offset = 0;
    const entityTypes = ['Driver', 'Team', 'Track', 'Series', 'Event'];
    for (const entityType of entityTypes) {
      const records = await base44.asServiceRole.entities[entityType].list('-created_date', 50, 0);
      
      // Check for duplicate patterns in recently created records
      const nameMap = new Map();
      for (const rec of records) {
        const created = rec.created_date ? new Date(rec.created_date) : null;
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        if (!created || created < tenDaysAgo) continue;

        // Check normalized_name for duplicates
        const normName = rec.normalized_name || rec.name?.toLowerCase().trim();
        if (normName) {
          if (!nameMap.has(normName)) nameMap.set(normName, []);
          nameMap.get(normName).push(rec);
        }
      }

      // If multiple records have same normalized name, raise warning
      for (const [normName, recs] of nameMap) {
        if (recs.length > 1) {
          warnings.push(`${entityType}: ${recs.length} recent records share normalized name "${normName}" — duplicate risk remains`);
          duplicate_risk_remaining = true;
        }
      }

      // Check for missing normalization fields on recently created records
      for (const rec of records) {
        const created = rec.created_date ? new Date(rec.created_date) : null;
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        if (!created || created < tenDaysAgo) continue;

        if (!rec.normalized_name && rec.name) {
          failures.push(`${entityType} (${rec.id}) created recently but missing normalized_name field`);
          normalization_after_import_ok = false;
        }

        if (!rec.canonical_key && (rec.normalized_name || rec.name)) {
          failures.push(`${entityType} (${rec.id}) created recently but missing canonical_key field`);
          normalization_after_import_ok = false;
        }
      }
    }

    // ── Check OperationLog for detailed row-level reporting ──
    for (const log of recentLogs) {
      if (log.metadata?.importer_name === 'smart_csv_import') {
        // Should have row-level error tracking
        if (!log.metadata.error_count && !log.metadata.skipped_count && log.metadata.imported_count === 0) {
          // Empty import is okay, but missing metrics is not
          if (!log.metadata.total_rows) {
            warnings.push(`Import from ${log.metadata.source_path || 'unknown'} missing total_rows metric`);
            reporting_ok = false;
          }
        }
      }
    }

    // ── Check documented source import paths ──
    const approvedPaths = [
      'smart_csv_import',
      'nascar_driver_import',
      'nascar_schedule_sync',
      'nascar_calendar_sync',
    ];

    const nonApprovedPaths = Array.from(sourcePaths).filter(p => !approvedPaths.includes(p));
    if (nonApprovedPaths.length > 0) {
      warnings.push(`${nonApprovedPaths.length} non-approved source import path(s) detected: ${nonApprovedPaths.join(', ')}`);
      pipeline_compliance_ok = false;
    }

    // ── Check for raw entity creation outside sync pipeline (detection via data_source) ──
    for (const entityType of entityTypes) {
      const records = await base44.asServiceRole.entities[entityType].list('-created_date', 10, 0);
      for (const rec of records) {
        const created = rec.created_date ? new Date(rec.created_date) : null;
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        if (!created || created < twoDaysAgo) continue;

        // Records without data_source or triggered_from may indicate bypass
        if (!rec.data_source && rec.created_date) {
          warnings.push(`${entityType} (${rec.id}) created recently without data_source attribution — possible pipeline bypass`);
          pipeline_compliance_ok = false;
        }
      }
    }

    return Response.json({
      pipeline_compliance_ok,
      duplicate_risk_remaining,
      normalization_after_import_ok,
      reporting_ok,
      warnings,
      failures,
      summary: {
        total_checks: 4,
        passed_checks: (pipeline_compliance_ok ? 1 : 0) + (normalization_after_import_ok ? 1 : 0) + (reporting_ok ? 1 : 0) + (!duplicate_risk_remaining ? 1 : 0),
        overall_ok: pipeline_compliance_ok && normalization_after_import_ok && reporting_ok && !duplicate_risk_remaining,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});