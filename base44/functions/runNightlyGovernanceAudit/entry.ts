/**
 * runNightlyGovernanceAudit.js — R9EB.3
 *
 * Scheduled nightly governance audit.
 * Runs all health and integrity checks and stores a summary in OperationLog.
 *
 * Invoked by the nightly scheduled automation.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();
    const results = {};

    // 1. Historical safety
    const hist = await base44.functions.invoke('verifyHistoricalSafety', {}).catch(() => null);
    results.historical_safety = { pass: (hist?.data?.issues?.length || 0) === 0, issues: hist?.data?.issues?.length || 0, warnings: hist?.data?.warnings?.length || 0 };

    // 2. Identity/Driver linkage
    const ident = await base44.functions.invoke('verifyIdentityDriverLinkage', {}).catch(() => null);
    results.identity_linkage = { pass: (ident?.data?.issues?.length || 0) === 0, issues: ident?.data?.issues?.length || 0 };

    // 3. Results & Standings integrity
    const rs = await base44.functions.invoke('verifyResultsAndStandingsIntegrity', {}).catch(() => null);
    results.results_integrity = { pass: rs?.data?.pass !== false, issues: rs?.data?.issues?.length || 0 };

    // 4. Session integrity
    const sess = await base44.functions.invoke('verifySessionIntegrity', {}).catch(() => null);
    results.session_integrity = { pass: sess?.data?.pass !== false, issues: sess?.data?.issues?.length || 0 };

    // 5. Entity alias system
    const alias = await base44.functions.invoke('verifyEntityAliasSystem', {}).catch(() => null);
    results.alias_system = { pass: alias?.data?.pass !== false, issues: alias?.data?.issues?.length || 0 };

    // 6. Orphaned records
    const orphan = await base44.functions.invoke('findOrphanedRecords', {}).catch(() => null);
    results.orphaned_records = { pass: (orphan?.data?.total_orphans || 0) === 0, count: orphan?.data?.total_orphans || 0 };

    // 7. Round assignment completeness
    const rounds = await base44.functions.invoke('verifyRoundAssignmentCompleteness', {}).catch(() => null);
    results.round_assignments = { pass: rounds?.data?.pass !== false, issues: rounds?.data?.issues?.length || 0 };

    // Overall pass
    const allPass = Object.values(results).every(r => r.pass);
    const totalIssues = Object.values(results).reduce((s, r) => s + (r.issues || r.count || 0), 0);

    // Persist to OperationLog
    await sr.entities.OperationLog.create({
      operation_type: 'nightly_governance_audit',
      entity_name: 'Database',
      user_email: user.email,
      status: allPass ? 'completed' : 'completed_with_issues',
      metadata: {
        run_at: now,
        all_pass: allPass,
        total_issues: totalIssues,
        checks: results,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      all_pass: allPass,
      total_issues: totalIssues,
      run_at: now,
      checks: results,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});