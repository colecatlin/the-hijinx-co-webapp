/**
 * createOrganization
 * ---------------------------------------------------------------------------
 * The single entry point for the Organization Platform creation workflow.
 *
 * Every organization type — Team, Track, Series, MediaOutlet, Sponsor, Vendor,
 * Manufacturer, and any future registry entry — flows through here. No type is
 * special-cased beyond a data-shape map (required-field defaults); all business
 * logic (owner relationship, permission template, event emission) is identical.
 *
 * Process:
 *   1. Resolve the authenticated creator.
 *   2. Look up the org type in the registry (entity_name + field defaults).
 *   3. Create the canonical org record via asServiceRole.
 *   4. Upsert the standardized OrganizationSettings overlay (branding default,
 *      verification_status unverified).
 *   5. Create an APPROVED EntityCollaborator for the creator:
 *        role_key = owner, permission_level = admin,
 *        granted_permissions = owner template (['*']).
 *   6. Emit RelationshipApproved so the activity feed records the grant.
 *   7. Return the new org + collaborator + settings.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  emitRelationshipEvent,
  RELATIONSHIP_EVENTS,
} from '../../shared/relationshipEvents.ts';

// Minimal data-shape config. Frontend holds the full registry; the backend
// only needs to know which base44 entity stores the record and which required
// fields need defaults. Adding a type only requires an entry here + the
// frontend registry — nothing else changes.
const TYPE_REGISTRY: Record<string, { entity: string; defaults: Record<string, unknown> }> = {
  Team: { entity: 'Team', defaults: { primary_discipline: 'Off Road' } },
  Track: {
    entity: 'Track',
    defaults: { location_city: 'Unknown', location_country: 'Unknown' },
  },
  Series: { entity: 'Series', defaults: { discipline: 'Alternative' } },
  MediaOutlet: { entity: 'MediaOutlet', defaults: { outlet_type: 'team_media' } },
  Sponsor: { entity: 'Organization', defaults: { type: 'Sponsor' } },
  Vendor: { entity: 'Organization', defaults: { type: 'Vendor' } },
  Manufacturer: { entity: 'Organization', defaults: { type: 'Manufacturer' } },
};

const OWNER_ROLE_KEY = 'owner';
const OWNER_PERMISSION_LEVEL = 'admin';
const OWNER_GRANTED_PERMISSIONS = ['*'];
const LEGACY_ROLE = 'owner'; // EntityCollaborator.role legacy field

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { entity_type: type, fields = {} } = body;

    const spec = TYPE_REGISTRY[type];
    if (!spec) {
      return Response.json({ error: `Unsupported organization type: ${type}` }, { status: 400 });
    }
    if (!fields.name || typeof fields.name !== 'string' || !fields.name.trim()) {
      return Response.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // 1 ─ Create the canonical record. Merge the provided fields over the
    // per-type defaults so callers can override anything except identity.
    const record: Record<string, unknown> = {
      ...spec.defaults,
      ...fields,
    };
    const created = await base44.asServiceRole.entities[spec.entity].create(record);

    // 2 ─ Upsert the standardized settings overlay. Dedup by settings_key so a
    // re-creation attempt for the same id (shouldn't happen, but safe) does not
    // produce duplicates.
    const settingsKey = `${type}:${created.id}`;
    const existing = await base44.asServiceRole.entities.OrganizationSettings.filter({
      settings_key: settingsKey,
    });
    let settings;
    if (existing && existing.length > 0) {
      settings = existing[0];
    } else {
      settings = await base44.asServiceRole.entities.OrganizationSettings.create({
        entity_type: type,
        entity_id: created.id,
        settings_key: settingsKey,
        verification_status: 'unverified',
        visibility: 'public',
        tagline: fields.tagline || null,
        banner_url: fields.banner_url || null,
        website_url: fields.website_url || null,
        primary_color: fields.primary_color || null,
        secondary_color: fields.secondary_color || null,
        contact_email: fields.contact_email || user.email || null,
        allow_invitations: true,
        approval_required: true,
        default_permission_template_id: OWNER_ROLE_KEY,
        updated_by_user_id: user.id,
      });
    }

    // 3 ─ Create an APPROVED owner relationship for the creator. The owner is
    // granted immediately (no admin review step) since they created the org.
    const now = new Date().toISOString();
    const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: user.email,
      entity_type: type,
      entity_id: created.id,
      entity_name: created.name || null,
      access_code: '',
      role: LEGACY_ROLE,
      role_key: OWNER_ROLE_KEY,
      status: 'approved',
      permission_level: OWNER_PERMISSION_LEVEL,
      granted_permissions: OWNER_GRANTED_PERMISSIONS,
      requested_at: now,
      reviewed_at: now,
      reviewed_by: user.id,
      review_notes: 'Owner relationship granted on organization creation.',
    });

    // 4 ─ Emit the same RelationshipApproved event the lifecycle engine emits
    // so the activity feed treats owner-grants uniformly.
    await emitRelationshipEvent(base44, {
      eventType: RELATIONSHIP_EVENTS.APPROVED,
      collaboratorId: collaborator.id,
      entityType: type,
      entityId: created.id,
      entityName: created.name || undefined,
      before: null,
      after: collaborator,
      performedBy: user.id,
      performedByName: user.full_name || user.email,
      notes: 'Organization created — owner relationship granted.',
    });

    return Response.json({
      ok: true,
      organization: created,
      settings,
      collaborator,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'createOrganization failed' }, { status: 500 });
  }
});