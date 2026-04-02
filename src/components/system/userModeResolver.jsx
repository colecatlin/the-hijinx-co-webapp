/**
 * Resolves the current user's access mode based on role, collaborators, and media profile.
 * Priority: admin > entity_owner > entity_editor > media_user > fan
 */
export function getUserMode({ user, collaborators = [], mediaProfile = null }) {
  if (!user) return 'fan';
  if (user.role === 'admin') return 'admin';

  const hasOwner = collaborators.some(c => c.role === 'owner');
  const hasAny = collaborators.length > 0;
  const isApprovedMedia = mediaProfile?.status === 'approved';

  // Check new contributor permission layer
  const hasContributorAccess =
    (user.workspace_access || []).includes('media_contributor') ||
    (user.media_roles || []).length > 0;

  if (hasOwner) return 'entity_owner';
  if (hasAny) return 'entity_editor';
  if (isApprovedMedia || hasContributorAccess) return 'media_user';
  // Intent-based: media-identified users get media_user experience (no authority granted)
  if (user.role_interest_category === 'Media / Creator') return 'media_user';
  return 'fan';
}

export const USER_MODE_LABELS = {
  admin: 'Admin',
  entity_owner: 'Owner',
  entity_editor: 'Editor',
  media_user: 'Media',
  fan: 'Fan',
};

export const USER_MODE_COLORS = {
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  entity_owner: 'bg-gray-900 text-white border border-gray-900',
  entity_editor: 'bg-blue-100 text-blue-700 border border-blue-200',
  media_user: 'bg-teal-100 text-teal-700 border border-teal-200',
  fan: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export const USER_MODE_DESCRIPTIONS = {
  admin: 'Full platform access including all management tools.',
  entity_owner: 'You own one or more racing entities.',
  entity_editor: 'You have editor access to racing entities.',
  media_user: 'Approved media access with credential tools.',
  fan: 'Fan access — browse, follow, and explore motorsports.',
};