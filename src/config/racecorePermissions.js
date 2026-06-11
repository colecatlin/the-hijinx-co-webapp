/**
 * R9CS — RaceCore Permission Matrix
 * Centralized permission definitions for all roles.
 * All permission checks must use this config — no panel-specific logic.
 */

export const RACECORE_ROLES = [
  'platform_admin',
  'series_admin',
  'race_director',
  'steward',
  'tech_director',
  'registration',
  'timing_scoring',
  'media',
  'gate_staff',
  'announcer',
  'read_only',
];

/**
 * Permission definitions per role.
 * true  = allowed
 * false = denied
 */
export const PERMISSION_MATRIX = {
  platform_admin: {
    view:               true,
    create:             true,
    edit:               true,
    archive:            true,
    restore:            true,
    lifecycle_change:   true,
    close_event:        true,
    publish_results:    true,
    approve_grid:       true,
    issue_penalty:      true,
    resolve_protest:    true,
    manage_officials:   true,
    generate_exports:   true,
    view_audit_log:     true,
    manage_governance:  true,
    hard_delete:        true,
  },

  series_admin: {
    view:               true,
    create:             true,
    edit:               true,
    archive:            true,
    restore:            true,
    lifecycle_change:   true,
    close_event:        true,
    publish_results:    true,
    approve_grid:       true,
    issue_penalty:      true,
    resolve_protest:    true,
    manage_officials:   true,
    generate_exports:   true,
    view_audit_log:     true,
    manage_governance:  false,
    hard_delete:        false,
  },

  race_director: {
    view:               true,
    create:             true,
    edit:               true,
    archive:            false,
    restore:            false,
    lifecycle_change:   true,
    close_event:        true,
    publish_results:    true,
    approve_grid:       true,
    issue_penalty:      true,
    resolve_protest:    false,
    manage_officials:   true,
    generate_exports:   true,
    view_audit_log:     true,
    manage_governance:  false,
    hard_delete:        false,
  },

  steward: {
    view:               true,
    create:             false,
    edit:               false,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      true,
    resolve_protest:    true,
    manage_officials:   false,
    generate_exports:   false,
    view_audit_log:     true,
    manage_governance:  false,
    hard_delete:        false,
  },

  tech_director: {
    view:               true,
    create:             false,
    edit:               true,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   true,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  registration: {
    view:               true,
    create:             true,
    edit:               true,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   true,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  timing_scoring: {
    view:               true,
    create:             false,
    edit:               true,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    true,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   true,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  media: {
    view:               true,
    create:             false,
    edit:               false,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   false,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  gate_staff: {
    view:               true,
    create:             false,
    edit:               false,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   false,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  announcer: {
    view:               true,
    create:             false,
    edit:               false,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   false,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },

  read_only: {
    view:               true,
    create:             false,
    edit:               false,
    archive:            false,
    restore:            false,
    lifecycle_change:   false,
    close_event:        false,
    publish_results:    false,
    approve_grid:       false,
    issue_penalty:      false,
    resolve_protest:    false,
    manage_officials:   false,
    generate_exports:   false,
    view_audit_log:     false,
    manage_governance:  false,
    hard_delete:        false,
  },
};

/**
 * Map platform app roles → RaceCore roles.
 * Platform 'admin' → platform_admin.
 */
export const APP_ROLE_TO_RACECORE = {
  admin: 'platform_admin',
  user:  'read_only',
};

/**
 * Check if a role has a given permission.
 * @param {string} role - RaceCore role string
 * @param {string} permission - Permission key
 * @param {boolean} isAdmin - App-level admin override
 */
export function hasPermission(role, permission, isAdmin = false) {
  if (isAdmin) return true;
  const rcRole = APP_ROLE_TO_RACECORE[role] || role;
  return PERMISSION_MATRIX[rcRole]?.[permission] ?? false;
}

/**
 * Get all permissions for a role as an object.
 */
export function getPermissionsForRCRole(role, isAdmin = false) {
  if (isAdmin) {
    return Object.fromEntries(
      Object.keys(PERMISSION_MATRIX.platform_admin).map(k => [k, true])
    );
  }
  const rcRole = APP_ROLE_TO_RACECORE[role] || role;
  return PERMISSION_MATRIX[rcRole] || PERMISSION_MATRIX.read_only;
}

export default PERMISSION_MATRIX;