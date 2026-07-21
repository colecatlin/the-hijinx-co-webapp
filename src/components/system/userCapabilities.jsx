/**
 * getUserCapabilities — derives capability flags from user data + relationships.
 * Never stores permanently. Used for UI gating only — not security.
 *
 * Security enforcement always happens server-side via role checks.
 */
export function getUserCapabilities({ user, collaborators = [], mediaProfile = null, claimRequests = [] }) {
  if (!user) return getEmptyCapabilities();

  const isAdmin = user.role === 'admin';
  const ownedEntities = collaborators.filter(c => c.permission_level === 'admin' || c.role === 'owner');
  const editedEntities = collaborators.filter(c => !(c.permission_level === 'admin' || c.role === 'owner'));
  const hasCollaborations = collaborators.length > 0;

  const isApprovedMedia =
    mediaProfile?.status === 'approved' ||
    (user.workspace_access || []).includes('media_contributor') ||
    (user.media_roles || []).length > 0;

  const profileTypes = user.profile_types || [];
  const isMediaProfile = profileTypes.includes('media') || profileTypes.includes('photographer') || profileTypes.includes('creator');
  const isMediaUser = isApprovedMedia || isMediaProfile;

  const hasPendingClaims = claimRequests.some(c => c.status === 'pending');
  const hasApprovedClaims = claimRequests.some(c => c.status === 'approved');

  return {
    // Content
    can_submit_stories: true,
    can_access_media_portal: isAdmin || isMediaUser,

    // Entity management
    can_manage_entities: isAdmin || hasCollaborations,
    can_invite_collaborators: isAdmin || ownedEntities.length > 0,
    can_view_private_entity_tools: isAdmin || hasCollaborations,

    // Specific entity type access
    can_manage_driver_page: isAdmin || collaborators.some(c => c.entity_type === 'Driver'),
    can_manage_team_page: isAdmin || collaborators.some(c => c.entity_type === 'Team'),
    can_manage_track_page: isAdmin || collaborators.some(c => c.entity_type === 'Track'),
    can_manage_series_page: isAdmin || collaborators.some(c => c.entity_type === 'Series'),

    // Verification
    is_verified: user.verification_status === 'verified',
    is_verified_driver: (user.verification_badges || []).includes('verified_driver'),
    is_verified_media: (user.verification_badges || []).includes('verified_media'),
    is_verified_team: (user.verification_badges || []).includes('verified_team'),
    is_verified_track: (user.verification_badges || []).includes('verified_track'),
    is_verified_series: (user.verification_badges || []).includes('verified_series'),
    is_verified_brand: (user.verification_badges || []).includes('verified_brand'),
    is_hijinx_staff: (user.verification_badges || []).includes('hijinx_staff'),
    is_founding_member: (user.verification_badges || []).includes('founding_member'),

    // Claims
    has_pending_claims: hasPendingClaims,
    has_approved_claims: hasApprovedClaims,

    // Profile
    has_username: !!user.username,
    has_public_profile: !!user.username && user.profile_visibility !== 'private',
  };
}

function getEmptyCapabilities() {
  return {
    can_submit_stories: false, can_access_media_portal: false,
    can_manage_entities: false, can_invite_collaborators: false,
    can_view_private_entity_tools: false,
    can_manage_driver_page: false, can_manage_team_page: false,
    can_manage_track_page: false, can_manage_series_page: false,
    is_verified: false, is_verified_driver: false, is_verified_media: false,
    is_verified_team: false, is_verified_track: false, is_verified_series: false,
    is_verified_brand: false, is_hijinx_staff: false, is_founding_member: false,
    has_pending_claims: false, has_approved_claims: false,
    has_username: false, has_public_profile: false,
  };
}

/**
 * Maps legacy role_interest_category to primary_profile_type for migration.
 */
export function mapLegacyRoleToProfileType(roleInterestCategory) {
  const map = {
    'Competitor': 'driver',
    'Team / Organization': 'team',
    'Venue / Series Operator': 'track',
    'Media / Creator': 'media',
    'Crew / Industry': 'crew',
    'Fan / Supporter': 'fan',
  };
  return map[roleInterestCategory] || 'fan';
}

