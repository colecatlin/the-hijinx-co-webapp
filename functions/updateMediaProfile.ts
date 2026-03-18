import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { generateUniqueEntitySlug } from './normalizeEntityIdentity.js';

/**
 * updateMediaProfile
 *
 * Allows approved contributors to update their own MediaProfile,
 * or admins to update any MediaProfile.
 *
 * Enforces field-level access control:
 * - contributors can edit: display_name, bio, specialties, website_url, social_links,
 *   location, profile_image_url, cover_image_url, availability_status, primary_role,
 *   primary_affiliation_type, primary_outlet_name, role_tags
 * - admins can edit all fields including trust/status fields
 *
 * Payload:
 *   profile_id      - required
 *   fields          - object of fields to update
 *   regenerate_slug - boolean (admin-only), regenerate slug from display_name
 */

const CONTRIBUTOR_EDITABLE = new Set([
  'display_name', 'bio', 'specialties', 'website_url', 'social_links',
  'location_city', 'location_state', 'location_country',
  'profile_image_url', 'cover_image_url', 'availability_status',
  'primary_role', 'role_tags', 'primary_affiliation_type',
  'primary_outlet_name', 'series_covered',
]);

function computeDirectoryEligibility(profile) {
  const missing = [];
  if (!profile.display_name) missing.push('display_name');
  if (!profile.bio) missing.push('bio');
  if (!profile.primary_role) missing.push('primary_role');
  if (!profile.specialties || profile.specialties.length === 0) missing.push('specialties');
  if (!profile.location_city && !profile.location_state && !profile.location_country) missing.push('location');
  if (!profile.creator_terms_accepted) missing.push('creator_terms_accepted');
  const hasExternal = profile.website_url || (profile.social_links && Object.keys(profile.social_links).length > 0) || (profile.featured_work_asset_ids && profile.featured_work_asset_ids.length > 0) || (profile.featured_story_ids && profile.featured_story_ids.length > 0);
  if (!hasExternal) missing.push('external_presence');
  return { eligible: missing.length === 0, missing };
}

function computeScore(profile) {
  const fields = [
    { key: 'display_name', weight: 15 }, { key: 'bio', weight: 15 }, { key: 'primary_role', weight: 10 },
    { key: 'specialties', weight: 10, check: v => Array.isArray(v) && v.length > 0 },
    { key: 'location_city', weight: 5 }, { key: 'profile_image_url', weight: 10 },
    { key: 'website_url', weight: 5 }, { key: 'social_links', weight: 5, check: v => v && Object.keys(v).length > 0 },
    { key: 'primary_affiliation_type', weight: 5 },
    { key: 'creator_terms_accepted', weight: 10, check: v => v === true },
    { key: 'creator_rights_acknowledged', weight: 5, check: v => v === true },
    { key: 'availability_status', weight: 5, check: v => v && v !== 'unavailable' },
  ];
  let score = 0;
  for (const f of fields) {
    const val = profile[f.key];
    if (f.check ? f.check(val) : !!val) score += f.weight;
  }
  return Math.min(100, score);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin';
    const isContributor = isAdmin ||
      (user.workspace_access || []).includes('media_contributor') ||
      (user.media_roles || []).length > 0;

    if (!isContributor) return Response.json({ error: 'Forbidden: Approved contributor access required' }, { status: 403 });

    const { profile_id, fields } = await req.json();
    if (!profile_id || !fields) return Response.json({ error: 'profile_id and fields are required' }, { status: 400 });

    const profile = await base44.asServiceRole.entities.MediaProfile.get(profile_id).catch(() => null);
    if (!profile) return Response.json({ error: 'MediaProfile not found' }, { status: 404 });

    // Ownership check for non-admins
    if (!isAdmin && profile.user_id !== user.id) {
      return Response.json({ error: 'Forbidden: You can only edit your own MediaProfile' }, { status: 403 });
    }

    // Filter fields based on role
    const allowedFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (isAdmin || CONTRIBUTOR_EDITABLE.has(k)) {
        allowedFields[k] = v;
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return Response.json({ error: 'No allowed fields to update' }, { status: 400 });
    }

    // Handle slug regeneration if display_name changed and admin explicitly requests it
    let previousSlug = profile.slug;
    let newSlug = profile.slug;
    if (isAdmin && allowedFields.regenerate_slug) {
      const nameForSlug = allowedFields.display_name || profile.display_name;
      newSlug = await generateUniqueEntitySlug(base44, 'MediaProfile', nameForSlug, profile_id, 'contributor');
      allowedFields.slug = newSlug;
      delete allowedFields.regenerate_slug;
    }

    // Recompute eligibility and score
    const merged = { ...profile, ...allowedFields };
    const { eligible } = computeDirectoryEligibility(merged);
    if (isAdmin) {
      allowedFields.creator_directory_eligible = eligible;
    }
    allowedFields.completeness_score = computeScore(merged);

    await base44.asServiceRole.entities.MediaProfile.update(profile_id, allowedFields);

    // Logging
    const logBase = { entity_type: 'MediaProfile', entity_id: profile_id, user_email: user.email, status: 'success' };

    await base44.asServiceRole.entities.OperationLog.create({
      ...logBase,
      operation_type: 'media_profile_updated',
      message: `MediaProfile ${profile_id} updated by ${user.email}`,
      metadata: {
        user_id: profile.user_id,
        media_profile_id: profile_id,
        acted_by_user_id: user.id,
        fields_updated: Object.keys(allowedFields),
      },
    }).catch(() => {});

    if (newSlug !== previousSlug) {
      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_slug_generated',
        message: `Slug changed from "${previousSlug}" to "${newSlug}" for MediaProfile ${profile_id}`,
        metadata: { user_id: profile.user_id, media_profile_id: profile_id, previous_slug: previousSlug, new_slug: newSlug },
      }).catch(() => {});
    }

    if (eligible !== profile.creator_directory_eligible) {
      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_directory_eligibility_updated',
        message: `Directory eligibility changed to ${eligible} for MediaProfile ${profile_id}`,
        metadata: { user_id: profile.user_id, media_profile_id: profile_id, previous: profile.creator_directory_eligible, new_value: eligible },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      profile_id,
      completeness_score: allowedFields.completeness_score,
      creator_directory_eligible: eligible,
      slug: newSlug,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});