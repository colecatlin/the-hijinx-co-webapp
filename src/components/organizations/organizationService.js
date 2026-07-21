/**
 * Organization Platform — Service
 * ---------------------------------------------------------------------------
 * The only client the Organization Platform components use to read/write org
 * data. Keeps a single upsert path for settings, uniform member reads, and an
 * invite path that resolves a registered user by email and then reuses the
 * relationship lifecycle engine (never creates collaborators directly).
 */

import { base44 } from '@/api/base44Client';
import { settingsKeyFor } from '@/config/organizationRegistry';

// ─── Canonical org record ────────────────────────────────────────────────────

export async function getOrganizationRecord(type, id) {
  const spec = (await import('@/config/organizationRegistry')).ORGANIZATION_TYPES[type];
  if (!spec) throw new Error(`Unsupported organization type: ${type}`);
  return base44.entities[spec.base44Entity].get(id);
}

// ─── Settings overlay ─────────────────────────────────────────────────────────

export async function getSettings(type, id) {
  const key = settingsKeyFor(type, id);
  const list = await base44.entities.OrganizationSettings.filter({ settings_key: key }, '-updated_date', 1);
  return list && list[0] ? list[0] : null;
}

/** Fetch existing settings or create the default overlay record. */
export async function ensureSettings(type, id) {
  const existing = await getSettings(type, id);
  if (existing) return existing;
  const me = await base44.auth.me();
  return base44.entities.OrganizationSettings.create({
    entity_type: type,
    entity_id: id,
    settings_key: settingsKeyFor(type, id),
    verification_status: 'unverified',
    visibility: 'public',
    allow_invitations: true,
    approval_required: true,
    default_permission_template_id: 'owner',
    updated_by_user_id: me?.id || null,
  });
}

export async function saveSettings(settings) {
  const me = await base44.auth.me();
  const payload = { ...settings, updated_by_user_id: me?.id || null };
  if (settings.id) {
    return base44.entities.OrganizationSettings.update(settings.id, payload);
  }
  return base44.entities.OrganizationSettings.create({
    ...payload,
    settings_key: settingsKeyFor(settings.entity_type, settings.entity_id),
  });
}

// ─── Verification ──────────────────────────────────────────────────────────────

export async function setVerificationStatus(settings, status) {
  const me = await base44.auth.me();
  return saveSettings({
    ...settings,
    verification_status: status,
    verified_by: me?.id || null,
    verified_at: new Date().toISOString(),
  });
}

// ─── Members (relationships) ────────────────────────────────────────────────

export async function listMembers(type, id) {
  const all = await base44.entities.EntityCollaborator.filter(
    { entity_type: type, entity_id: id },
    '-requested_at',
    200,
  );
  return all || [];
}

/**
 * Invitation access — the Organization Platform uses an invite link / access
 * code model (not email-by-email), so joining ALWAYS goes through the
 * relationship lifecycle engine. A manager shares the join URL; the recipient
 * opens it in their own session and calls requestRelationship(). Email-based
 * invitations with direct pending-record creation are deferred to Phase 6.
 */
export function buildJoinUrl(type, id) {
  return `${window.location.origin}/organization/${type}/${id}?join=1`;
}

/** Whether the current user already holds a relationship record on the org. */
export function userHasRelationship(members, userId) {
  return (members || []).some((m) => m.user_id === userId);
}

export function userIsActiveMember(members, userId) {
  return (members || []).some((m) => m.user_id === userId && m.status === 'approved');
}

/** A non-member submits a join request using the org's default role template. */
export async function requestAccess(type, id, settings, message) {
  const requestRelationship = (await import('@/components/relationships/relationshipService'))
    .requestRelationship;
  return requestRelationship({
    entityType: type,
    entityId: id,
    roleKey: settings?.default_permission_template_id || 'staff',
    requestMessage: message,
    accessCode: settings?.access_code || undefined,
  });
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export async function listAssets(type, id) {
  return base44.entities.OrganizationAsset.filter(
    { entity_type: type, entity_id: id },
    '-created_date',
    200,
  );
}

export async function createAsset(type, id, data) {
  const me = await base44.auth.me();
  return base44.entities.OrganizationAsset.create({
    ...data,
    entity_type: type,
    entity_id: id,
    owner_user_id: me?.id || null,
  });
}

export async function updateAsset(asset) {
  return base44.entities.OrganizationAsset.update(asset.id, asset);
}

export async function deleteAsset(id) {
  return base44.entities.OrganizationAsset.delete(id);
}

// ─── Activity timeline (synthesized) ───────────────────────────────────────

/** Build a chronological timeline from members + assets until AuditLog is wired. */
export function buildActivityFeed(members = [], assets = []) {
  const items = [];
  members.forEach((m) => {
    if (m.requested_at) {
      items.push({
        when: m.requested_at,
        type: 'relationship_requested',
        label: m.status === 'approved' ? 'Member joined' : 'Join request submitted',
        detail: `${m.user_email || 'A user'} as ${m.role_key || 'member'}`,
      });
    }
    if (m.status === 'approved' && m.reviewed_at) {
      items.push({
        when: m.reviewed_at,
        type: 'relationship_approved',
        label: 'Member approved',
        detail: `${m.user_email || 'A user'} (${m.role_key || 'member'})`,
      });
    }
    if (m.status === 'revoked' && m.revoked_at) {
      items.push({
        when: m.revoked_at,
        type: 'relationship_revoked',
        label: 'Access revoked',
        detail: `${m.user_email || 'A user'}`,
      });
    }
  });
  assets.forEach((a) => {
    if (a.created_date) {
      items.push({
        when: a.created_date,
        type: 'asset_created',
        label: `${(a.asset_type || 'asset').charAt(0).toUpperCase() + (a.asset_type || 'asset').slice(1)} added`,
        detail: a.name,
      });
    }
  });
  items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return items;
}