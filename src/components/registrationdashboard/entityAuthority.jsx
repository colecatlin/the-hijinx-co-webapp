/**
 * Entity-scoped authority helpers for Race Core.
 * All functions are async and accept the current user object.
 */
import { base44 } from '@/api/base44Client';

export function isAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Returns true if the user can manage the given track.
 * Admin always can. Otherwise checks EntityCollaborator records.
 */
export async function canManageTrack({ user, track_id }) {
  if (!user || !track_id) return false;
  if (isAdmin(user)) return true;
  try {
    const records = await base44.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type: 'track',
      entity_id: track_id,
    });
    return records.some(r => r.role === 'owner' || r.role === 'editor');
  } catch (_) {
    return false;
  }
}

/**
 * Returns true if the user can manage the given series.
 * Admin always can. Otherwise checks EntityCollaborator records.
 */
export async function canManageSeries({ user, series_id }) {
  if (!user || !series_id) return false;
  if (isAdmin(user)) return true;
  try {
    const records = await base44.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type: 'series',
      entity_id: series_id,
    });
    return records.some(r => r.role === 'owner' || r.role === 'editor');
  } catch (_) {
    return false;
  }
}