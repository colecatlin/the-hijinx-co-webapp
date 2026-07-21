/**
 * src/lib/identityAccess.js
 * Canonical identity & permission helpers — the single shared source for resolving
 * the four questions every module must answer consistently:
 *
 *   Who is the user?               → User (identity, roles, onboarding status)
 *   What capabilities?              → profile_types (role registry) — identity only, NOT permissions
 *   Which organization are they in? → approved EntityCollaborator records
 *   What may they do there?         → permission_level + granted_permissions
 *
 * Never infer permissions from profile_types. Never infer org membership from roles.
 * Admin platform role (`user.role === 'admin'`) is the only identity-level override.
 *
 * Legacy `role` (owner/editor) and absent `status` are supported as TRANSITIONAL
 * fallbacks for backfilled records. New logic should consume the canonical fields
 * this module exposes; consumers should not re-interpret EntityCollaborator directly.
 */

import {
  getModulesForRoles,
  getNavigationForRoles,
  getDashboardWidgetsForRoles,
} from '@/config/onboardingRoles';

const LEVEL_RANK = { admin: 3, staff: 2, viewer: 1 };

// ─── Collaborator lifecycle ─────────────────────────────────────────────────

/**
 * Approved = explicit status 'approved', OR a transitional backfilled record
 * (no status field set) that carries a legacy role / permission_level.
 */
export function isApprovedCollaborator(c) {
  if (!c) return false;
  if (c.status === 'approved') return true;
  if (c.status === 'denied' || c.status === 'revoked' || c.status === 'pending') return false;
  // transitional: status unset
  return !c.status && (c.role === 'owner' || c.role === 'editor' || !!c.permission_level);
}

/**
 * Active = not denied/revoked/pending. Use this before any access decision.
 */
export function isActiveCollaborator(c) {
  if (!c) return false;
  if (['denied', 'revoked', 'pending'].includes(c.status)) return false;
  return isApprovedCollaborator(c);
}

// ─── Per-relationship permission resolution ─────────────────────────────────

/**
 * Resolve the permission_level for a collaborator record, falling back to the
 * legacy role mapping for transitional records without permission_level.
 */
export function getPermissionLevel(c) {
  if (!c) return null;
  if (c.permission_level) return c.permission_level;
  if (c.role === 'owner') return 'admin';
  if (c.role === 'editor') return 'staff';
  return null;
}

/** Admin-level relationship (legacy owner OR permission_level admin). */
export function isRelationshipAdmin(c) {
  return getPermissionLevel(c) === 'admin' || c?.role === 'owner';
}

/** Staff-or-above (admin or staff / owner or editor). Viewer-only returns false. */
export function isRelationshipStaffOrAbove(c) {
  return getPermissionLevel(c) === 'admin' || getPermissionLevel(c) === 'staff';
}

export function getActiveCollaborators(collaborators = []) {
  return (collaborators || []).filter(isActiveCollaborator);
}

export function getCollaboratorsForEntity(collaborators, entityType, entityId) {
  return getActiveCollaborators(collaborators).filter(
    (c) => c.entity_type === entityType && c.entity_id === entityId,
  );
}

/**
 * Highest permission level a user holds for an entity ('admin' > 'staff' > 'viewer').
 * Returns null if no active relationship exists.
 */
export function getPermissionLevelForEntity(collaborators, entityType, entityId) {
  const related = getCollaboratorsForEntity(collaborators, entityType, entityId);
  if (related.length === 0) return null;
  return related.reduce((best, c) => {
    const lvl = getPermissionLevel(c);
    return (LEVEL_RANK[lvl] || 0) > (LEVEL_RANK[best] || 0) ? lvl : best;
  }, null);
}

/**
 * Does the user hold a module-level permission key on an entity?
 *   granted_permissions '*'              → all (admin level)
 *   explicit key in granted_permissions  → granted
 *   permission_level admin               → implicit all (no granular key needed)
 *   permission_level viewer              → implicit read-only (view / read)
 *   empty granted_permissions            → inherits level defaults above
 */
export function hasGrantedPermission(collaborators, entityType, entityId, permKey) {
  const related = getCollaboratorsForEntity(collaborators, entityType, entityId);
  if (related.length === 0) return false;
  return related.some((c) => {
    const granted = c.granted_permissions || [];
    if (granted.includes('*')) return true;
    if (granted.includes(permKey)) return true;
    const lvl = getPermissionLevel(c);
    if (lvl === 'admin') return true;
    if (lvl === 'viewer') return permKey === 'view' || permKey === 'read';
    return false;
  });
}

