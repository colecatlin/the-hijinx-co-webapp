/**
 * accessSystemHealthCheck — admin-only
 * Scans the database for common access integrity issues.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const results = {
    duplicate_collaborators: [],
    orphan_collaborators: [],
    invalid_invitations: [],
    missing_access_codes: [],
    expired_pending_invitations: [],
  };

  // 1. Duplicate EntityCollaborator rows (same user_id + entity_type + entity_id)
  try {
    const collabs = await base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 1000);
    const seen = {};
    for (const c of collabs) {
      const key = `${c.user_id}:${c.entity_type}:${c.entity_id}`;
      if (!seen[key]) {
        seen[key] = [];
      }
      seen[key].push(c.id);
    }
    for (const [key, ids] of Object.entries(seen)) {
      if (ids.length > 1) {
        const [user_id, entity_type, entity_id] = key.split(':');
        results.duplicate_collaborators.push({ user_id, entity_type, entity_id, count: ids.length, ids });
      }
    }
  } catch (e) {
    results.duplicate_collaborators = [{ error: e.message }];
  }

  // 2. Invitations accepted but collaborator missing
  try {
    const accepted = await base44.asServiceRole.entities.Invitation.filter({ status: 'accepted' }, '-accepted_date', 200);
    for (const inv of accepted) {
      const collab = await base44.asServiceRole.entities.EntityCollaborator.filter({
        entity_id: inv.entity_id,
        user_email: (inv.email || '').toLowerCase(),
      });
      if (collab.length === 0) {
        results.invalid_invitations.push({
          invitation_id: inv.id,
          email: inv.email,
          entity_type: inv.entity_type,
          entity_id: inv.entity_id,
          entity_name: inv.entity_name,
          reason: 'accepted_but_no_collaborator',
        });
      }
    }
  } catch (e) {
    results.invalid_invitations = [{ error: e.message }];
  }

  // 3. Collaborators referencing entities that no longer exist
  try {
    const collabs = await base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500);
    const entityCache = {};
    for (const c of collabs) {
      const cacheKey = `${c.entity_type}:${c.entity_id}`;
      if (entityCache[cacheKey] === undefined) {
        try {
          const entityMap = {
            Driver: base44.asServiceRole.entities.Driver,
            Team: base44.asServiceRole.entities.Team,
            Track: base44.asServiceRole.entities.Track,
            Series: base44.asServiceRole.entities.Series,
            Event: base44.asServiceRole.entities.Event,
          };
          if (!entityMap[c.entity_type]) {
            entityCache[cacheKey] = false;
          } else {
            const record = await entityMap[c.entity_type].get(c.entity_id).catch(() => null);
            entityCache[cacheKey] = !!record;
          }
        } catch {
          entityCache[cacheKey] = false;
        }
      }
      if (!entityCache[cacheKey]) {
        results.orphan_collaborators.push({
          collaborator_id: c.id,
          user_id: c.user_id,
          user_email: c.user_email,
          entity_type: c.entity_type,
          entity_id: c.entity_id,
        });
      }
    }
  } catch (e) {
    results.orphan_collaborators = [{ error: e.message }];
  }

  // 4. Owner collaborators missing access codes
  try {
    const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({ role: 'owner' }, '-created_date', 500);
    for (const c of owners) {
      if (!c.access_code) {
        results.missing_access_codes.push({
          collaborator_id: c.id,
          user_id: c.user_id,
          user_email: c.user_email,
          entity_type: c.entity_type,
          entity_id: c.entity_id,
          entity_name: c.entity_name,
        });
      }
    }
  } catch (e) {
    results.missing_access_codes = [{ error: e.message }];
  }

  // 5. Expired invitations still marked pending
  try {
    const pending = await base44.asServiceRole.entities.Invitation.filter({ status: 'pending' }, '-created_date', 500);
    const now = new Date();
    for (const inv of pending) {
      if (inv.expiration_date && new Date(inv.expiration_date) < now) {
        results.expired_pending_invitations.push({
          invitation_id: inv.id,
          email: inv.email,
          entity_type: inv.entity_type,
          entity_id: inv.entity_id,
          entity_name: inv.entity_name,
          expiration_date: inv.expiration_date,
        });
      }
    }
  } catch (e) {
    results.expired_pending_invitations = [{ error: e.message }];
  }

  return Response.json({
    ok: true,
    ...results,
    summary: {
      duplicate_collaborators: results.duplicate_collaborators.length,
      orphan_collaborators: results.orphan_collaborators.length,
      invalid_invitations: results.invalid_invitations.length,
      missing_access_codes: results.missing_access_codes.length,
      expired_pending_invitations: results.expired_pending_invitations.length,
    },
    generated_at: new Date().toISOString(),
  });
});