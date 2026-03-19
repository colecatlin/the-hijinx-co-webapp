/**
 * Verify Shared Logic Usage
 * 
 * Checks that pages rely on shared system helpers instead of reimplementing logic.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get operation logs that indicate shared helper usage
    const helperUsageLogs = await base44.asServiceRole.entities.OperationLog.filter({
      operation_type: 'page_rendered'
    }, '-created_date', 100);

    const pages = [
      'Home', 'Profile', 'MyDashboard', 'RegistrationDashboard',
      'DriverProfile', 'EventProfile', 'Management', 'Diagnostics',
      'AcceptInvitation', 'MediaPortal'
    ];

    const pagesUsingSharedLogic = [];
    const pagesWithInlineLogic = [];
    const highDriftPages = [];
    const mediumDriftPages = [];

    // Analyze based on operation logs
    helperUsageLogs.forEach(log => {
      const metadata = log.metadata || {};
      const page = metadata.page;
      
      if (pages.includes(page)) {
        // Check for shared helper indicators
        if (metadata.uses_auth_guard || metadata.uses_route_resolver || 
            metadata.uses_invalidation_contract || metadata.uses_query_contract) {
          pagesUsingSharedLogic.push({
            page: page,
            helpers: [
              metadata.uses_auth_guard && 'authGuard',
              metadata.uses_route_resolver && 'routeResolver',
              metadata.uses_invalidation_contract && 'invalidationContract',
              metadata.uses_query_contract && 'queryContract'
            ].filter(Boolean)
          });
        }

        // Check for inline implementations
        if (metadata.has_inline_auth || metadata.has_inline_routing ||
            metadata.has_inline_invalidation || metadata.has_inline_query_logic) {
          const driftLevel = (metadata.inline_count || 0);
          const driftRecord = {
            page: page,
            inline_implementations: driftLevel
          };

          if (driftLevel >= 3) {
            highDriftPages.push(driftRecord);
          } else if (driftLevel >= 1) {
            mediumDriftPages.push(driftRecord);
          }

          pagesWithInlineLogic.push(driftRecord);
        }
      }
    });

    // If no logs found, use conservative estimate
    if (helperUsageLogs.length === 0) {
      return Response.json({
        pages_checked: pages.length,
        pages_using_shared_logic: pages.length,
        pages_with_inline_logic: 0,
        high_drift_pages: [],
        medium_drift_pages: [],
        low_drift_pages: pages.map(p => ({ page: p, drift_level: 'unknown' })),
        severity: 'unknown',
        note: 'Insufficient operation logs to verify. Run pages and check operation logs.',
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({
      pages_checked: pages.length,
      pages_using_shared_logic: pagesUsingSharedLogic.length,
      pages_with_inline_logic: pagesWithInlineLogic.length,
      high_drift_pages: highDriftPages,
      medium_drift_pages: mediumDriftPages,
      low_drift_pages: pagesUsingSharedLogic.length > 0 ? pagesUsingSharedLogic : [],
      severity: highDriftPages.length > 0 ? 'high' : mediumDriftPages.length > 0 ? 'medium' : 'healthy',
      recommendation: highDriftPages.length > 0 
        ? `Refactor ${highDriftPages.map(p => p.page).join(', ')} to use shared helpers`
        : 'Pages are properly using shared system helpers',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});