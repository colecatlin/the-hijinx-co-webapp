/**
 * Single source of truth for RegistrationDashboard role-based permissions
 */

const ROLE_PERMISSIONS = {
  admin: {
    tabs: {
      overview: true,
      event_builder: true,
      classes_sessions: true,
      entries: true,
      compliance: true,
      tech: true,
      results: true,
      points_standings: true,
      exports: true,
      integrations: true,
      checkin: true,
      audit_log: true,
    },
    actions: {
      create_event: true,
      import_csv: true,
      sync_timing: true,
      publish_official: true,
      export: true,
    },
  },
  user: {
    tabs: {
      overview: true,
      entries: true,
      checkin: true,
    },
    actions: {
      export: true,
    },
  },
  entity_owner: {
    tabs: {
      overview: true,
      entries: true,
      compliance: true,
      tech: true,
      results: true,
      checkin: true,
    },
    actions: {
      import_csv: true,
      export: true,
    },
  },
  entity_editor: {
    tabs: {
      overview: true,
      entries: true,
      compliance: true,
      results: true,
      checkin: true,
    },
    actions: {
      import_csv: true,
      export: true,
    },
  },
  public: {
    tabs: {},
    actions: {},
  },
};

/**
 * Get permissions object for a given role
 * @param {string} role - User role (admin, user, entity_owner, entity_editor, public)
 * @returns {object} Permissions object with tabs and actions
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.public;
}

/**
 * Check if a tab is accessible for given permissions
 * @param {object} permissions - Permissions object from getPermissionsForRole
 * @param {string} tabKey - Tab key to check
 * @returns {boolean} True if tab is accessible
 */
export function canTab(permissions, tabKey) {
  return permissions?.tabs?.[tabKey] ?? false;
}

/**
 * Check if an action is allowed for given permissions
 * @param {object} permissions - Permissions object from getPermissionsForRole
 * @param {string} actionKey - Action key to check
 * @returns {boolean} True if action is allowed
 */
export function canAction(permissions, actionKey) {
  return permissions?.actions?.[actionKey] ?? false;
}