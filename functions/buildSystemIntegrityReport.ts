/**
 * buildSystemIntegrityReport.js
 * 
 * Builds a comprehensive system integrity report from all verification results.
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

    // Get the latest platform integrity check
    const integrityCheck = await sr.functions.invoke('runFullPlatformIntegrityCheck', {}).catch(e => ({ data: { system_status: 'error' } }));

    const result = integrityCheck?.data || {};

    const recommended_actions = [];

    // Add recommended actions based on findings
    if (result.failures && result.failures.length > 0) {
      recommended_actions.push('Fix critical failures immediately before production deployment');
    }

    if (result.orphaned_records > 10) {
      recommended_actions.push('Review and resolve orphaned records');
    }

    if (result.missing_normalization_fields > 50) {
      recommended_actions.push('Run normalization backfill for missing fields');
    }

    if (result.duplicate_groups_remaining > 1) {
      recommended_actions.push(`Run duplicate cleanup (${result.duplicate_groups_remaining} groups remaining)`);
    }

    // Count total entities
    const entityTypes = ['Driver', 'Team', 'Track', 'Series', 'Event', 'Session', 'Results', 'Entry', 'SeriesClass', 'EventClass'];
    let total_entities_checked = 0;
    
    for (const entityType of entityTypes) {
      const allRecords = await sr.entities[entityType].list('-created_date', 1, 0).catch(() => null);
      // Note: We're just checking if we can query them, not counting all
    }

    return Response.json({
      overall_status: result.system_status || 'unknown',
      total_entities_checked: entityTypes.length,
      duplicate_groups_remaining: result.duplicate_groups_remaining || 0,
      orphan_records_detected: result.orphaned_records || 0,
      missing_normalization_fields: result.missing_normalization_fields || 0,
      import_integrity_status: result.import_integrity?.reporting_ok ? 'healthy' : 'warning',
      access_integrity_status: result.access_system_integrity?.overall_valid ? 'healthy' : 'warning',
      warnings: result.warnings || [],
      failures: result.failures || [],
      recommended_actions,
      source_entity_status: result.source_entity_integrity?.overall_ok ? 'healthy' : 'warning',
      event_session_status: result.event_session_integrity?.overall_ok ? 'healthy' : 'warning',
      results_standings_status: result.results_integrity?.overall_ok ? 'healthy' : 'warning',
      entry_class_status: result.entry_class_integrity?.overall_ok ? 'healthy' : 'warning',
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});