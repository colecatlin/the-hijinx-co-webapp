/**
 * mediaPublicHelpers.js
 * Shared rights-aware display helpers for all public-facing media pages.
 *
 * Rules:
 * - Public display requires: status=approved, public_access=true,
 *   visibility_scope=public, rights_status in [cleared, pending→platform display allowed]
 * - Creator profile assets: must also belong to the creator
 * - Outlet profile assets: must have owner_outlet_id matching the outlet
 * - MediaHome featured: must additionally have featured_on_media_home=true
 *
 * DO NOT bypass these helpers on public pages.
 */

// ─── PROFILE VISIBILITY ───────────────────────────────────────────────────────

export function isPublicProfile(profile) {
  if (!profile) return false;
  return (
    profile.public_visible === true &&
    profile.profile_status === 'active' &&
    profile.verification_status !== 'suspended'
  );
}

// ─── OUTLET VISIBILITY ────────────────────────────────────────────────────────

export function isPublicOutlet(outlet) {
  if (!outlet) return false;
  return (
    outlet.public_visible === true &&
    outlet.outlet_status === 'active' &&
    outlet.verification_status !== 'suspended'
  );
}

// ─── ASSET BASE VISIBILITY CHECK ─────────────────────────────────────────────

/**
 * Core rights-aware check: is this asset safe for ANY public display?
 */
export function isPublicAsset(asset) {
  if (!asset) return false;
  const statusOk = asset.status === 'approved';
  const accessOk = asset.public_access === true;
  const visibilityOk = asset.visibility_scope === 'public';
  const rightsOk = asset.rights_status === 'cleared' ||
    // If rights_status is not set yet but platform_promotional_usage_allowed is explicitly true,
    // still allow display (backward compatibility for pre-rights-model assets that were approved).
    (asset.rights_status === undefined && asset.status === 'approved' && asset.public_access === true);
  return statusOk && accessOk && visibilityOk && rightsOk;
}

/**
 * Asset eligible for creator profile portfolio display.
 * Must be public AND belong to (or be authorized for) the given creator.
 */
export function isCreatorPortfolioAsset(asset, profile) {
  if (!isPublicAsset(asset)) return false;
  if (!profile) return false;
  const ownerMatch =
    (asset.owner_profile_id && asset.owner_profile_id === profile.id) ||
    (asset.owner_user_id && asset.owner_user_id === profile.user_id) ||
    (asset.uploader_user_id && asset.uploader_user_id === profile.user_id) ||
    asset.featured_on_creator_profile === true;
  return ownerMatch;
}

/**
 * Asset eligible for outlet profile showcase display.
 */
export function isOutletShowcaseAsset(asset, outlet) {
  if (!isPublicAsset(asset)) return false;
  if (!outlet) return false;
  return (
    (asset.owner_outlet_id && asset.owner_outlet_id === outlet.id) ||
    asset.featured_on_outlet_profile === true
  );
}

/**
 * Asset eligible for MediaHome featured work section.
 */
export function isMediaHomeFeaturedAsset(asset) {
  if (!isPublicAsset(asset)) return false;
  return asset.featured_on_media_home === true;
}

// ─── RIGHTS DISPLAY LABELS ────────────────────────────────────────────────────

export const RIGHTS_STATUS_LABELS = {
  pending: 'Rights Pending',
  cleared: 'Rights Cleared',
  restricted: 'Restricted',
  revoked: 'Revoked',
};

export const RIGHTS_STATUS_COLORS = {
  pending: 'bg-yellow-900/50 text-yellow-300',
  cleared: 'bg-green-900/50 text-green-300',
  restricted: 'bg-orange-900/50 text-orange-300',
  revoked: 'bg-red-900/50 text-red-300',
};

export const ASSET_STATUS_COLORS = {
  uploaded: 'bg-gray-700 text-gray-300',
  in_review: 'bg-yellow-900/60 text-yellow-300',
  approved: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
  archived: 'bg-gray-800 text-gray-500',
};

export const ASSET_STATUS_LABELS = {
  uploaded: 'Uploaded',
  in_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

// ─── ROLE / TYPE LABELS ───────────────────────────────────────────────────────

export const ROLE_LABELS = {
  writer: 'Writer',
  editor: 'Editor',
  photographer: 'Photographer',
  videographer: 'Videographer',
  journalist: 'Journalist',
  creator: 'Creator',
  outlet_representative: 'Outlet Representative',
};

export const OUTLET_TYPE_LABELS = {
  publication: 'Publication',
  creator_brand: 'Creator Brand',
  podcast: 'Podcast',
  video_channel: 'Video Channel',
  journalist_collective: 'Journalist Collective',
  team_media: 'Team Media',
  series_media: 'Series Media',
  track_media: 'Track Media',
};

export const SOCIAL_ICONS = {
  instagram: '📸',
  x: '𝕏',
  twitter: '𝕏',
  youtube: '▶',
  tiktok: '◉',
  facebook: 'f',
  linkedin: 'in',
};

// ─── OPERATION LOG HELPERS ────────────────────────────────────────────────────

/**
 * Log rights-related changes to an asset.
 * Silently fails — do not let logging block UI operations.
 */
export async function logAssetRightsEvent(base44, {
  operation_type,
  assetId,
  agreementId = null,
  ownerUserId = null,
  ownerProfileId = null,
  ownerOutletId = null,
  actedByUserId,
  previousStatus = null,
  newStatus = null,
  message = '',
}) {
  try {
    await base44.entities.OperationLog.create({
      operation_type,
      entity_type: 'MediaAsset',
      entity_id: assetId,
      user_email: actedByUserId || '',
      status: 'success',
      message,
      metadata: {
        media_asset_id: assetId,
        usage_rights_agreement_id: agreementId,
        owner_user_id: ownerUserId,
        owner_profile_id: ownerProfileId,
        owner_outlet_id: ownerOutletId,
        acted_by_user_id: actedByUserId,
        previous_status: previousStatus,
        new_status: newStatus,
      },
    });
  } catch (_) {
    // Silent — logging must never break UI
  }
}