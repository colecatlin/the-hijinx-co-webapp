/**
 * Shared public visibility helpers for media discovery pages.
 * Never expose draft or internal contributor data.
 */

export function isPublicProfile(profile) {
  if (!profile) return false;
  return (
    profile.profile_status === 'active' &&
    profile.public_visible === true &&
    profile.creator_directory_eligible === true
  );
}

export function isPublicOutlet(outlet) {
  if (!outlet) return false;
  return outlet.outlet_status === 'active' && outlet.public_visible === true;
}

export function isPublicAsset(asset) {
  if (!asset) return false;
  return asset.status === 'approved' && asset.public_access === true;
}

export const ROLE_LABELS = {
  writer: 'Writer',
  editor: 'Editor',
  photographer: 'Photographer',
  videographer: 'Videographer',
  journalist: 'Journalist',
  creator: 'Creator',
  outlet_representative: 'Outlet Rep',
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
  instagram: '📷',
  x: '𝕏',
  youtube: '▶',
  tiktok: '♪',
  linkedin: 'in',
  facebook: 'f',
  threads: '⊕',
};