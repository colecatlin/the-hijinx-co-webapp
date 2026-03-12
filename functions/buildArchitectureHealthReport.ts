/**
 * Build Architecture Health Report
 * 
 * Aggregates results from all architecture verification functions.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call all verification functions in parallel
    const [boundaryResult, userContextResult, sharedLogicResult, invalidationResult, idempotenceResult] = 
      await Promise.all([
        base44.asServiceRole.functions.invoke('verifyOperationalSourceBoundaryIntegrity', {}),
        base44.asServiceRole.functions.invoke('verifyUserContextTruth', {}),
        base44.asServiceRole.functions.invoke('verifySharedLogicUsage', {}),
        base44.asServiceRole.functions.invoke('verifyCacheInvalidationConsistency', {}),
        base44.asServiceRole.functions.invoke('verifyImportIdempotenceSystem', {})
      ]);

    const boundary = boundaryResult.data || { severity: 'unknown' };
    const userContext = userContextResult.data || { severity: 'unknown' };
    const sharedLogic = sharedLogicResult.data || { severity: 'unknown' };
    const invalidation = invalidationResult.data || { severity: 'unknown' };
    const idempotence = idempotenceResult.data || { severity: 'unknown' };

    const warnings = [];
    const failures = [];

    // Aggregate violations
    if (boundary.violations) {
      boundary.violations.forEach(v => {
        if (v.severity === 'critical') failures.push(`Boundary: ${v.issue}`);
        else if (v.severity === 'high') warnings.push(`Boundary: ${v.issue}`);
      });
    }

    if (userContext.violations) {
      userContext.violations.forEach(v => {
        if (v.severity === 'critical') failures.push(`User Context: ${v.issue}`);
        else if (v.severity === 'high') warnings.push(`User Context: ${v.issue}`);
      });
    }

    if (sharedLogic.high_drift_pages && sharedLogic.high_drift_pages.length > 0) {
      warnings.push(`Shared Logic: ${sharedLogic.high_drift_pages.length} pages with high drift`);
    }

    if (invalidation.violations) {
      invalidation.violations.forEach(v => {
        if (v.severity === 'high') warnings.push(`Invalidation: ${v.issue}`);
      });
    }

    if (idempotence.imports_creating_duplicates > 0) {
      failures.push(`Idempotence: ${idempotence.imports_creating_duplicates} imports creating duplicates`);
    }

    // Determine overall status
    let overallStatus = 'healthy';
    if (failures.length > 0) {
      overallStatus = 'critical';
    } else if (warnings.length > 2) {
      overallStatus = 'attention_needed';
    } else if (warnings.length > 0) {
      overallStatus = 'minor_warnings';
    }

    // Build recommendations
    const recommendedActions = [];
    if (boundary.severity === 'critical') {
      recommendedActions.push('URGENT: Stop operational imports — source boundary violated');
    }
    if (userContext.legacy_access_usage_found > 0) {
      recommendedActions.push('Audit user context usage — legacy fields detected in access decisions');
    }
    if (sharedLogic.high_drift_pages && sharedLogic.high_drift_pages.length > 0) {
      recommendedActions.push(`Refactor high-drift pages: ${sharedLogic.high_drift_pages.map(p => p.page).join(', ')}`);
    }
    if (invalidation.inline_invalidation_found > 0) {
      recommendedActions.push('Centralize cache invalidation — manual invalidation found');
    }
    if (idempotence.imports_creating_duplicates > 0) {
      recommendedActions.push('Fix import deduplication — use normalized keys consistently');
    }

    return Response.json({
      operational_boundary_health: {
        status: boundary.severity === 'healthy' ? 'healthy' : 'attention_needed',
        checked: boundary.operational_imports_checked,
        violations: boundary.silent_source_creation_paths_found,
        compliant_paths: boundary.compliant_paths
      },
      user_context_health: {
        status: userContext.legacy_access_usage_found === 0 ? 'healthy' : 'attention_needed',
        legacy_fields_found: userContext.legacy_access_usage_found,
        entity_collaborator_records: userContext.entity_collaborator_records_active
      },
      shared_logic_health: {
        status: sharedLogic.high_drift_pages && sharedLogic.high_drift_pages.length > 0 ? 'attention_needed' : 'healthy',
        pages_checked: sharedLogic.pages_checked,
        high_drift_pages: sharedLogic.high_drift_pages || [],
        medium_drift_pages: sharedLogic.medium_drift_pages || []
      },
      cache_invalidation_health: {
        status: invalidation.severity === 'healthy' ? 'healthy' : 'attention_needed',
        compliant_mutations: invalidation.compliant_paths,
        inline_invalidation_found: invalidation.inline_invalidation_found
      },
      import_idempotence_health: {
        status: idempotence.imports_creating_duplicates === 0 ? 'healthy' : 'critical',
        idempotent_imports: idempotence.idempotent_imports,
        duplicate_creating_imports: idempotence.imports_creating_duplicates
      },
      overall_architecture_status: overallStatus,
      warnings: warnings,
      failures: failures,
      recommended_actions: recommendedActions,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});