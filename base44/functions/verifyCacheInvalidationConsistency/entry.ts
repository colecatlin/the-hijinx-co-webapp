/**
 * Verify Cache Invalidation Consistency
 * 
 * Confirms mutations invalidate queries through the shared invalidation contract.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get mutation operation logs
    const mutationLogs = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: { $in: [
        'profile_saved',
        'invitation_accepted',
        'access_code_redeemed',
        'claim_approved',
        'entity_edited',
        'entity_created',
        'access_code_regenerated',
        'invitation_created',
        'invitation_revoked'
      ] }
    }, '-created_date', 100);

    const violations = [];
    const compliantPaths = [];
    const inlineInvalidation = [];

    mutationLogs.forEach(log => {
      const metadata = log.metadata || {};
      
      // Check for invalidation contract usage
      if (metadata.invalidation_group) {
        compliantPaths.push({
          operation: log.operation_type,
          invalidation_group: metadata.invalidation_group,
          contract_used: true
        });
      } else if (metadata.manual_invalidation) {
        // Check if inline invalidation is being done
        inlineInvalidation.push({
          operation: log.operation_type,
          manual_keys: metadata.manual_invalidation_keys || [],
          severity: 'medium'
        });
        
        violations.push({
          issue: `Manual invalidation used in ${log.operation_type}`,
          severity: 'medium',
          operation: log.operation_type
        });
      } else if (log.operation_type && !metadata.invalidation_group) {
        // Missing invalidation entirely
        violations.push({
          issue: `No invalidation recorded for ${log.operation_type}`,
          severity: 'high',
          operation: log.operation_type
        });
      }
    });

    // Check for page-specific query strings
    const pageSpecificLogs = mutationLogs.filter(log => {
      const metadata = log.metadata || {};
      return metadata.query_key && !metadata.query_key.includes('group_');
    });

    if (pageSpecificLogs.length > 0) {
      violations.push({
        issue: 'Page-specific query strings detected instead of invalidation contract',
        severity: 'high',
        count: pageSpecificLogs.length
      });
    }

    const expectedMutations = 9; // See part 4 list
    const checkedMutations = mutationLogs.length;

    return Response.json({
      mutation_paths_checked: checkedMutations,
      compliant_paths: compliantPaths.length,
      inline_invalidation_found: inlineInvalidation.length,
      violations: violations,
      severity: violations.length === 0 ? 'healthy' : 
                violations.some(v => v.severity === 'high') ? 'high' : 'medium',
      coverage: `${compliantPaths.length} of ${checkedMutations} mutations use invalidation contract`,
      recommendation: violations.length === 0
        ? 'Cache invalidation is consistent across mutations'
        : 'Ensure all mutations use the shared invalidation contract',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});