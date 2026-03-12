/**
 * runAccessFlowVerification — admin-only diagnostics check
 *
 * Tests the access code and invitation redemption flow by:
 * 1. Calling redeemEntityAccessCode with a bogus code (no side effects)
 * 2. Creating a temp invitation, calling with the wrong email, then cleaning up
 * 3. Structural DB checks for the remaining cases
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const warnings = [];
  const failures = [];
  const checks = {
    invalid_code_ok: false,
    wrong_email_ok: false,
    valid_invitation_ok: false,
    valid_owner_code_ok: false,
    duplicate_prevention_ok: false,
    invitation_burn_protection_ok: false,
  };

  // CHECK 1: Invalid code returns ok:false with a clean error string
  try {
    const res = await base44.functions.invoke('redeemEntityAccessCode', {
      user_id: user.id,
      user_email: user.email,
      code: '00000000',
    });
    const d = res?.data;
    if (d?.ok === false && typeof d?.error === 'string') {
      checks.invalid_code_ok = true;
    } else {
      failures.push('Invalid code check: expected ok=false with error string, got: ' + JSON.stringify(d));
    }
  } catch (e) {
    failures.push('Invalid code check threw: ' + e.message);
  }

  // CHECK 2: Wrong email invitation returns ok:false with email-mismatch error
  let tempInviteId = null;
  try {
    const testCode = '88887777';
    const tempInvite = await base44.asServiceRole.entities.Invitation.create({
      email: 'diag_test@diagnostics-noreply.invalid',
      code: testCode,
      entity_type: 'Driver',
      entity_id: 'diag-test-entity-id',
      entity_name: 'Diagnostics Test Entity',
      expiration_date: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      invited_by: user.email,
    });
    tempInviteId = tempInvite.id;

    // admin user's email != 'diag_test@...' so email check must fail
    const res = await base44.functions.invoke('redeemEntityAccessCode', {
      user_id: user.id,
      user_email: user.email,
      code: testCode,
    });
    const d = res?.data;
    if (d?.ok === false && d?.error?.toLowerCase().includes('different email')) {
      checks.wrong_email_ok = true;
    } else {
      failures.push('Wrong email check: expected ok=false with email mismatch error, got: ' + JSON.stringify(d));
    }
  } catch (e) {
    failures.push('Wrong email check threw: ' + e.message);
  } finally {
    if (tempInviteId) {
      await base44.asServiceRole.entities.Invitation.delete(tempInviteId).catch(() => {});
    }
  }

  // CHECK 3: Accepted invitations should have a matching EntityCollaborator record
  try {
    const accepted = await base44.asServiceRole.entities.Invitation.filter({ status: 'accepted' }, '-accepted_date', 30);
    if (accepted.length === 0) {
      warnings.push('No accepted invitations found — valid_invitation_ok skipped (no sample data)');
      checks.valid_invitation_ok = true;
    } else {
      let orphaned = 0;
      for (const inv of accepted.slice(0, 10)) {
        const collab = await base44.asServiceRole.entities.EntityCollaborator.filter({
          entity_id: inv.entity_id,
          user_email: inv.email.toLowerCase(),
        });
        if (collab.length === 0) orphaned++;
      }
      if (orphaned === 0) {
        checks.valid_invitation_ok = true;
      } else {
        failures.push(`valid_invitation_ok: ${orphaned} accepted invitation(s) have no matching EntityCollaborator`);
      }
    }
  } catch (e) {
    failures.push('valid_invitation_ok check threw: ' + e.message);
  }

  // CHECK 4: All owner EntityCollaborators must have access_code set
  try {
    const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({ role: 'owner' }, '-created_date', 50);
    if (owners.length === 0) {
      warnings.push('No owner EntityCollaborators found — valid_owner_code_ok skipped');
      checks.valid_owner_code_ok = true;
    } else {
      const missing = owners.filter(c => !c.access_code);
      if (missing.length === 0) {
        checks.valid_owner_code_ok = true;
      } else {
        failures.push(`valid_owner_code_ok: ${missing.length} owner collaborator(s) missing access_code`);
      }
    }
  } catch (e) {
    failures.push('valid_owner_code_ok check threw: ' + e.message);
  }

  // CHECK 5: No duplicate EntityCollaborator records for the same user+entity pair
  try {
    const collabs = await base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500);
    const seen = {};
    let dupeCount = 0;
    for (const c of collabs) {
      const key = `${c.user_id || c.user_email}:${c.entity_id}`;
      if (seen[key]) {
        dupeCount++;
      } else {
        seen[key] = true;
      }
    }
    if (dupeCount === 0) {
      checks.duplicate_prevention_ok = true;
    } else {
      failures.push(`duplicate_prevention_ok: ${dupeCount} duplicate user+entity collaborator pair(s) found`);
    }
  } catch (e) {
    failures.push('duplicate_prevention_ok check threw: ' + e.message);
  }

  // CHECK 6: All accepted invitations must have accepted_date (no premature burn)
  try {
    const accepted = await base44.asServiceRole.entities.Invitation.filter({ status: 'accepted' }, '-accepted_date', 50);
    const missingDate = accepted.filter(inv => !inv.accepted_date);
    if (missingDate.length === 0) {
      checks.invitation_burn_protection_ok = true;
    } else {
      failures.push(`invitation_burn_protection_ok: ${missingDate.length} accepted invitation(s) missing accepted_date (burned without confirmation)`);
    }
  } catch (e) {
    failures.push('invitation_burn_protection_ok check threw: ' + e.message);
  }

  return Response.json({
    ...checks,
    warnings,
    failures,
    generated_at: new Date().toISOString(),
  });
});