/**
 * Validates a username string. Returns null if valid, or an error message.
 */
export function validateUsername(username) {
  if (!username) return 'Username is required.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 24) return 'Username must be 24 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(username)) return 'Only lowercase letters, numbers, and underscores allowed.';

  const RESERVED = [
    'admin', 'hijinx', 'index46', 'racecore', 'outlet', 'motorsports',
    'support', 'help', 'shop', 'apparel', 'management', 'settings',
    'profile', 'user', 'users', 'team', 'teams', 'driver', 'drivers',
    'track', 'tracks', 'series', 'media',
  ];
  if (RESERVED.includes(username)) return 'This username is reserved.';
  return null;
}

/**
 * Profile type display config — labels, colors, icons.
 */
export const PROFILE_TYPE_CONFIG = {
  fan:          { label: 'Fan',          color: 'bg-gray-100 text-gray-600' },
  driver:       { label: 'Driver',       color: 'bg-blue-100 text-blue-700' },
  team:         { label: 'Team',         color: 'bg-purple-100 text-purple-700' },
  media:        { label: 'Media',        color: 'bg-teal-100 text-teal-700' },
  brand:        { label: 'Brand',        color: 'bg-orange-100 text-orange-700' },
  track:        { label: 'Track',        color: 'bg-green-100 text-green-700' },
  series:       { label: 'Series',       color: 'bg-yellow-100 text-yellow-700' },
  crew:         { label: 'Crew',         color: 'bg-slate-100 text-slate-700' },
  builder:      { label: 'Builder',      color: 'bg-amber-100 text-amber-700' },
  sponsor:      { label: 'Sponsor',      color: 'bg-indigo-100 text-indigo-700' },
  photographer: { label: 'Photographer', color: 'bg-pink-100 text-pink-700' },
  creator:      { label: 'Creator',      color: 'bg-rose-100 text-rose-700' },
};

export const VERIFICATION_BADGE_CONFIG = {
  verified_driver:  { label: 'Verified Driver',  color: 'bg-blue-900 text-blue-100' },
  verified_media:   { label: 'Verified Media',   color: 'bg-teal-900 text-teal-100' },
  verified_team:    { label: 'Verified Team',    color: 'bg-purple-900 text-purple-100' },
  verified_track:   { label: 'Verified Track',   color: 'bg-green-900 text-green-100' },
  verified_series:  { label: 'Verified Series',  color: 'bg-yellow-900 text-yellow-100' },
  verified_brand:   { label: 'Verified Brand',   color: 'bg-orange-900 text-orange-100' },
  hijinx_staff:     { label: 'HIJINX Staff',     color: 'bg-[#1A1A1A] text-white' },
  founding_member:  { label: 'Founding Member',  color: 'bg-amber-900 text-amber-100' },
};

export const SOCIAL_PLATFORM_CONFIG = {
  instagram:  { label: 'Instagram',  placeholder: 'https://instagram.com/yourhandle' },
  tiktok:     { label: 'TikTok',     placeholder: 'https://tiktok.com/@yourhandle' },
  youtube:    { label: 'YouTube',    placeholder: 'https://youtube.com/@yourchannel' },
  facebook:   { label: 'Facebook',   placeholder: 'https://facebook.com/yourpage' },
  x:          { label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  threads:    { label: 'Threads',    placeholder: 'https://threads.net/@yourhandle' },
  linkedin:   { label: 'LinkedIn',   placeholder: 'https://linkedin.com/in/yourprofile' },
  snapchat:   { label: 'Snapchat',   placeholder: 'https://snapchat.com/add/yourhandle' },
  discord:    { label: 'Discord',    placeholder: 'https://discord.gg/yourserver' },
  twitch:     { label: 'Twitch',     placeholder: 'https://twitch.tv/yourchannel' },
  website:    { label: 'Website',    placeholder: 'https://yoursite.com' },
};

export const ALL_PROFILE_TYPES = Object.keys(PROFILE_TYPE_CONFIG);