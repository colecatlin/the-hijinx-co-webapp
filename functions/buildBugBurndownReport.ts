/**
 * buildBugBurndownReport.js
 * 
 * Builds a comprehensive bug burndown report from post-cleanup verification.
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

    // Get latest post-cleanup verification
    const latestVerification = await sr.functions.invoke('runPostCleanupVerification', {}).catch(e => ({ data: { summary: {} } }));
    const verification = latestVerification?.data || {};

    // Get recent operation logs to track what was resolved
    const opLogs = await sr.entities.OperationLog.list('-created_date', 50, 0);
    const recentOperations = opLogs.filter(log => {
      const logDate = log.created_date ? new Date(log.created_date) : null;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return logDate && logDate >= oneWeekAgo && 
             (log.metadata?.fixed_critical || log.metadata?.fixed_high || log.metadata?.operation_type === 'bug_fix');
    });

    const resolved_this_pass = recentOperations.reduce((sum, op) => {
      return sum + (op.metadata?.fixed_critical || 0) + (op.metadata?.fixed_high || 0);
    }, 0);

    // Determine launch blockers
    const launch_blockers = [];
    
    if (verification.summary?.critical_open > 0) {
      launch_blockers.push({
        issue: `${verification.summary.critical_open} critical bug(s) open`,
        must_fix_before_launch: true,
      });
    }

    if (verification.platform_health?.system_status === 'failure' || verification.platform_health?.system_status === 'error') {
      launch_blockers.push({
        issue: 'Platform system status not healthy',
        must_fix_before_launch: true,
      });
    }

    if (verification.platform_health?.duplicate_severity >= 2) {
      launch_blockers.push({
        issue: 'Duplicate creation risk still high',
        must_fix_before_launch: true,
      });
    }

    if ((verification.platform_health?.orphaned_records || 0) > 100) {
      launch_blockers.push({
        issue: 'High number of orphaned records',
        must_fix_before_launch: false,
        note: 'Should be cleaned up but not a blocker',
      });
    }

    // Calculate remaining backlog
    const remaining_backlog = [
      ...(verification.medium_priority_bugs || []),
      ...(verification.low_priority_items || []),
    ];

    // Determine readiness
    const is_launch_ready = verification.summary?.critical_open === 0 && launch_blockers.filter(b => b.must_fix_before_launch).length === 0;

    return Response.json({
      critical_open: verification.summary?.critical_open || 0,
      high_open: verification.summary?.high_open || 0,
      medium_open: verification.summary?.medium_open || 0,
      low_open: verification.summary?.low_open || 0,
      resolved_this_pass,
      remaining_backlog: remaining_backlog.length,
      launch_blockers,
      is_launch_ready,
      latest_verification: {
        platform_status: verification.platform_status,
        system_status: verification.platform_health?.system_status,
        duplicate_severity: verification.platform_health?.duplicate_severity,
        orphaned_records: verification.platform_health?.orphaned_records,
        missing_normalization: verification.platform_health?.missing_normalization,
      },
      recommendations: [
        ...(verification.summary?.critical_open > 0 ? ['Fix all critical bugs before launch'] : []),
        ...(verification.summary?.high_open > 0 ? ['Review and prioritize high-priority bugs'] : []),
        ...(verification.platform_health?.duplicate_severity >= 1 ? ['Run duplicate cleanup if not already done'] : []),
        ...(!is_launch_ready ? [] : ['Platform is launch-ready with monitored medium/low backlog']),
      ],
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});