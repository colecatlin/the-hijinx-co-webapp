// ─── mediaPublicHelpers.jsx ──────────────────────────────────────────────────
// Centralized, rights-aware visibility logic for all public media pages.
// Any public-facing page that renders MediaAssets, MediaProfiles, or
// MediaOutlets MUST use these helpers instead of ad-hoc inline checks.
// ─────────────────────────────────────────────────────────────────────────────

// ── Profile visibility ────────────────────────────────────────────────────────

export function isPublicProfile(profile) {
  if (!profile) return false;
  return (
    profile.public_visible === true &&
    profile.profile_status === 'active' &&
    profile.verification_status !== 'suspended'
  );
}

// ── Outlet visibility ─────────────────────────────────────────────────────────

export function isPublicOutlet(outlet) {
  if (!outlet) return false;
  return (
    outlet.public_visible === true &&
    outlet.outlet_status === 'active' &&
    outlet.verification_status !== 'suspended'
  );
}

// ── Asset: shared base check ──────────────────────────────────────────────────

function isRightsClearedForDisplay(asset) {
  if (!asset) return false;
  return (
    asset.status === 'approved' &&
    asset.public_access === true &&
    asset.visibility_scope === 'public' &&
    asset.rights_status === 'cleared'
  );
}

// ── Asset: MediaHome featured gallery ─────────────────────────────────────────

export function isMediaHomeFeaturedAsset(asset) {
  return isRightsClearedForDisplay(asset) && asset.featured_on_media_home === true;
}

// ── Asset: Creator profile portfolio ─────────────────────────────────────────

export function isCreatorPortfolioAsset(asset, profile) {
  if (!isRightsClearedForDisplay(asset)) return false;
  if (!profile) return false;
  const ownerMatch =
    (profile.id && asset.owner_profile_id === profile.id) ||
    (profile.user_id && asset.owner_user_id === profile.user_id);
  return ownerMatch;
}

// ── Asset: Outlet showcase ────────────────────────────────────────────────────

export function isOutletShowcaseAsset(asset, outlet) {
  if (!isRightsClearedForDisplay(asset)) return false;
  if (!outlet) return false;
  return (
    (outlet.id && asset.owner_outlet_id === outlet.id) ||
    asset.featured_on_outlet_profile === true
  );
}

// ── Generic public asset (backwards compat) ───────────────────────────────────

export function isPublicAsset(asset) {
  return isRightsClearedForDisplay(asset);
}

// ── Operation logging ─────────────────────────────────────────────────────────
// Call as: await logAssetRightsEvent(base44, { operation_type, assetId, ... })

export async function logAssetRightsEvent(base44Client, {
  operation_type,
  assetId,
  ownerUserId,
  ownerProfileId,
  ownerOutletId,
  actedByUserId,
  previousStatus,
  newStatus,
  message,
  agreementId,
} = {}) {
  try {
    await base44Client.entities.OperationLog.create({
      operation_type,
      entity_type: 'MediaAsset',
      entity_id: assetId,
      user_email: actedByUserId || 'system',
      status: 'success',
      message: message || operation_type,
      metadata: {
        media_asset_id: assetId,
        usage_rights_agreement_id: agreementId || null,
        owner_user_id: ownerUserId || null,
        owner_profile_id: ownerProfileId || null,
        owner_outlet_id: ownerOutletId || null,
        acted_by_user_id: actedByUserId || null,
        previous_status: previousStatus || null,
        new_status: newStatus || null,
      },
    });
  } catch (_) {
    // Never let logging break the main flow
  }
}

// ── Status label/color maps ───────────────────────────────────────────────────

export const ASSET_STATUS_LABELS = {
  uploaded: 'Uploaded',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const ASSET_STATUS_COLORS = {
  uploaded: 'bg-gray-700 text-gray-300',
  in_review: 'bg-amber-900/60 text-amber-300',
  approved: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
  archived: 'bg-gray-800 text-gray-500',
};

export const RIGHTS_STATUS_LABELS = {
  pending: 'Rights Pending',
  cleared: 'Rights Cleared',
  restricted: 'Restricted',
  revoked: 'Revoked',
};

export const RIGHTS_STATUS_COLORS = {
  pending: 'bg-yellow-900/40 text-yellow-400',
  cleared: 'bg-emerald-900/40 text-emerald-400',
  restricted: 'bg-orange-900/40 text-orange-400',
  revoked: 'bg-red-900/60 text-red-400',
};

// ── Display label maps ────────────────────────────────────────────────────────

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

export const ROLE_LABELS = {
  writer: 'Writer',
  editor: 'Editor',
  photographer: 'Photographer',
  videographer: 'Videographer',
  journalist: 'Journalist',
  creator: 'Creator',
  outlet_representative: 'Outlet Rep',
};

export const SOCIAL_ICONS = {
  instagram: '📷',
  x: '𝕏',
  twitter: '𝕏',
  youtube: '▶',
  tiktok: '♪',
  facebook: 'f',
  linkedin: 'in',
  website: '🌐',
};