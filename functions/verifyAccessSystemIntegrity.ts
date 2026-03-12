/**
 * verifyAccessSystemIntegrity.js
 * 
 * Verifies User, EntityCollaborator, and Invitation systems.
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
    let users_valid = true;
    let collaborators_valid = true;
    let invitations_valid = true;
    const orphan_collaborators = [];
    const broken_invitations = [];
    const limit = 100;

    // ── Verify Users ──
    let offset = 0;
    const users = [];
    while (true) {
      const batch = await sr.entities.User.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      users.push(...batch);
    }

    for (const u of users) {
      if (!u.id || !u.email) {
        users_valid = false;
        break;
      }
    }

    // ── Verify EntityCollaborators ──
    offset = 0;
    while (true) {
      const batch = await sr.entities.EntityCollaborator.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const collab of batch) {
        const [entity, userExists] = await Promise.all([
          sr.entities.Entity.filter({ id: collab.entity_id }).then(r => r?.[0]),
          users.some(u => u.id === collab.user_id),
        ]);

        if (!entity || !userExists) {
          orphan_collaborators.push(collab.id);
          collaborators_valid = false;
        }

        // Check for duplicates
        const dups = await sr.entities.EntityCollaborator.filter({
          user_id: collab.user_id,
          entity_id: collab.entity_id,
        });
        if (dups && dups.length > 1) {
          collaborators_valid = false;
        }
      }
    }

    // ── Verify Invitations ──
    offset = 0;
    while (true) {
      const batch = await sr.entities.Invitation.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const inv of batch) {
        // Check if entity exists
        const entity = await sr.entities.Entity.filter({ id: inv.entity_id }).then(r => r?.[0]);
        if (!entity) {
          broken_invitations.push({ id: inv.id, reason: 'entity_missing' });
          invitations_valid = false;
        }

        // If accepted, verify collaborator exists
        if (inv.status === 'accepted') {
          const collab = await sr.entities.EntityCollaborator.filter({
            user_id: inv.email, // Emails may be used for matching
            entity_id: inv.entity_id,
          }).then(r => r?.[0]);
          if (!collab) {
            broken_invitations.push({ id: inv.id, reason: 'accepted_no_collaborator' });
            invitations_valid = false;
          }
        }

        // Check expiration
        if (inv.status === 'pending' && inv.expiration_date) {
          const expDate = new Date(inv.expiration_date);
          if (expDate < new Date()) {
            broken_invitations.push({ id: inv.id, reason: 'expired_pending' });
            invitations_valid = false;
          }
        }
      }
    }

    return Response.json({
      users_valid,
      collaborators_valid,
      invitations_valid,
      orphan_collaborators_count: orphan_collaborators.length,
      broken_invitations_count: broken_invitations.length,
      overall_valid: users_valid && collaborators_valid && invitations_valid,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});