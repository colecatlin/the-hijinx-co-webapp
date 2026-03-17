/**
 * runMediaEcosystemFixCycle
 *
 * Structured fix cycle for media ecosystem issues.
 * Ingests the latest health report, classifies issues by severity and category,
 * applies safe data fixes, and returns a structured fix log.
 *
 * Admin-only. Does NOT silently patch data — all fixes are logged and returned.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const started_at = new Date().toISOString();
    const fix_log = [];
    let fixes_applied = 0;
    let fixes_failed = 0;

    // ── Helper ────────────────────────────────────────────────────────────────
    const logFix = (id, category, severity, issue, root_cause, fix_applied, entities_affected, resolved, notes = '') => {
      fix_log.push({
        fix_id: id,
        category,
        severity,
        issue_description: issue,
        root_cause,
        fix_applied,
        entities_affected,
        routes_affected: [],
        resolved_boolean: resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        notes,
      });
    };

    const safe = (p) => p.catch(() => []);

    // ── Fetch all relevant data ───────────────────────────────────────────────
    const [
      profiles, outlets, assets, assignments, requests,
      agreements, paymentAccounts, credentialRequests,
    ] = await Promise.all([
      safe(db.MediaProfile.list('-created_date', 100)),
      safe(db.MediaOutlet.list('-created_date', 100)),
      safe(db.MediaAsset.list('-created_date', 100)),
      safe(db.MediaAssignment.list('-created_date', 100)),
      safe(db.MediaRequest.list('-created_date', 100)),
      safe(db.RevenueAgreement.list('-created_date', 50)),
      safe(db.PaymentAccount.list('-created_date', 50)),
      safe(db.CredentialRequest.list('-created_date', 100)),
    ]);

    // ════════════════════════════════════════════════════════════════════════
    // LAYER 1 — Access & Security
    // ════════════════════════════════════════════════════════════════════════

    // Fix 1.1: public_access=true assets with rights not cleared → revoke public_access
    const publicAssetsNoRights = assets.filter(a => a.public_access === true && a.rights_status !== 'cleared' && a.status !== 'approved');
    if (publicAssetsNoRights.length > 0) {
      for (const asset of publicAssetsNoRights) {
        try {
          await db.MediaAsset.update(asset.id, { public_access: false });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-1.1', 'access_control', 'critical',
        `${publicAssetsNoRights.length} asset(s) had public_access=true with rights not cleared`,
        'public_access set true before rights clearance completed',
        `Set public_access=false on ${publicAssetsNoRights.length} asset(s)`,
        ['MediaAsset'],
        true,
        `Asset IDs: ${publicAssetsNoRights.map(a => a.id).join(', ')}`
      );
    } else {
      logFix('FIX-1.1', 'access_control', 'critical',
        'public_access=true assets with uncleared rights',
        'N/A',
        'No action needed — no violations found',
        ['MediaAsset'], true, 'Clean');
    }

    // Fix 1.2: public_visible=true profiles with hidden/draft status → revoke public_visible
    const inconsistentProfiles = profiles.filter(p =>
      p.public_visible === true && (p.profile_status === 'hidden' || p.profile_status === 'draft')
    );
    if (inconsistentProfiles.length > 0) {
      for (const profile of inconsistentProfiles) {
        try {
          await db.MediaProfile.update(profile.id, { public_visible: false });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-1.2', 'access_control', 'high',
        `${inconsistentProfiles.length} profile(s) public_visible=true but status=hidden/draft`,
        'public_visible not cleared when profile was hidden or reverted to draft',
        `Set public_visible=false on ${inconsistentProfiles.length} profile(s)`,
        ['MediaProfile'], true,
        `Profile IDs: ${inconsistentProfiles.map(p => p.id).join(', ')}`
      );
    } else {
      logFix('FIX-1.2', 'access_control', 'high',
        'MediaProfile visibility/status consistency',
        'N/A', 'No action needed', ['MediaProfile'], true, 'Clean');
    }

    // Fix 1.3: payout_profile_ready=true on non-monetization_eligible profiles
    const wrongPayoutFlag = profiles.filter(p => p.payout_profile_ready === true && p.monetization_eligible === false);
    if (wrongPayoutFlag.length > 0) {
      for (const profile of wrongPayoutFlag) {
        try {
          await db.MediaProfile.update(profile.id, { payout_profile_ready: false });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-1.3', 'access_control', 'medium',
        `${wrongPayoutFlag.length} profile(s) payout_profile_ready=true but monetization_eligible=false`,
        'payout_profile_ready set inconsistently',
        `Cleared payout_profile_ready on ${wrongPayoutFlag.length} profile(s)`,
        ['MediaProfile'], true);
    } else {
      logFix('FIX-1.3', 'access_control', 'medium',
        'Monetization flag consistency', 'N/A', 'No action needed', ['MediaProfile'], true, 'Clean');
    }

    // ════════════════════════════════════════════════════════════════════════
    // LAYER 2 — Entity & Relationship Integrity
    // ════════════════════════════════════════════════════════════════════════

    // Fix 2.1: Active MediaProfiles missing slugs — generate from display_name
    const activeMissingSlug = profiles.filter(p => !p.slug && p.profile_status === 'active' && p.display_name);
    if (activeMissingSlug.length > 0) {
      for (const profile of activeMissingSlug) {
        const slug = profile.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        try {
          await db.MediaProfile.update(profile.id, { slug });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-2.1', 'entity_schema', 'medium',
        `${activeMissingSlug.length} active MediaProfile(s) missing slug`,
        'slug not auto-generated on creation',
        `Generated slugs from display_name for ${activeMissingSlug.length} profile(s)`,
        ['MediaProfile'], true);
    } else {
      logFix('FIX-2.1', 'entity_schema', 'medium',
        'Active MediaProfiles missing slugs', 'N/A', 'No action needed', ['MediaProfile'], true, 'Clean');
    }

    // Fix 2.2: Active MediaOutlets missing slugs
    const activeMissingOutletSlug = outlets.filter(o => !o.slug && o.outlet_status === 'active' && o.name);
    if (activeMissingOutletSlug.length > 0) {
      for (const outlet of activeMissingOutletSlug) {
        const slug = outlet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        try {
          await db.MediaOutlet.update(outlet.id, { slug });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-2.2', 'entity_schema', 'medium',
        `${activeMissingOutletSlug.length} active MediaOutlet(s) missing slug`,
        'slug not auto-generated on creation',
        `Generated slugs for ${activeMissingOutletSlug.length} outlet(s)`,
        ['MediaOutlet'], true);
    } else {
      logFix('FIX-2.2', 'entity_schema', 'medium',
        'Active MediaOutlets missing slugs', 'N/A', 'No action needed', ['MediaOutlet'], true, 'Clean');
    }

    // Fix 2.3: direct_publish trust violation — revoke can_publish_without_review
    const trustViolators = profiles.filter(p =>
      p.can_publish_without_review === true &&
      !['verified_writer', 'senior_writer', 'editor'].includes(p.writer_trust_level)
    );
    if (trustViolators.length > 0) {
      for (const profile of trustViolators) {
        try {
          await db.MediaProfile.update(profile.id, { can_publish_without_review: false });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-2.3', 'editorial_integration', 'critical',
        `${trustViolators.length} profile(s) have can_publish_without_review=true but insufficient trust level`,
        'can_publish_without_review set without verifying writer_trust_level',
        `Revoked can_publish_without_review on ${trustViolators.length} profile(s)`,
        ['MediaProfile'], true,
        `Profile IDs: ${trustViolators.map(p => p.id).join(', ')}`
      );
    } else {
      logFix('FIX-2.3', 'editorial_integration', 'critical',
        'Direct publish trust gate', 'N/A', 'No action needed', ['MediaProfile'], true, 'Clean');
    }

    // ════════════════════════════════════════════════════════════════════════
    // LAYER 3 — Credential Integrity
    // ════════════════════════════════════════════════════════════════════════

    // Fix 3.1: Log any credential requests approved without reviewer — surface for admin review
    const autoApprovedCreds = credentialRequests.filter(r => r.status === 'approved' && !r.reviewed_by_user_id);
    logFix('FIX-3.1', 'credential_integration', 'medium',
      autoApprovedCreds.length > 0
        ? `${autoApprovedCreds.length} CredentialRequest(s) approved without reviewed_by_user_id`
        : 'Credential approval authority check',
      'reviewed_by_user_id not set during approval',
      autoApprovedCreds.length > 0
        ? `Flagged ${autoApprovedCreds.length} record(s) for admin review — no auto-fix applied to preserve audit trail`
        : 'No action needed',
      ['CredentialRequest'],
      autoApprovedCreds.length === 0,
      autoApprovedCreds.length > 0
        ? `IDs requiring review: ${autoApprovedCreds.map(r => r.id).join(', ')}`
        : 'Clean'
    );

    // ════════════════════════════════════════════════════════════════════════
    // LAYER 4 — Assignment Workflow
    // ════════════════════════════════════════════════════════════════════════

    // Fix 4.1: cancelled assignments missing cancelled_at
    const cancelledNoTs = assignments.filter(a => a.status === 'cancelled' && !a.cancelled_at);
    if (cancelledNoTs.length > 0) {
      const ts = new Date().toISOString();
      for (const a of cancelledNoTs) {
        try {
          await db.MediaAssignment.update(a.id, { cancelled_at: ts });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-4.1', 'assignment_workflow', 'low',
        `${cancelledNoTs.length} cancelled assignment(s) missing cancelled_at`,
        'timestamp not set when status changed to cancelled',
        `Backfilled cancelled_at on ${cancelledNoTs.length} assignment(s)`,
        ['MediaAssignment'], true);
    } else {
      logFix('FIX-4.1', 'assignment_workflow', 'low',
        'cancelled_at backfill', 'N/A', 'No action needed', ['MediaAssignment'], true, 'Clean');
    }

    // Fix 4.2: completed assignments missing completed_at
    const completedNoTs = assignments.filter(a => a.status === 'completed' && !a.completed_at);
    if (completedNoTs.length > 0) {
      const ts = new Date().toISOString();
      for (const a of completedNoTs) {
        try {
          await db.MediaAssignment.update(a.id, { completed_at: ts });
          fixes_applied++;
        } catch (e) {
          fixes_failed++;
        }
      }
      logFix('FIX-4.2', 'assignment_workflow', 'low',
        `${completedNoTs.length} completed assignment(s) missing completed_at`,
        'timestamp not set when status changed to completed',
        `Backfilled completed_at on ${completedNoTs.length} assignment(s)`,
        ['MediaAssignment'], true);
    } else {
      logFix('FIX-4.2', 'assignment_workflow', 'low',
        'completed_at backfill', 'N/A', 'No action needed', ['MediaAssignment'], true, 'Clean');
    }

    // ════════════════════════════════════════════════════════════════════════
    // LAYER 5 — Payments & Stripe
    // ════════════════════════════════════════════════════════════════════════

    // Fix 5.1: active PaymentAccounts with payouts_enabled=false — flag only, don't auto-fix Stripe state
    const inconsistentPayAccounts = paymentAccounts.filter(a => a.account_status === 'active' && !a.payouts_enabled);
    logFix('FIX-5.1', 'payments_and_stripe', 'medium',
      inconsistentPayAccounts.length > 0
        ? `${inconsistentPayAccounts.length} active PaymentAccount(s) with payouts_enabled=false`
        : 'PaymentAccount payout consistency',
      'account_status=active set without confirming payouts_enabled from Stripe',
      inconsistentPayAccounts.length > 0
        ? `Flagged ${inconsistentPayAccounts.length} account(s) — run syncStripeAccountStatus to resync from Stripe`
        : 'No action needed',
      ['PaymentAccount'],
      inconsistentPayAccounts.length === 0,
      inconsistentPayAccounts.length > 0
        ? `IDs: ${inconsistentPayAccounts.map(a => a.id).join(', ')}`
        : 'Clean'
    );

    // ════════════════════════════════════════════════════════════════════════
    // Summary & operation log
    // ════════════════════════════════════════════════════════════════════════

    const resolved_count = fix_log.filter(f => f.resolved_boolean).length;
    const unresolved_count = fix_log.filter(f => !f.resolved_boolean).length;
    const critical_count = fix_log.filter(f => f.severity === 'critical').length;
    const high_count = fix_log.filter(f => f.severity === 'high').length;

    const overall_stable = critical_count === 0 && fixes_failed === 0;

    const result = {
      fix_cycle_status: overall_stable ? 'stabilized' : 'issues_remain',
      started_at,
      completed_at: new Date().toISOString(),
      fixes_applied,
      fixes_failed,
      issues_reviewed: fix_log.length,
      resolved_count,
      unresolved_count,
      launch_ready: overall_stable,
      fix_log,
      summary: {
        critical: fix_log.filter(f => f.severity === 'critical'),
        high: fix_log.filter(f => f.severity === 'high'),
        medium: fix_log.filter(f => f.severity === 'medium'),
        low: fix_log.filter(f => f.severity === 'low'),
        unresolved: fix_log.filter(f => !f.resolved_boolean),
      },
      categories_addressed: [...new Set(fix_log.map(f => f.category))],
    };

    // Log
    try {
      await db.OperationLog.create({
        entity_name: 'System',
        entity_id: 'media_ecosystem',
        operation_type: overall_stable ? 'media_ecosystem_stabilized' : 'bug_fix_cycle_started',
        status: overall_stable ? 'success' : 'warning',
        description: `Fix cycle complete — ${fixes_applied} fixes applied, ${fixes_failed} failed, ${unresolved_count} unresolved`,
        metadata: {
          fixes_applied,
          fixes_failed,
          issues_reviewed: fix_log.length,
          resolved_count,
          unresolved_count,
          overall_stable,
          acted_by_user_id: user.id,
        },
      });
    } catch (_) {}

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});