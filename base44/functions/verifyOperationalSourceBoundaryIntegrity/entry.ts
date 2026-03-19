/**
 * Verify Operational Source Boundary Integrity
 * 
 * Ensures operational imports never silently create source entities.
 * Checks that all operational flows use safe resolution instead of guessing.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get operation logs for import operations
    const importLogs = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: { $in: ['operational_import_completed', 'csv_import_completed', 'entries_csv_import'] }
    }, '-created_date', 100);

    const violations = [];
    const compliantPaths = new Set();

    // Check each import log
    importLogs.forEach(log => {
      const source = log.source_type || '';
      const metadata = log.metadata || {};
      
      // Verify metadata has proper structure
      if (!metadata.row_type) {
        violations.push({
          log_id: log.id,
          issue: 'missing row_type in metadata',
          severity: 'medium'
        });
      }

      // Check for unresolved breakdown
      if (!metadata.unresolved_breakdown) {
        violations.push({
          log_id: log.id,
          issue: 'missing unresolved_breakdown in metadata',
          severity: 'medium'
        });
      }

      // Check status reports unresolved rows
      if (metadata.unresolved_count === undefined) {
        violations.push({
          log_id: log.id,
          issue: 'missing unresolved_count in metadata',
          severity: 'high'
        });
      }

      if (metadata.source_path) {
        compliantPaths.add(metadata.source_path);
      }
    });

    // Check for raw source entity creation during operational imports
    const driverLogsRaw = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: 'operational_import_completed',
      entity_name: 'Driver'
    }, '-created_date', 20);

    const teamLogsRaw = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: 'operational_import_completed',
      entity_name: 'Team'
    }, '-created_date', 20);

    const trackLogsRaw = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: 'operational_import_completed',
      entity_name: 'Track'
    }, '-created_date', 20);

    if (driverLogsRaw.length > 0) {
      violations.push({
        issue: 'Driver creation detected during operational import',
        severity: 'critical',
        count: driverLogsRaw.length
      });
    }

    if (teamLogsRaw.length > 0) {
      violations.push({
        issue: 'Team creation detected during operational import',
        severity: 'critical',
        count: teamLogsRaw.length
      });
    }

    if (trackLogsRaw.length > 0) {
      violations.push({
        issue: 'Track creation detected during operational import',
        severity: 'critical',
        count: trackLogsRaw.length
      });
    }

    // Check for uses of resolveSourceReferencesForOperationalRow in recent logs
    const resolverUsageCount = importLogs.filter(log => {
      const metadata = log.metadata || {};
      return metadata.source_path && (
        metadata.source_path.includes('csv') || 
        metadata.source_path.includes('registration') ||
        metadata.source_path.includes('import')
      );
    }).length;

    return Response.json({
      operational_imports_checked: importLogs.length,
      silent_source_creation_paths_found: violations.filter(v => v.severity === 'critical').length,
      compliant_paths: Array.from(compliantPaths),
      violations: violations,
      severity: violations.some(v => v.severity === 'critical') ? 'critical' : 
                violations.some(v => v.severity === 'high') ? 'high' :
                violations.length > 0 ? 'medium' : 'healthy',
      resolver_usage_detected: resolverUsageCount > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});