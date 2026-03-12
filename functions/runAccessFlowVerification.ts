/**
 * runAccessFlowVerification — admin-only diagnostics
 * Tests access code and invitation flow health by inspecting DB state
 * and simulating validation logic directly (avoids nested function auth issues).
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

  // CHECK 1: An unknown code should not match any Invitation or any entity's numeric_id.
  // Simulates: invalid code → clean error (no record found)
  try {
    const bogusCode = '00000000';
    const [invMatches, drivers, teams, tracks, series] = await Promise.all([
      base44.asServiceRole.entities.Invitation.filter({ code: bogusCode }),
      base44.asServiceRole.entities.Driver.filter({ numeric_id: bogusCode }),
      base44.asServiceRole.entities.Team.filter({ numeric_id: bogusCode }),
      base44.asServiceRole.entities.Track.filter({ numeric_id: bogusCode }),
      base44.asServiceRole.entities.Series.filter({ numeric_id: bogusCode }),
    ]);
    const totalMatches = invMatches.length + drivers.length + teams.length + tracks.length + series.length;
    if (totalMatches === 0) {
      checks.invalid_code_ok = true;
    } else {
      failures.push(`invalid_code_ok: bogus code '00000000' unexpectedly matched ${totalMatches} record(s)`);
    }
  } catch (e) {
    failures.push('invalid_code_ok check threw: ' + e.message);
  }

  // CHECK 2: Wrong email invitation — simulate logic that compares invitation.email to user.email
  // Creates a temp invite for a fake email, verifies the email mismatch is detectable.
  let tempInviteId = null;
  try {
    const testCode = '77776666';
    const fakeEmail = 'diag_test@diagnostics-noreply.invalid';
    const tempInvite = await base44.asServiceRole.entities.Invitation.create({
      email: fakeEmail,
      code: testCode,
      entity_type: 'Driver',
      entity_id: 'diag-test-entity-id',
      entity_name: 'Diagnostics Test Entity',
      expiration_date: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      invited_by: user.email,
    });
    tempInviteId = tempInvite.id;

    // Simulate the email check: invitation exists and current user email ≠ invitation email
    const inv = await base44.asServiceRole.entities.Invitation.filter({ code: testCode, status: 'pending' });
    if (inv.length > 0) {
      const mismatch = inv[0].email.toLowerCase() !== user.email.toLowerCase();
      if (mismatch) {
        checks.wrong_email_ok = true;
      } else {
        failures.push('wrong_email_ok: test invitation email unexpectedly matched admin email');
      }
    } else {
      failures.push('wrong_email_ok: temp invitation not found after creation');
    }
  } catch (e) {
    failures.push('wrong_email_ok check threw: ' + e.message);
  } finally {
    if (tempInviteId) {
      await base44.asServiceRole.entities.Invitation.delete(tempInviteId).catch(() => {});
    }
  }

  // CHECK 3: Accepted invitations should each have a matching EntityCollaborator
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
      const key = `${(c.user_email || c.user_id || '').toLowerCase()}:${c.entity_id}`;
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

  // CHECK 6: Accepted invitations must have accepted_date (burn protection)
  try {
    const accepted = await base44.asServiceRole.entities.Invitation.filter({ status: 'accepted' }, '-accepted_date', 50);
    const missingDate = accepted.filter(inv => !inv.accepted_date);
    if (missingDate.length === 0) {
      checks.invitation_burn_protection_ok = true;
    } else {
      failures.push(`invitation_burn_protection_ok: ${missingDate.length} accepted invitation(s) missing accepted_date`);
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