// ─── Entity access decisions (admin-aware) ────────────────────────────────────

export function canManageEntityCanonical(user, collaborators, entityType, entityId, opts = {}) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const lvl = getPermissionLevelForEntity(collaborators, entityType, entityId);
  if (lvl === 'admin' || lvl === 'staff') return true;
  if (lvl === 'viewer' && opts.allowViewer) return true; // read-only consumers opt in
  return false;
}

export function canManageEntityType(user, collaborators, entityType) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return getActiveCollaborators(collaborators).some((c) => c.entity_type === entityType);
}

export function isEntityOwnerCanonical(user, collaborators, entityType, entityId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return getCollaboratorsForEntity(collaborators, entityType, entityId).some(isRelationshipAdmin);
}

// ─── Identity (NOT permissions) ──────────────────────────────────────────────

export function getUserIdentity(user) {
  const roles = user?.profile_types || ['fan'];
  const primary = user?.primary_profile_type || (Array.isArray(roles) ? roles[0] : null) || 'fan';
  return {
    primary_role: primary,
    roles,
    is_admin: user?.role === 'admin',
    onboarding_complete: !!user?.onboarding_complete,
    username: user?.username || null,
    full_name: user?.full_name || null,
  };
}

// ─── Role-registry-derived layers ─────────────────────────────────────────────

/**
 * Modules enabled by identity (role registry) PLUS module-level perms unlocked
 * by approved relationships and granted_permissions. Management within a module
 * still requires an approved EntityCollaborator for the specific entity.
 */
export function getEnabledModules(user, collaborators) {
  const identity = getUserIdentity(user);
  const modules = new Set(getModulesForRoles(identity.roles));
  getActiveCollaborators(collaborators).forEach((c) => {
    const lvl = getPermissionLevel(c);
    if (lvl === 'admin' || lvl === 'staff') modules.add('race_core');
    if (lvl === 'admin') {
      modules.add('event_management');
      modules.add('series_management');
      modules.add('track_management');
    }
    const granted = c.granted_permissions || [];
    if (granted.includes('manage_entries')) modules.add('entries_management');
    if (granted.includes('publish_results')) modules.add('publish_results');
    if (granted.includes('manage_staff')) modules.add('staff_management');
    if (granted.includes('manage_tech') ) modules.add('tech_inspection');
  });
  return Array.from(modules);
}

/**
 * Navigation sections enabled by identity (role registry) plus Race Core surfaced
 * when the user has any active track/series/event/team/driver relationship.
 */
export function getEnabledNavigation(user, collaborators) {
  const identity = getUserIdentity(user);
  const nav = new Set(getNavigationForRoles(identity.roles));
  const active = getActiveCollaborators(collaborators);
  if (identity.is_admin || active.some((c) => ['Track', 'Series', 'Event', 'Driver', 'Team'].includes(c.entity_type))) {
    nav.add('race_core');
  }
  return Array.from(nav);
}

export function getEnabledDashboardWidgets(user, collaborators) {
  const identity = getUserIdentity(user);
  const widgets = new Set(getDashboardWidgetsForRoles(identity.roles));
  getActiveCollaborators(collaborators).forEach((c) => {
    if (c.entity_type === 'Team') widgets.add('my_team');
    if (c.entity_type === 'Track') widgets.add('my_track');
    if (c.entity_type === 'Series') widgets.add('my_series');
    if (c.entity_type === 'Event') widgets.add('upcoming_events');
    if (c.entity_type === 'Driver') widgets.add('my_entries');
  });
  return Array.from(widgets);
}

// ─── Aggregate context (returned by useIdentityAccess) ───────────────────────

export function buildIdentityContext(user, collaborators = []) {
  const active = getActiveCollaborators(collaborators);
  return {
    identity: getUserIdentity(user),
    collaborators: active,
    modules: getEnabledModules(user, active),
    navigation: getEnabledNavigation(user, active),
    dashboardWidgets: getEnabledDashboardWidgets(user, active),
    managedEntityTypes: [...new Set(active.map((c) => c.entity_type))],
    canManageEntity: (type, id, opts) => canManageEntityCanonical(user, active, type, id, opts),
    canManageEntityType: (type) => canManageEntityType(user, active, type),
    isEntityOwner: (type, id) => isEntityOwnerCanonical(user, active, type, id),
    hasGrantedPermission: (type, id, key) => hasGrantedPermission(active, type, id, key),
    permissionLevelFor: (type, id) => getPermissionLevelForEntity(active, type, id),
  };
}