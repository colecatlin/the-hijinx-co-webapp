import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * createMediaProfile
 *
 * Creates or updates a MediaProfile for an approved contributor.
 * Called internally by reviewMediaApplication on approval, or directly by admins.
 *
 * Payload:
 *   user_id          - required
 *   source_application_id - optional, MediaApplication ID to seed from
 *   force_update     - boolean, if true update existing profile's missing fields
 */

function normalizeToSlug(str) {
  return (str || '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(base44, displayName, excludeId = null) {
  const base = normalizeToSlug(displayName) || 'contributor';
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await base44.asServiceRole.entities.MediaProfile
      .filter({ slug: candidate }, '-created_date', 1).catch(() => []);
    const collision = existing.find(p => p.id !== excludeId);
    if (!collision) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

function derivePrimaryRole(applicationTypes = []) {
  const priority = ['editor_interest', 'journalist', 'writer', 'photographer', 'videographer', 'outlet_representative', 'press', 'creator'];
  const roleMap = { writer: 'writer', journalist: 'journalist', photographer: 'photographer', videographer: 'videographer', editor_interest: 'editor', outlet_representative: 'outlet_representative', press: 'journalist', creator: 'creator' };
  for (const p of priority) {
    if (applicationTypes.includes(p)) return roleMap[p];
  }
  return 'creator';
}

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

    const { user_id, source_application_id, force_update } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id is required' }, { status: 400 });

    // Only admin or the user themselves can trigger this
    if (user.role !== 'admin' && user.id !== user_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for existing MediaProfile
    const existing = await base44.asServiceRole.entities.MediaProfile
      .filter({ user_id }, '-created_date', 1).catch(() => []);
    const existingProfile = existing[0] || null;

    // Fetch application data if provided
    let application = null;
    if (source_application_id) {
      application = await base44.asServiceRole.entities.MediaApplication.get(source_application_id).catch(() => null);
    }

    // Fetch target user
    const targetUser = await base44.asServiceRole.entities.User.get(user_id).catch(() => null);
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const now = new Date().toISOString();

    if (existingProfile && !force_update) {
      return Response.json({
        success: true,
        created: false,
        profile_id: existingProfile.id,
        message: 'MediaProfile already exists',
      });
    }

    // Build profile data from best available sources
    const displayName = existingProfile?.display_name
      || application?.display_name
      || targetUser?.full_name
      || targetUser?.email?.split('@')[0]
      || 'contributor';

    const slug = existingProfile?.slug || await generateUniqueSlug(base44, displayName, existingProfile?.id || null);

    const profileData = {
      user_id,
      display_name: displayName,
      slug,
      profile_status: 'draft',
      verification_status: 'pending',
      public_visible: false,
      creator_directory_eligible: false,
      credentialed_media: false,
    };

    // Seed from application if available
    if (application) {
      if (!existingProfile?.primary_role && application.application_type?.length) {
        profileData.primary_role = derivePrimaryRole(application.application_type);
      }
      if (!existingProfile?.role_tags) profileData.role_tags = application.application_type || [];
      if (!existingProfile?.specialties && application.specialties?.length) profileData.specialties = application.specialties;
      if (!existingProfile?.bio && application.bio) profileData.bio = application.bio;
      if (!existingProfile?.location_city && application.location_city) profileData.location_city = application.location_city;
      if (!existingProfile?.location_state && application.location_state) profileData.location_state = application.location_state;
      if (!existingProfile?.location_country && application.location_country) profileData.location_country = application.location_country;
      if (!existingProfile?.website_url && application.website_url) profileData.website_url = application.website_url;
      if (!existingProfile?.social_links && application.social_links) profileData.social_links = application.social_links;
      if (!existingProfile?.primary_affiliation_type && application.primary_affiliation_type) profileData.primary_affiliation_type = application.primary_affiliation_type;
      if (!existingProfile?.primary_outlet_name && application.primary_outlet_name) profileData.primary_outlet_name = application.primary_outlet_name;
      profileData.creator_terms_accepted = application.terms_accepted === true;
      profileData.creator_rights_acknowledged = application.usage_rights_accepted === true;
    }

    // Compute eligibility and score
    const merged = { ...(existingProfile || {}), ...profileData };
    const { eligible } = computeDirectoryEligibility(merged);
    profileData.creator_directory_eligible = eligible;
    profileData.completeness_score = computeScore(merged);

    // Check credentialed_media via MediaCredential
    const credentials = await base44.asServiceRole.entities.MediaCredential
      .filter({ user_id, status: 'approved' }, '-created_date', 1).catch(() => []);
    if (credentials.length > 0) profileData.credentialed_media = true;

    let profileId;
    let created = false;

    if (existingProfile) {
      await base44.asServiceRole.entities.MediaProfile.update(existingProfile.id, profileData);
      profileId = existingProfile.id;
    } else {
      const created_profile = await base44.asServiceRole.entities.MediaProfile.create(profileData);
      profileId = created_profile.id;
      created = true;
    }

    // Logging
    const logBase = { entity_type: 'MediaProfile', entity_id: profileId, user_email: targetUser.email, status: 'success' };

    if (created) {
      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_created',
        message: `MediaProfile created for ${targetUser.email}`,
        metadata: { user_id, media_profile_id: profileId, acted_by_user_id: user.id, slug },
      }).catch(() => {});

      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_slug_generated',
        message: `Slug "${slug}" generated for MediaProfile ${profileId}`,
        metadata: { user_id, media_profile_id: profileId, slug },
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_updated',
        message: `MediaProfile updated for ${targetUser.email} (seeded from application)`,
        metadata: { user_id, media_profile_id: profileId, acted_by_user_id: user.id },
      }).catch(() => {});
    }

    if (profileData.creator_directory_eligible !== existingProfile?.creator_directory_eligible) {
      await base44.asServiceRole.entities.OperationLog.create({
        ...logBase,
        operation_type: 'media_profile_directory_eligibility_updated',
        message: `Directory eligibility set to ${profileData.creator_directory_eligible} for MediaProfile ${profileId}`,
        metadata: { user_id, media_profile_id: profileId, previous: existingProfile?.creator_directory_eligible, new_value: profileData.creator_directory_eligible },
      }).catch(() => {});
    }

    return Response.json({ success: true, created, profile_id: profileId, slug, completeness_score: profileData.completeness_score, creator_directory_eligible: profileData.creator_directory_eligible });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});