/**
 * runAccessIntegrityAudit.js  (admin only)
 *
 * Audits EntityCollaborator and Invitation records for:
 *  1. duplicate_collaborators       — same user_id + entity_type + entity_id
 *  2. collaborator_missing_source   — collaborator references non-existent source record
 *  3. owner_missing_access_code     — owner role collaborator with no access_code
 *  4. expired_pending_invitations   — expiration_date < now but status still 'pending'
 *  5. invitation_entity_missing     — Invitation references non-existent source entity
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;
    const now = new Date();

    const [collaborators, invitations, drivers, teams, tracks, series, events] = await Promise.all([
      sr.entities.EntityCollaborator.list('-created_date', 5000),
      sr.entities.Invitation.list('-created_date', 2000),
      sr.entities.Driver.list('-created_date', 2000),
      sr.entities.Team.list('-created_date', 2000),
      sr.entities.Track.list('-created_date', 2000),
      sr.entities.Series.list('-created_date', 2000),
      sr.entities.Event.list('-created_date', 2000),
    ]);

    const sourceIds = {
      driver: new Set(drivers.map(d => d.id)),
      team:   new Set(teams.map(t  => t.id)),
      track:  new Set(tracks.map(t => t.id)),
      series: new Set(series.map(s => s.id)),
      event:  new Set(events.map(e => e.id)),
    };

    // ── 1. Duplicate collaborators ─────────────────────────────────────────
    const collabKey = c => `${c.user_id}|${c.entity_type}|${c.entity_id}`;
    const collabBuckets = new Map();
    for (const c of collaborators) {
      const k = collabKey(c);
      const arr = collabBuckets.get(k) || [];
      arr.push(c);
      collabBuckets.set(k, arr);
    }
    const duplicate_collaborators = [];
    for (const [key, group] of collabBuckets) {
      if (group.length > 1) {
        duplicate_collaborators.push({ key, count: group.length, ids: group.map(c => c.id) });
      }
    }

    // ── 2. Collaborator missing source ────────────────────────────────────
    const collaborator_missing_source = collaborators
      .filter(c => {
        const et = (c.entity_type || '').toLowerCase();
        const ids = sourceIds[et];
        return ids && !ids.has(c.entity_id);
      })
      .slice(0, 100)
      .map(c => ({ id: c.id, user_id: c.user_id, entity_type: c.entity_type, entity_id: c.entity_id }));

    // ── 3. Owner missing access code ──────────────────────────────────────
    const owner_missing_access_code = collaborators
      .filter(c => (c.role === 'owner' || c.is_owner) && !c.access_code)
      .slice(0, 100)
      .map(c => ({ id: c.id, user_id: c.user_id, entity_type: c.entity_type, entity_id: c.entity_id }));

    // ── 4. Expired pending invitations ────────────────────────────────────
    const expired_pending_invitations = invitations
      .filter(inv => {
        const exp = inv.expires_at || inv.expiration_date;
        return inv.status === 'pending' && exp && new Date(exp) < now;
      })
      .slice(0, 100)
      .map(inv => ({ id: inv.id, email: inv.email, entity_type: inv.entity_type, entity_id: inv.entity_id, expires_at: inv.expires_at || inv.expiration_date }));

    // ── 5. Invitation entity missing ──────────────────────────────────────
    const invitation_entity_missing = invitations
      .filter(inv => {
        const et = (inv.entity_type || '').toLowerCase();
        const ids = sourceIds[et];
        return ids && inv.entity_id && !ids.has(inv.entity_id);
      })
      .slice(0, 100)
      .map(inv => ({ id: inv.id, email: inv.email, entity_type: inv.entity_type, entity_id: inv.entity_id }));

    const summary = {
      duplicate_collaborators_count:    duplicate_collaborators.length,
      collaborator_missing_source_count: collaborator_missing_source.length,
      owner_missing_access_code_count:  owner_missing_access_code.length,
      expired_pending_invitations_count: expired_pending_invitations.length,
      invitation_entity_missing_count:  invitation_entity_missing.length,
    };

    await sr.entities.OperationLog.create({
      operation_type: 'diagnostics_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: { audit: 'access_integrity', ...summary, audited_by: user.email },
    }).catch(() => {});

    return Response.json({
      duplicate_collaborators,
      collaborator_missing_source,
      owner_missing_access_code,
      expired_pending_invitations,
      invitation_entity_missing,
      primary_entity_broken: [], // requires user table scan — deferred
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});