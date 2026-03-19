/**
 * runPostCleanupVerification.js
 * 
 * Master verification orchestration — runs all diagnostics functions post-cleanup.
 * Aggregates results into categorized findings (critical, high, medium, low).
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
    const startTime = Date.now();

    // Run all verification functions in parallel
    const results = await Promise.all([
      sr.functions.invoke('runAuthRoutingVerification', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('runAccessFlowVerification', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('accessSystemHealthCheck', {}).catch(e => ({ data: { summary: {} } })),
      sr.functions.invoke('verifySeriesIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyTrackIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyDriverIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyEventIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifySessionIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyResultsAndStandingsIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyEntryAndClassIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifySourceImportIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('runFullPlatformIntegrityCheck', {}).catch(e => ({ data: { system_status: 'error' } })),
    ]);

    const [
      authRoute, accessFlow, accessHealth,
      seriesInt, trackInt, driverInt, eventInt, sessionInt, resultsInt, entryInt,
      sourceImport, platformInt,
    ] = results.map(r => r?.data || {});

    // Categorize findings
    const findings = {
      auth_and_routing: {
        failures: authRoute.failures || [],
        warnings: authRoute.warnings || [],
      },
      access_lifecycle: {
        failures: accessFlow.failures || [],
        warnings: accessFlow.warnings || [],
        health_summary: accessHealth.summary || {},
      },
      source_entities: {
        series_failures: seriesInt.failures || [],
        track_failures: trackInt.failures || [],
        driver_failures: driverInt.failures || [],
        event_failures: eventInt.failures || [],
        session_failures: sessionInt.failures || [],
      },
      operational_entities: {
        results_failures: resultsInt.failures || [],
        entry_failures: entryInt.failures || [],
      },
      imports_and_syncs: {
        import_failures: sourceImport.failures || [],
        import_warnings: sourceImport.warnings || [],
      },
      platform_health: {
        system_status: platformInt.system_status || 'unknown',
        orphaned_records: platformInt.orphaned_records || 0,
        missing_normalization: platformInt.missing_normalization_fields || 0,
        duplicate_groups: platformInt.duplicate_groups_remaining || 0,
        duplicate_severity: platformInt.duplicate_severity || 0,
      },
    };

    // Categorize severity
    const critical_failures = [];
    const high_priority_bugs = [];
    const medium_priority_bugs = [];
    const low_priority_items = [];

    // Auth/routing failures are critical
    if (findings.auth_and_routing.failures.length > 0) {
      critical_failures.push({
        area: 'Authentication & Routing',
        issues: findings.auth_and_routing.failures,
        impact: 'Login or access control broken',
      });
    }

    // Access flow failures are critical
    if (findings.access_lifecycle.failures.length > 0) {
      critical_failures.push({
        area: 'Access Lifecycle',
        issues: findings.access_lifecycle.failures,
        impact: 'Collaborator access not working',
      });
    }

    // Duplicate risk is high/critical
    if (findings.platform_health.duplicate_groups > 0) {
      if (findings.platform_health.duplicate_severity >= 2) {
        critical_failures.push({
          area: 'Duplicate Risk',
          issues: [`${findings.platform_health.duplicate_groups} duplicate groups, severity level ${findings.platform_health.duplicate_severity}`],
          impact: 'Duplicates still being created',
        });
      } else {
        high_priority_bugs.push({
          area: 'Duplicate Risk',
          issues: [`${findings.platform_health.duplicate_groups} duplicate groups, severity level ${findings.platform_health.duplicate_severity}`],
          impact: 'Monitor for continued duplicate creation',
        });
      }
    }

    // Import failures are high priority
    if (findings.imports_and_syncs.import_failures.length > 0) {
      high_priority_bugs.push({
        area: 'Source Imports',
        issues: findings.imports_and_syncs.import_failures,
        impact: 'Imports may be corrupting data',
      });
    }

    // Entity integrity failures
    const entityFailures = [
      { area: 'Series', failures: findings.source_entities.series_failures },
      { area: 'Track', failures: findings.source_entities.track_failures },
      { area: 'Driver', failures: findings.source_entities.driver_failures },
      { area: 'Event', failures: findings.source_entities.event_failures },
      { area: 'Session', failures: findings.source_entities.session_failures },
      { area: 'Results', failures: findings.operational_entities.results_failures },
      { area: 'Entry', failures: findings.operational_entities.entry_failures },
    ];

    for (const { area, failures } of entityFailures) {
      if (failures.length > 0) {
        high_priority_bugs.push({
          area: `${area} Integrity`,
          issues: failures,
          impact: 'Data may be corrupted',
        });
      }
    }

    // Orphaned records are medium priority
    if (findings.platform_health.orphaned_records > 10) {
      medium_priority_bugs.push({
        area: 'Orphaned Records',
        issues: [`${findings.platform_health.orphaned_records} orphaned records detected`],
        impact: 'Stale references, cleanup needed',
      });
    } else if (findings.platform_health.orphaned_records > 0) {
      low_priority_items.push({
        area: 'Orphaned Records',
        issues: [`${findings.platform_health.orphaned_records} orphaned records`],
        impact: 'Minor cleanup',
      });
    }

    // Missing normalization is medium
    if (findings.platform_health.missing_normalization > 50) {
      medium_priority_bugs.push({
        area: 'Normalization Coverage',
        issues: [`${findings.platform_health.missing_normalization} records missing normalization fields`],
        impact: 'Routing and deduplication may fail',
      });
    } else if (findings.platform_health.missing_normalization > 0) {
      low_priority_items.push({
        area: 'Normalization Coverage',
        issues: [`${findings.platform_health.missing_normalization} records missing fields`],
        impact: 'Minor field backfill',
      });
    }

    // Access health warnings
    const healthSummary = findings.access_lifecycle.health_summary || {};
    if (healthSummary.duplicate_collaborators > 0 || healthSummary.orphan_collaborators > 0) {
      high_priority_bugs.push({
        area: 'Collaborator Health',
        issues: [
          `${healthSummary.duplicate_collaborators || 0} duplicate collaborators`,
          `${healthSummary.orphan_collaborators || 0} orphan collaborators`,
        ],
        impact: 'Access records may be corrupted',
      });
    }

    // Platform overall status
    let platform_status = 'healthy';
    if (critical_failures.length > 0) platform_status = 'critical';
    else if (high_priority_bugs.length > 0) platform_status = 'degraded';
    else if (medium_priority_bugs.length > 0) platform_status = 'acceptable';

    const runtimeMs = Date.now() - startTime;

    // Log operation
    await sr.entities.OperationLog.create({
      operation_type: 'post_cleanup_verification',
      source_type: 'api_function',
      entity_name: 'Platform',
      status: platform_status,
      message: `Post-cleanup verification: ${platform_status}`,
      metadata: {
        critical_count: critical_failures.length,
        high_count: high_priority_bugs.length,
        medium_count: medium_priority_bugs.length,
        low_count: low_priority_items.length,
        runtime_ms: runtimeMs,
      },
    }).catch(() => {});

    return Response.json({
      platform_status,
      critical_failures,
      high_priority_bugs,
      medium_priority_bugs,
      low_priority_items,
      findings,
      summary: {
        critical_open: critical_failures.length,
        high_open: high_priority_bugs.length,
        medium_open: medium_priority_bugs.length,
        low_open: low_priority_items.length,
        total_issues: critical_failures.length + high_priority_bugs.length + medium_priority_bugs.length + low_priority_items.length,
      },
      runtime_ms: runtimeMs,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});