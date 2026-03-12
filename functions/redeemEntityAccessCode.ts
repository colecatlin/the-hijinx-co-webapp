import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];
const ROLE_RANK = { owner: 2, editor: 1 };

async function resolveEntityName(base44, entity_type, entity_id) {
  try {
    const entityMap = {
      Driver: base44.asServiceRole.entities.Driver,
      Team: base44.asServiceRole.entities.Team,
      Track: base44.asServiceRole.entities.Track,
      Series: base44.asServiceRole.entities.Series,
      Event: base44.asServiceRole.entities.Event,
    };
    const record = await entityMap[entity_type].get(entity_id);
    return record?.name || record?.full_name ||
      (record ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : '') ||
      entity_id;
  } catch (_e) {
    return entity_id;
  }
}

/**
 * Inline grant helper — does NOT call any other serverless function via functions.invoke.
 * Runs entirely within the current request's service role context.
 */
async function grantEntityAccess(base44, { user_id, user_email, entity_type, entity_id, entity_name, role, access_code, source }) {
  try {
    if (!ALLOWED_ENTITY_TYPES.includes(entity_type)) {
      return { ok: false, error: `Invalid entity_type: ${entity_type}` };
    }

    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({
      user_id, entity_type, entity_id,
    });

    let collaborator;
    let action;

    if (existing && existing.length > 0) {
      const record = existing[0];
      const existingRank = ROLE_RANK[record.role] || 0;
      const incomingRank = ROLE_RANK[role] || 0;

      if (incomingRank > existingRank) {
        collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, {
          role,
          ...(access_code ? { access_code } : {}),
        });
        action = 'updated';
      } else if (access_code && !record.access_code) {
        collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, { access_code });
        action = 'updated';
      } else {
        collaborator = record;
        action = 'unchanged';
      }
    } else {
      const resolvedName = entity_name || await resolveEntityName(base44, entity_type, entity_id);
      collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id, user_email, entity_type, entity_id,
        entity_name: resolvedName,
        role,
        access_code: access_code || '',
      });
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_linked',
      entity_name: 'EntityCollaborator',
      status: 'success',
      metadata: {
        user_id, user_email, entity_type, entity_id, role, action,
        source: source || 'redeemEntityAccessCode',
        ...(access_code ? { access_code } : {}),
      },
    });

    return { ok: true, action, collaborator };
  } catch (err) {
    return { ok: false, error: err.message || 'Failed to create collaborator record.' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { user_id, user_email, code } = await req.json();

    if (!user_id || !user_email || !code) {
      return Response.json({ ok: false, error: 'Missing required fields: user_id, user_email, code' }, { status: 400 });
    }

    const normalizedCode = code.trim();

    // ── Step 1: Try Invitation ───────────────────────────────────────────────
    const invitations = await base44.asServiceRole.entities.Invitation.filter({
      code: normalizedCode, status: 'pending',
    });

    if (invitations && invitations.length > 0) {
      const invitation = invitations[0];

      // Case-insensitive email guard — both sides lowercased
      if (invitation.email && invitation.email.toLowerCase() !== user_email.toLowerCase()) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'entity_access_code_redeemed',
          entity_name: 'EntityCollaborator',
          status: 'error',
          metadata: { user_id, user_email, code: normalizedCode, reason: 'email_mismatch', source: 'invitation' },
        });
        return Response.json({ ok: false, error: 'This invitation code is for a different email address.' }, { status: 403 });
      }

      // Check expiration
      if (invitation.expiration_date && new Date(invitation.expiration_date) < new Date()) {
        await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'expired' });
        return Response.json({ ok: false, error: 'This invitation has expired.' }, { status: 410 });
      }

      // Grant access inline — no functions.invoke chain
      const grantResult = await grantEntityAccess(base44, {
        user_id, user_email,
        entity_type: invitation.entity_type,
        entity_id: invitation.entity_id,
        entity_name: invitation.entity_name,
        role: invitation.role || 'editor',
        access_code: normalizedCode,
        source: 'invitation',
      });

      if (!grantResult.ok) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'entity_access_link_failed',
          entity_name: 'EntityCollaborator',
          status: 'error',
          metadata: { user_id, user_email, code: normalizedCode, source: 'invitation', error: grantResult.error },
        });
        // Do NOT mark invitation accepted — grant failed
        return Response.json({ ok: false, error: grantResult.error || 'Failed to grant access. Please try again.' }, { status: 500 });
      }

      // Only mark accepted AFTER collaborator creation confirmed
      await base44.asServiceRole.entities.Invitation.update(invitation.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entity_invitation_accepted',
        entity_name: 'EntityCollaborator',
        status: 'success',
        metadata: {
          user_id, user_email, code: normalizedCode, source: 'invitation',
          action: grantResult.action,
          entity_type: invitation.entity_type,
          entity_id: invitation.entity_id,
          role: invitation.role || 'editor',
        },
      });

      return Response.json({
        ok: true,
        action: grantResult.action,
        source: 'invitation',
        entity_type: invitation.entity_type,
        entity_id: invitation.entity_id,
        entity_name: grantResult.collaborator?.entity_name || invitation.entity_name || '',
        role: invitation.role || 'editor',
        message: grantResult.action === 'unchanged'
          ? 'You already have access to this entity.'
          : 'Access granted via invitation.',
      });
    }

    // ── Step 2: Try owner EntityCollaborator access code ─────────────────────
    const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
      access_code: normalizedCode, role: 'owner',
    });

    if (ownerCollabs && ownerCollabs.length > 0) {
      const ownerRecord = ownerCollabs[0];

      const grantResult = await grantEntityAccess(base44, {
        user_id, user_email,
        entity_type: ownerRecord.entity_type,
        entity_id: ownerRecord.entity_id,
        entity_name: ownerRecord.entity_name,
        role: 'editor',
        access_code: normalizedCode,
        source: 'owner_access_code',
      });

      if (!grantResult.ok) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'entity_access_link_failed',
          entity_name: 'EntityCollaborator',
          status: 'error',
          metadata: { user_id, user_email, code: normalizedCode, source: 'owner_access_code', error: grantResult.error },
        });
        return Response.json({ ok: false, error: grantResult.error || 'Failed to grant access. Please try again.' }, { status: 500 });
      }

      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entity_access_code_redeemed',
        entity_name: 'EntityCollaborator',
        status: 'success',
        metadata: {
          user_id, user_email, code: normalizedCode, source: 'owner_access_code',
          action: grantResult.action,
          entity_type: ownerRecord.entity_type,
          entity_id: ownerRecord.entity_id,
          role: 'editor',
        },
      });

      return Response.json({
        ok: true,
        action: grantResult.action,
        source: 'owner_access_code',
        entity_type: ownerRecord.entity_type,
        entity_id: ownerRecord.entity_id,
        entity_name: grantResult.collaborator?.entity_name || ownerRecord.entity_name || '',
        role: 'editor',
        message: grantResult.action === 'unchanged'
          ? 'You already have access to this entity.'
          : 'Editor access granted.',
      });
    }

    // ── Step 3: Not found ────────────────────────────────────────────────────
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_code_redeemed',
      entity_name: 'EntityCollaborator',
      status: 'error',
      metadata: { user_id, user_email, code: normalizedCode, reason: 'not_found' },
    });

    return Response.json({ ok: false, error: 'Invalid or expired access code.' }, { status: 404 });

  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});