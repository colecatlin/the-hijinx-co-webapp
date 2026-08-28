/**
 * Onboarding staging configuration + stage-resolution helpers.
 * Pure functions — no component imports — so they can be used by the guard,
 * the wizard page, and routing logic alike.
 */

export const STAGE_ORDER = ['identity', 'about', 'roles', 'connections', 'review', 'complete'];

export const STAGE_META = {
  identity: {
    label: 'Identity',
    description: 'Tell us who you are on the platform.',
  },
  about: {
    label: 'About',
    description: 'Your public profile — photo, bio, and links.',
  },
  roles: {
    label: 'Roles',
    description: 'Choose how you participate in motorsports.',
  },
  connections: {
    label: 'Connections',
    description: 'Link to the organizations you belong to.',
  },
  review: {
    label: 'Review',
    description: 'Confirm everything and launch your dashboard.',
  },
};

export const ONBOARDING_STAGES = ['identity', 'about', 'roles', 'connections', 'review'];

export function stageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

export function nextStage(stage) {
  const i = stageIndex(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : stage;
}

export function prevStage(stage) {
  const i = stageIndex(stage);
  return i > 0 ? STAGE_ORDER[i - 1] : stage;
}

/**
 * Resolve the canonical onboarding stage for a user from their stored data.
 * Safely maps legacy users (no onboarding_stage) based on what they've filled.
 * Returns one of STAGE_ORDER. Never returns 'complete' unless onboarding_complete
 * is explicitly true.
 */
export function resolveOnboardingStage(user) {
  if (!user) return 'identity';
  if (user.onboarding_complete === true) return 'complete';

  const stored = user.onboarding_stage;
  if (stored && STAGE_ORDER.includes(stored)) return stored;

  // Legacy inference for users created before this wizard existed.
  const hasIdentity = !!(user.first_name?.trim() && user.last_name?.trim());
  if (!hasIdentity) return 'identity';

  const types = user.profile_types || ['fan'];
  const hasRealRole = types.some((t) => t !== 'fan');
  const hasProfile = !!(user.bio || user.profile_photo_url);
  if (!hasProfile) return 'about';
  if (!user.primary_profile_type || user.primary_profile_type === 'fan' || !hasRealRole) return 'roles';
  return 'review';
}

/**
 * Prevent stage skipping via URL. A requested stage earlier than or equal to
 * the user's resolved stage is allowed; a later stage is clamped back to the
 * user's actual stage so they must proceed in order.
 */
export function clampRequestedStage(userStage, requested) {
  const u = stageIndex(userStage);
  const r = stageIndex(requested);
  if (r < 0) return userStage;
  if (u < 0) return requested;
  return r > u ? STAGE_ORDER[u] : requested;
}

/**
 * Standard route path for a given stage.
 */
export function stagePath(stage) {
  return `/ProfileSetup/${stage}`;
}