// ─── mediaPublicHelpers.js ───────────────────────────────────────────────────
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
// An asset must always pass this before any contextual check.

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
// Requires admin-set featured_on_media_home flag AND rights clearance.

export function isMediaHomeFeaturedAsset(asset) {
  return isRightsClearedForDisplay(asset) && asset.featured_on_media_home === true;
}

// ── Asset: Creator profile portfolio ─────────────────────────────────────────
// Must belong to the creator AND be rights-cleared.
// Optional: featured_on_creator_profile flag boosts sort order (handled by caller).

export function isCreatorPortfolioAsset(asset, profile) {
  if (!isRightsClearedForDisplay(asset)) return false;
  if (!profile) return false;
  // Must match ownership
  const ownerMatch =
    (profile.id && asset.owner_profile_id === profile.id) ||
    (profile.user_id && asset.owner_user_id === profile.user_id);
  return ownerMatch;
}

// ── Asset: Outlet showcase ────────────────────────────────────────────────────
// Must be owned by or explicitly associated with the outlet AND rights-cleared.

export function isOutletShowcaseAsset(asset, outlet) {
  if (!isRightsClearedForDisplay(asset)) return false;
  if (!outlet) return false;
  const outletMatch =
    (outlet.id && asset.owner_outlet_id === outlet.id) ||
    asset.featured_on_outlet_profile === true;
  return outletMatch;
}

// ── Generic public asset (for backwards compat) ───────────────────────────────

export function isPublicAsset(asset) {
  return isRightsClearedForDisplay(asset);
}

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

export function logAssetRightsEvent(asset, eventType, user) {
  // No-op placeholder for operation logging — implement via backend if needed
  console.log(`[rights] ${eventType}`, { assetId: asset?.id, userId: user?.id });
}

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