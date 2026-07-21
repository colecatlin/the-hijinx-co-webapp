/**
 * Entity-scoped authority helpers for Race Core.
 * Canonical: delegates to identityAccess (approved collaborators, permission_level,
 * granted_permissions). Legacy owner/editor mapped to admin/staff for transitional records.
 *
 * FIX: entity_type casing canonicalized to 'Track' / 'Series' (the previous lowercase
 * filter never matched canonical EntityCollaborator records, silently denying access).
 */
import { base44 } from '@/api/base44Client';
import { canManageEntityCanonical } from '@/lib/identityAccess';

export function isAdmin(user) {
  return user?.role === 'admin';
}

export async function canManageTrack({ user, track_id }) {
  if (!user || !track_id) return false;
  if (isAdmin(user)) return true;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return canManageEntityCanonical(user, collaborators, 'Track', track_id);
  } catch (_) {
    return false;
  }
}

export async function canManageSeries({ user, series_id }) {
  if (!user || !series_id) return false;
  if (isAdmin(user)) return true;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return canManageEntityCanonical(user, collaborators, 'Series', series_id);
  } catch (_) {
    return false;
  }
}

/**
 * Canonical, type-agnostic management check through identityAccess.
 * New RaceCore code should call this instead of the per-type helpers above.
 */
export async function canManageEntity({ user, entity_type, entity_id }) {
  if (!user || !entity_type || !entity_id) return false;
  if (isAdmin(user)) return true;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return canManageEntityCanonical(user, collaborators, entity_type, entity_id);
  } catch (_) {
    return false;
  }
}