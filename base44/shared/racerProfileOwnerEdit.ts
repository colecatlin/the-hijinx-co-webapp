/**
 * racerProfileOwnerEdit.ts
 *
 * Phase 8+ — Shared logic for RacerProfile owner-edit authorization and field validation.
 *
 * Used by updateOwnedRacerProfile and auditRacerProfileOwnerEditIntegrity.
 *
 * Ownership chain (authoritative):
 *   User → PersonIdentity (owner_user_id, claim_status) → RacerProfile
 *
 * Authorization tiers:
 *   1. Platform admin (user.role === 'admin')
 *   2. Approved PersonIdentity owner (identity.claim_status === 'claimed' && identity.owner_user_id === user.id)
 *   3. Approved RacerProfile manager (EntityCollaborator with entity_type='RacerProfile', status='approved', permission_level='admin' or 'staff')
 */

import { CLAIM_STATUS, requireAuth } from './identityClaimHelpers.ts';

// ── Owner-editable RacerProfile fields ──────────────────────────────────────
// These are public-facing fields that an approved owner or manager may update.
export const OWNER_EDITABLE_FIELDS = [
  'bio',
  'tagline',
  'profile_image_url',
  'hero_image_url',
  'website_url',
  'instagram_url',
  'facebook_url',
  'tiktok_url',
  'x_url',
  'youtube_url',
  'nicknames',
  'hometown_city',
  'hometown_state',
  'hometown_country',
  'racing_base_city',
  'racing_base_state',
  'racing_base_country',
];

// ── Protected fields (never editable through owner-edit) ────────────────────
// These are system-managed, governed, or structural fields.
export const PROTECTED_FIELDS = [
  'racecore_id',
  'person_identity_id',
  'legacy_driver_id',
  'display_name',
  'slug',
  'visibility',
  'is_claimed',
  'is_archived',
  'career_status',
  'primary_discipline',
  'years_active_start',
  'years_active_end',
];

// ── Authorization sources ───────────────────────────────────────────────────
export const AUTH_SOURCES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
};

/**
 * Resolve a RacerProfile by ID.
 */
export async function getRacerProfileById(base44, racerProfileId) {
  if (!racerProfileId) return null;
  const list = await base44.asServiceRole.entities.RacerProfile.filter({ id: racerProfileId });
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

/**
 * Resolve the PersonIdentity linked to a RacerProfile.
 */
export async function getIdentityForRacerProfile(base44, racerProfile) {
  if (!racerProfile || !racerProfile.person_identity_id) return null;
  const list = await base44.asServiceRole.entities.PersonIdentity.filter({ id: racerProfile.person_identity_id });
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

/**
 * Check if a user is an approved manager of a RacerProfile.
 * Looks for EntityCollaborator records with entity_type='RacerProfile', status='approved'.
 */
export async function isApprovedManager(base44, userId, racerProfileId) {
  if (!userId || !racerProfileId) return false;
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: 'RacerProfile',
    entity_id: racerProfileId,
  });
  const list = Array.isArray(collabs) ? collabs : [];
  return list.some(c => c.status === 'approved' && (c.permission_level === 'admin' || c.permission_level === 'staff'));
}

/**
 * Determine the authorization source for a user editing a RacerProfile.
 * Returns { authorized, auth_source, identity, racerProfile } or throws.
 */
export async function authorizeOwnerEdit(base44, racerProfileId) {
  const user = await requireAuth(base44);

  const racerProfile = await getRacerProfileById(base44, racerProfileId);
  if (!racerProfile) {
    const err = new Error('RacerProfile not found');
    err.statusCode = 404;
    throw err;
  }

  const identity = await getIdentityForRacerProfile(base44, racerProfile);

  // Tier 1: Platform admin
  if (user.role === 'admin') {
    return { authorized: true, auth_source: AUTH_SOURCES.ADMIN, user, identity, racerProfile };
  }

  // Tier 2: Approved PersonIdentity owner
  if (identity && identity.claim_status === CLAIM_STATUS.CLAIMED && identity.owner_user_id === user.id) {
    return { authorized: true, auth_source: AUTH_SOURCES.OWNER, user, identity, racerProfile };
  }

  // Tier 3: Approved RacerProfile manager
  const isManager = await isApprovedManager(base44, user.id, racerProfileId);
  if (isManager) {
    return { authorized: true, auth_source: AUTH_SOURCES.MANAGER, user, identity, racerProfile };
  }

  // Not authorized — determine the reason for a helpful error
  let reason = 'User is not an approved owner or manager of this RacerProfile';
  if (identity) {
    if (identity.claim_status === CLAIM_STATUS.PENDING) {
      reason = 'Claim is pending admin review — cannot edit until approved';
    } else if (identity.claim_status === CLAIM_STATUS.REJECTED) {
      reason = 'Claim was rejected — cannot edit';
    } else if (identity.claim_status === CLAIM_STATUS.UNCLAIMED || !identity.claim_status) {
      reason = 'This profile has not been claimed — submit a claim to gain edit access';
    } else if (identity.claim_status === CLAIM_STATUS.CLAIMED && identity.owner_user_id !== user.id) {
      reason = 'This profile is owned by a different user';
    }
  }

  const err = new Error(reason);
  err.statusCode = 403;
  throw err;
}

/**
 * Filter an input object to only owner-editable fields.
 * Returns { allowed, rejected } where rejected lists the disallowed field names.
 */
export function filterEditableFields(input) {
  if (!input || typeof input !== 'object') return { allowed: {}, rejected: [] };
  const allowed = {};
  const rejected = [];
  for (const key of Object.keys(input)) {
    if (OWNER_EDITABLE_FIELDS.includes(key)) {
      allowed[key] = input[key];
    } else {
      rejected.push(key);
    }
  }
  return { allowed, rejected };
}

/**
 * Compute the diff between the current RacerProfile and the new values.
 * Returns only fields that actually changed (for idempotency).
 */
export function computeChanges(currentRacerProfile, newValues) {
  const changes = {};
  for (const key of Object.keys(newValues)) {
    const currentVal = currentRacerProfile[key];
    const newVal = newValues[key];
    // Compare using JSON.stringify to handle arrays/objects consistently
    if (JSON.stringify(currentVal) !== JSON.stringify(newVal)) {
      changes[key] = newVal;
    }
  }
  return changes;
}