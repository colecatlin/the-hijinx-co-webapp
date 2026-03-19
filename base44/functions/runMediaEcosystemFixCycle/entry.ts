/**
 * runMediaEcosystemFixCycle
 *
 * Structured fix cycle for media ecosystem issues.
 * Default mode: dry_run=true — scans and classifies issues without writing data.
 * Pass dry_run=false to apply safe fixes.
 *
 * Admin-only. All fixes are logged and returned.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default true

    const db = base44.asServiceRole.entities;
    const started_at = new Date().toISOString();
    const fix_log = [];
    let fixes_applied = 0;
    let fixes_failed = 0;

    const logFix = (id, category, severity, issue, root_cause, fix_applied, entities_affected, resolved, notes = '') => {
      fix_log.push({ fix_id: id, category, severity, issue_description: issue, root_cause, fix_applied, entities_affected, routes_affected: [], resolved_boolean: resolved, resolved_at: resolved ? new Date().toISOString() : null, notes });
    };

    const safe = (p) => p.catch(() => []);

    // Single parallel fetch — limited to avoid CPU timeout
    const [
      profiles, outlets, assets, assignments, paymentAccounts, credentialRequests,
    ] = await Promise.all([
      safe(db.MediaProfile.list('-created_date', 30)),
      safe(db.MediaOutlet.list('-created_date', 30)),
      safe(db.MediaAsset.list('-created_date', 30)),
      safe(db.MediaAssignment.list('-created_date', 30)),
      safe(db.PaymentAccount.list('-created_date', 20)),
      safe(db.CredentialRequest.list('-created_date', 30)),
    ]);

    // ── FIX 1.1: public_access=true assets with rights not cleared ────────────
    const publicAssetsNoRights = assets.filter(a => a.public_access === true && a.rights_status !== 'cleared' && a.status !== 'approved');
    if (publicAssetsNoRights.length > 0 && !dry_run) {
      const updates = publicAssetsNoRights.map(a => db.MediaAsset.update(a.id, { public_access: false }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
      fixes_failed += results.filter(r => r === null).length;
    }
    logFix('FIX-1.1', 'access_control', 'critical',
      publicAssetsNoRights.length > 0 ? `${publicAssetsNoRights.length} asset(s) public_access=true with rights not cleared` : 'public_access rights gate',
      'public_access set true before rights clearance',
      dry_run ? `Would set public_access=false on ${publicAssetsNoRights.length} asset(s)` : `Set public_access=false on ${publicAssetsNoRights.length} asset(s)`,
      ['MediaAsset'],
      publicAssetsNoRights.length === 0 || !dry_run,
      publicAssetsNoRights.length > 0 ? `IDs: ${publicAssetsNoRights.slice(0, 5).map(a => a.id).join(', ')}` : 'Clean'
    );

    // ── FIX 1.2: public_visible profiles with hidden/draft status ─────────────
    const inconsistentProfiles = profiles.filter(p => p.public_visible === true && (p.profile_status === 'hidden' || p.profile_status === 'draft'));
    if (inconsistentProfiles.length > 0 && !dry_run) {
      const updates = inconsistentProfiles.map(p => db.MediaProfile.update(p.id, { public_visible: false }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
      fixes_failed += results.filter(r => r === null).length;
    }
    logFix('FIX-1.2', 'access_control', 'high',
      inconsistentProfiles.length > 0 ? `${inconsistentProfiles.length} profile(s) public_visible=true but status=hidden/draft` : 'Profile visibility consistency',
      'public_visible not cleared when profile hidden/drafted',
      dry_run ? `Would set public_visible=false on ${inconsistentProfiles.length} profile(s)` : `Set public_visible=false on ${inconsistentProfiles.length} profile(s)`,
      ['MediaProfile'],
      inconsistentProfiles.length === 0 || !dry_run,
      inconsistentProfiles.length === 0 ? 'Clean' : `IDs: ${inconsistentProfiles.slice(0, 5).map(p => p.id).join(', ')}`
    );

    // ── FIX 1.3: payout_profile_ready on non-eligible profiles ───────────────
    const wrongPayoutFlag = profiles.filter(p => p.payout_profile_ready === true && p.monetization_eligible === false);
    if (wrongPayoutFlag.length > 0 && !dry_run) {
      const updates = wrongPayoutFlag.map(p => db.MediaProfile.update(p.id, { payout_profile_ready: false }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-1.3', 'access_control', 'medium',
      wrongPayoutFlag.length > 0 ? `${wrongPayoutFlag.length} profile(s) payout_profile_ready=true but not monetization_eligible` : 'Monetization flag consistency',
      'payout_profile_ready set without monetization_eligible gate',
      dry_run ? `Would clear payout_profile_ready on ${wrongPayoutFlag.length} profile(s)` : `Cleared on ${wrongPayoutFlag.length} profile(s)`,
      ['MediaProfile'], wrongPayoutFlag.length === 0 || !dry_run,
      wrongPayoutFlag.length === 0 ? 'Clean' : ''
    );

    // ── FIX 2.1: Direct publish trust violations ──────────────────────────────
    const trustViolators = profiles.filter(p =>
      p.can_publish_without_review === true &&
      !['verified_writer', 'senior_writer', 'editor'].includes(p.writer_trust_level)
    );
    if (trustViolators.length > 0 && !dry_run) {
      const updates = trustViolators.map(p => db.MediaProfile.update(p.id, { can_publish_without_review: false }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-2.1', 'editorial_integration', 'critical',
      trustViolators.length > 0 ? `${trustViolators.length} profile(s) can_publish_without_review=true but trust level insufficient` : 'Direct publish trust gate',
      'can_publish_without_review granted without verifying writer_trust_level',
      dry_run ? `Would revoke can_publish_without_review on ${trustViolators.length} profile(s)` : `Revoked on ${trustViolators.length} profile(s)`,
      ['MediaProfile'], trustViolators.length === 0 || !dry_run,
      trustViolators.length === 0 ? 'Clean' : `IDs: ${trustViolators.map(p => p.id).join(', ')}`
    );

    // ── FIX 2.2: Active profiles missing slugs ───────────────────────────────
    const activeMissingSlug = profiles.filter(p => !p.slug && p.profile_status === 'active' && p.display_name);
    if (activeMissingSlug.length > 0 && !dry_run) {
      const updates = activeMissingSlug.map(p => {
        const slug = p.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return db.MediaProfile.update(p.id, { slug }).catch(() => null);
      });
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-2.2', 'slug_system', 'medium',
      activeMissingSlug.length > 0 ? `${activeMissingSlug.length} active MediaProfile(s) missing slug` : 'Profile slug completeness',
      'slug not auto-generated on creation',
      dry_run ? `Would generate slugs for ${activeMissingSlug.length} profile(s)` : `Generated slugs for ${activeMissingSlug.length} profile(s)`,
      ['MediaProfile'], activeMissingSlug.length === 0 || !dry_run,
      activeMissingSlug.length === 0 ? 'Clean' : ''
    );

    // ── FIX 2.3: Active outlets missing slugs ────────────────────────────────
    const activeMissingOutletSlug = outlets.filter(o => !o.slug && o.outlet_status === 'active' && o.name);
    if (activeMissingOutletSlug.length > 0 && !dry_run) {
      const updates = activeMissingOutletSlug.map(o => {
        const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return db.MediaOutlet.update(o.id, { slug }).catch(() => null);
      });
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-2.3', 'slug_system', 'medium',
      activeMissingOutletSlug.length > 0 ? `${activeMissingOutletSlug.length} active MediaOutlet(s) missing slug` : 'Outlet slug completeness',
      'slug not auto-generated on creation',
      dry_run ? `Would generate slugs for ${activeMissingOutletSlug.length} outlet(s)` : `Generated slugs for ${activeMissingOutletSlug.length} outlet(s)`,
      ['MediaOutlet'], activeMissingOutletSlug.length === 0 || !dry_run,
      activeMissingOutletSlug.length === 0 ? 'Clean' : ''
    );

    // ── FIX 3.1: Credential requests approved without reviewer ───────────────
    const autoApprovedCreds = credentialRequests.filter(r => r.status === 'approved' && !r.reviewed_by_user_id);
    logFix('FIX-3.1', 'credential_integration', 'medium',
      autoApprovedCreds.length > 0 ? `${autoApprovedCreds.length} CredentialRequest(s) approved without reviewed_by_user_id` : 'Credential approval authority',
      'reviewed_by_user_id not populated during approval',
      autoApprovedCreds.length > 0 ? 'Flagged for manual admin review — audit trail preserved, no auto-fix applied' : 'No action needed',
      ['CredentialRequest'],
      autoApprovedCreds.length === 0,
      autoApprovedCreds.length > 0 ? `IDs requiring review: ${autoApprovedCreds.slice(0, 5).map(r => r.id).join(', ')}` : 'Clean'
    );

    // ── FIX 4.1: Cancelled assignments missing timestamp ─────────────────────
    const cancelledNoTs = assignments.filter(a => a.status === 'cancelled' && !a.cancelled_at);
    if (cancelledNoTs.length > 0 && !dry_run) {
      const ts = new Date().toISOString();
      const updates = cancelledNoTs.map(a => db.MediaAssignment.update(a.id, { cancelled_at: ts }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-4.1', 'assignment_workflow', 'low',
      cancelledNoTs.length > 0 ? `${cancelledNoTs.length} cancelled assignment(s) missing cancelled_at` : 'Assignment cancelled_at coverage',
      'timestamp not set on status change',
      dry_run ? `Would backfill cancelled_at on ${cancelledNoTs.length} record(s)` : `Backfilled ${cancelledNoTs.length} record(s)`,
      ['MediaAssignment'], cancelledNoTs.length === 0 || !dry_run,
      cancelledNoTs.length === 0 ? 'Clean' : ''
    );

    // ── FIX 4.2: Completed assignments missing timestamp ─────────────────────
    const completedNoTs = assignments.filter(a => a.status === 'completed' && !a.completed_at);
    if (completedNoTs.length > 0 && !dry_run) {
      const ts = new Date().toISOString();
      const updates = completedNoTs.map(a => db.MediaAssignment.update(a.id, { completed_at: ts }).catch(() => null));
      const results = await Promise.all(updates);
      fixes_applied += results.filter(Boolean).length;
    }
    logFix('FIX-4.2', 'assignment_workflow', 'low',
      completedNoTs.length > 0 ? `${completedNoTs.length} completed assignment(s) missing completed_at` : 'Assignment completed_at coverage',
      'timestamp not set on status change',
      dry_run ? `Would backfill completed_at on ${completedNoTs.length} record(s)` : `Backfilled ${completedNoTs.length} record(s)`,
      ['MediaAssignment'], completedNoTs.length === 0 || !dry_run,
      completedNoTs.length === 0 ? 'Clean' : ''
    );

    // ── FIX 5.1: Stripe payout inconsistency — flag only ─────────────────────
    const inconsistentPayAccounts = paymentAccounts.filter(a => a.account_status === 'active' && !a.payouts_enabled);
    logFix('FIX-5.1', 'payments_and_stripe', 'medium',
      inconsistentPayAccounts.length > 0 ? `${inconsistentPayAccounts.length} active PaymentAccount(s) with payouts_enabled=false` : 'PaymentAccount payout consistency',
      'account_status set active without syncing payouts_enabled from Stripe',
      inconsistentPayAccounts.length > 0 ? 'Run syncStripeAccountStatus to resync Stripe state' : 'No action needed',
      ['PaymentAccount'],
      inconsistentPayAccounts.length === 0,
      inconsistentPayAccounts.length > 0 ? `IDs: ${inconsistentPayAccounts.slice(0, 5).map(a => a.id).join(', ')}` : 'Clean'
    );

    // ── Summary ───────────────────────────────────────────────────────────────
    const resolved_count = fix_log.filter(f => f.resolved_boolean).length;
    const unresolved_count = fix_log.filter(f => !f.resolved_boolean).length;
    const critical_issues = fix_log.filter(f => f.severity === 'critical' && !f.resolved_boolean);
    const overall_stable = critical_issues.length === 0;

    // Log operation
    try {
      await db.OperationLog.create({
        entity_name: 'System',
        entity_id: 'media_ecosystem',
        operation_type: dry_run ? 'bug_fix_cycle_started' : (overall_stable ? 'media_ecosystem_stabilized' : 'bug_fix_applied'),
        status: overall_stable ? 'success' : 'warning',
        description: dry_run
          ? `Fix cycle DRY RUN — ${fix_log.length} issues scanned, ${unresolved_count} would need fixes`
          : `Fix cycle applied — ${fixes_applied} fixes applied, ${fixes_failed} failed`,
        metadata: { dry_run, fixes_applied, fixes_failed, issues_reviewed: fix_log.length, resolved_count, unresolved_count, acted_by_user_id: user.id },
      });
    } catch (_) {}

    return Response.json({
      fix_cycle_status: overall_stable ? 'stabilized' : 'issues_remain',
      mode: dry_run ? 'dry_run' : 'live',
      started_at,
      completed_at: new Date().toISOString(),
      fixes_applied: dry_run ? 0 : fixes_applied,
      fixes_failed: dry_run ? 0 : fixes_failed,
      issues_reviewed: fix_log.length,
      resolved_count,
      unresolved_count,
      launch_ready: overall_stable,
      fix_log,
      issues_by_severity: {
        critical: fix_log.filter(f => f.severity === 'critical'),
        high:     fix_log.filter(f => f.severity === 'high'),
        medium:   fix_log.filter(f => f.severity === 'medium'),
        low:      fix_log.filter(f => f.severity === 'low'),
      },
      issues_by_category: fix_log.reduce((acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push(f);
        return acc;
      }, {}),
      categories_addressed: [...new Set(fix_log.map(f => f.category))],
      unresolved_items: fix_log.filter(f => !f.resolved_boolean),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});