/**
 * updateOwnedRacerProfile — Phase 8+
 *
 * Authoritative owner-edit endpoint for RacerProfile public fields.
 *
 * Authorization tiers:
 *   1. Platform admin (user.role === 'admin')
 *   2. Approved PersonIdentity owner (claim_status === 'claimed', owner_user_id === user.id)
 *   3. Approved RacerProfile manager (EntityCollaborator, status='approved')
 *
 * Accepts only approved RacerProfile public fields. Rejects protected and unknown fields.
 * Never updates Driver. Never updates protected PersonIdentity fields.
 * Idempotent — repeated identical updates return success with no changes.
 *
 * Payload:
 *   { racer_profile_id, fields: { bio, tagline, ... } }
 *
 * Returns:
 *   { status, racer_profile_id, changed_fields, authorization_source, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  authorizeOwnerEdit,
  filterEditableFields,
  computeChanges,
  OWNER_EDITABLE_FIELDS,
  PROTECTED_FIELDS,
} from '../../shared/racerProfileOwnerEdit.ts';
import { DRIVER_WRITE_EVENTS } from '../../shared/driverWriteEnforcement.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { racer_profile_id, fields } = body || {};

    if (!racer_profile_id) {
      return Response.json({ error: 'racer_profile_id is required' }, { status: 400 });
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return Response.json({ error: 'fields must be an object' }, { status: 400 });
    }

    // ── Authorize ──
    const { auth_source, user, identity, racerProfile } = await authorizeOwnerEdit(base44, racer_profile_id);

    // ── Filter fields ──
    const { allowed, rejected } = filterEditableFields(fields);

    // Reject if any protected/unknown fields were submitted
    if (rejected.length > 0) {
      const protectedRejected = rejected.filter(f => PROTECTED_FIELDS.includes(f));
      const unknownRejected = rejected.filter(f => !PROTECTED_FIELDS.includes(f));

      return Response.json({
        error: 'field_validation_failed',
        message: 'Some submitted fields are not editable through this endpoint',
        rejected_fields: rejected,
        protected_fields_attempted: protectedRejected,
        unknown_fields: unknownRejected,
        editable_fields: OWNER_EDITABLE_FIELDS,
      }, { status: 400 });
    }

    // ── Compute changes (idempotency) ──
    const changes = computeChanges(racerProfile, allowed);

    if (Object.keys(changes).length === 0) {
      // Idempotent — no changes needed
      return Response.json({
        status: 'no_change',
        racer_profile_id: racerProfile.id,
        changed_fields: {},
        authorization_source: auth_source,
        message: 'No fields changed — values are already current.',
      });
    }

    // ── Update RacerProfile only ──
    // Never touch Driver. Never touch PersonIdentity.
    await base44.asServiceRole.entities.RacerProfile.update(racerProfile.id, changes);

    // ── Log to ActivityFeed for audit trail ──
    // Do NOT log sensitive data — only field names and authorization source
    try {
      await base44.asServiceRole.entities.ActivityFeed.create({
        type: 'racer_profile_owner_edit',
        title: `RacerProfile updated by ${auth_source}`,
        description: `Fields updated: ${Object.keys(changes).join(', ')}`,
        entity_type: 'RacerProfile',
        entity_id: racerProfile.id,
        metadata: {
          changed_field_names: Object.keys(changes),
          authorization_source: auth_source,
          user_id: user.id,
        },
      });
    } catch (e) {
      // Non-critical — don't fail the update if logging fails
    }

    return Response.json({
      status: 'updated',
      racer_profile_id: racerProfile.id,
      changed_fields: changes,
      changed_field_names: Object.keys(changes),
      authorization_source: auth_source,
      message: `RacerProfile updated successfully (${Object.keys(changes).length} field(s) changed).`,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}