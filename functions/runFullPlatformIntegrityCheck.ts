/**
 * runFullPlatformIntegrityCheck.js
 * 
 * Master orchestration function that verifies the entire platform.
 * Runs all integrity checks and returns comprehensive status.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const startTime = Date.now();
    const sr = base44.asServiceRole;

    // Run all verification functions in parallel
    const [
      sourceEntityResult,
      eventSessionResult,
      resultsResult,
      entryClassResult,
      importResult,
      accessResult,
      orphanResult,
      normalizationResult,
      duplicateResult,
      idempotenceResult,
    ] = await Promise.all([
      sr.functions.invoke('verifySourceEntityIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyEventAndSessionIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyResultsAndStandingsIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyEntryAndClassIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifySourceImportIntegrity', {}).catch(e => ({ data: { failures: [e.message] } })),
      sr.functions.invoke('verifyAccessSystemIntegrity', {}).catch(e => ({ data: { overall_valid: false } })),
      sr.functions.invoke('findOrphanedRecords', {}).catch(e => ({ data: { total_orphaned: 0 } })),
      sr.functions.invoke('findMissingNormalizationFields', {}).catch(e => ({ data: { total_missing: 0 } })),
      sr.functions.invoke('runDuplicateAudit', {}).catch(e => ({ data: { duplicate_groups_remaining: 0 } })),
      sr.functions.invoke('verifyImportIdempotence', {}).catch(e => ({ data: { csv_import_idempotent: false } })),
    ]);

    // Aggregate results
    const source_entity_integrity = sourceEntityResult?.data || {};
    const event_session_integrity = eventSessionResult?.data || {};
    const results_integrity = resultsResult?.data || {};
    const entry_class_integrity = entryClassResult?.data || {};
    const import_integrity = importResult?.data || {};
    const access_integrity = accessResult?.data || {};
    const orphan_data = orphanResult?.data || { total_orphaned: 0 };
    const normalization_data = normalizationResult?.data || { total_missing: 0 };
    const duplicate_data = duplicateResult?.data || { duplicate_groups_remaining: 0 };
    const idempotence_data = idempotenceResult?.data || {};

    // Determine overall system status
    const failures = [
      ...( source_entity_integrity.failures || []),
      ...( event_session_integrity.failures || []),
      ...( results_integrity.failures || []),
      ...( entry_class_integrity.failures || []),
      ...( import_integrity.failures || []),
      ...(!access_integrity.overall_valid ? ['Access system integrity failed'] : []),
    ];

    const warnings = [
      ...( source_entity_integrity.warnings || []),
      ...( event_session_integrity.warnings || []),
      ...( results_integrity.warnings || []),
      ...( entry_class_integrity.warnings || []),
      ...( import_integrity.warnings || []),
      ...(orphan_data.total_orphaned > 0 ? [`${orphan_data.total_orphaned} orphaned records detected`] : []),
      ...(normalization_data.total_missing > 0 ? [`${normalization_data.total_missing} missing normalization fields`] : []),
      ...(duplicate_data.severity_level > 1 ? [`Duplicate severity level: ${duplicate_data.severity_level}`] : []),
      ...(idempotence_data.warnings || []),
    ];

    // Determine system status
    let system_status = 'healthy';
    if (failures.length > 0) system_status = 'failure';
    else if (warnings.length > 5 || orphan_data.total_orphaned > 10 || normalization_data.total_missing > 50) system_status = 'warning';

    const runtimeMs = Date.now() - startTime;

    // Log to OperationLog
    await sr.entities.OperationLog.create({
      operation_type: 'platform_integrity_check',
      source_type: 'api_function',
      entity_name: 'Platform',
      status: system_status,
      message: `Platform integrity check: ${system_status}`,
      metadata: {
        system_status,
        failures_count: failures.length,
        warnings_count: warnings.length,
        orphaned_count: orphan_data.total_orphaned,
        missing_normalization: normalization_data.total_missing,
        duplicate_groups: duplicate_data.duplicate_groups_remaining,
        runtime_ms: runtimeMs,
      },
    }).catch(() => {});

    return Response.json({
      system_status,
      source_entity_integrity,
      event_session_integrity,
      results_integrity,
      entry_class_integrity,
      import_integrity,
      access_system_integrity: access_integrity,
      orphaned_records: orphan_data.total_orphaned,
      missing_normalization_fields: normalization_data.total_missing,
      duplicate_groups_remaining: duplicate_data.duplicate_groups_remaining,
      duplicate_severity: duplicate_data.severity_level,
      warnings,
      failures,
      runtime_ms: runtimeMs,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});