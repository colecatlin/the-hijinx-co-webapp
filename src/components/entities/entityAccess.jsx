/**
 * entityAccess.js
 * Shared access-level helpers for entity permission checks.
 */

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function isEntityOwner(entity) {
  return entity?.role === 'owner';
}

export function isEntityEditor(entity) {
  return entity?.role === 'editor';
}

export function canOpenRaceCore(entity) {
  return entity?.entity_type === 'Track' || entity?.entity_type === 'Series';
}