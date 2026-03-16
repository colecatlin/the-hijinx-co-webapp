/**
 * Media Permission Helpers
 *
 * Provides access control utilities for the contributor/media permission layer.
 * This is additive to User.role — it does NOT replace admin/user role handling.
 *
 * User.role values (unchanged): 'admin', 'user'
 * New fields on User:
 *   - workspace_access: string[] (e.g. ['media_contributor'])
 *   - media_roles: string[] (e.g. ['writer', 'photographer'])
 */

export const MEDIA_ROLES = [
  'writer',
  'photographer',
  'videographer',
  'media_member',
  'contributor',
  'editor',
  'managing_editor',
  'credential_reviewer',
  'outlet_admin',
];

export const APPLICATION_TYPES = [
  { value: 'writer', label: 'Writer / Journalist' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'press', label: 'Press / PR' },
  { value: 'editor_interest', label: 'Editor (interest)' },
  { value: 'outlet_representative', label: 'Outlet Representative' },
  { value: 'creator', label: 'Content Creator' },
];

// Roles that map from application types on approval
export const APPLICATION_TYPE_TO_ROLES = {
  writer: ['writer', 'contributor'],
  photographer: ['photographer', 'media_member'],
  videographer: ['videographer', 'media_member'],
  journalist: ['writer', 'contributor'],
  press: ['media_member', 'contributor'],
  editor_interest: ['editor', 'contributor'],
  outlet_representative: ['outlet_admin', 'media_member'],
  creator: ['contributor'],
};

/**
 * Returns true if the user is an approved media contributor.
 * Admin always passes. Otherwise checks workspace_access or media_roles.
 */
export function isApprovedContributor(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const workspace = user.workspace_access || [];
  const roles = user.media_roles || [];
  return workspace.includes('media_contributor') || roles.length > 0;
}

/**
 * Returns true if the user holds a specific media role.
 * Admin always passes.
 */
export function hasMediaRole(user, role) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const roles = user.media_roles || [];
  return roles.includes(role);
}

/**
 * Returns true if the user can access the MediaPortal contributor workspace.
 * Requires media_contributor in workspace_access OR at least one media_role.
 * Admin always passes.
 */
export function canAccessMediaPortalWorkspace(user) {
  return isApprovedContributor(user);
}

/**
 * Derives suggested media_roles from application_type selections on approval.
 */
export function deriveMediaRolesFromApplicationTypes(applicationTypes = []) {
  const roles = new Set();
  for (const appType of applicationTypes) {
    const mapped = APPLICATION_TYPE_TO_ROLES[appType] || [];
    mapped.forEach(r => roles.add(r));
  }
  return Array.from(roles);
}