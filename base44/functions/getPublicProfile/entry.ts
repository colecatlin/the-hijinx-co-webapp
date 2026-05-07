import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Public-safe profile lookup by username_slug.
 * Returns only fields appropriate to the user's profile_visibility setting.
 * Never returns email, role, auth metadata, internal flags, or private socials.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { username_slug } = body;

    if (!username_slug || typeof username_slug !== 'string') {
      return Response.json({ error: 'username_slug is required' }, { status: 400 });
    }

    const slug = username_slug.toLowerCase().trim();
    const users = await base44.asServiceRole.entities.User.filter({ username_slug: slug }, '-created_date', 1);
    const user = users[0] || null;

    // Not found or private — return minimal response
    if (!user || user.profile_visibility === 'private') {
      return Response.json({ profile: null, visibility: 'private' });
    }

    // Limited — teaser only, no bio/socials/location
    if (user.profile_visibility === 'limited') {
      return Response.json({
        visibility: 'limited',
        profile: {
          username: user.username || null,
          username_slug: user.username_slug || null,
          display_name: user.display_name || user.full_name || null,
          profile_photo_url: user.profile_photo_url || null,
          primary_profile_type: user.primary_profile_type || 'fan',
          profile_types: user.profile_types || ['fan'],
          verification_badges: user.verification_badges || [],
          verification_status: user.verification_status || null,
          profile_visibility: 'limited',
        },
      });
    }

    // Public — return full allowed fields, filter socials
    const publicSocials = (user.social_links || [])
      .filter(l => l.public_enabled !== false)
      .map(({ platform, url, handle }) => ({ platform, url, handle: handle || null }));

    return Response.json({
      visibility: 'public',
      profile: {
        username: user.username || null,
        username_slug: user.username_slug || null,
        display_name: user.display_name || user.full_name || null,
        profile_photo_url: user.profile_photo_url || null,
        banner_image_url: user.banner_image_url || null,
        bio: user.bio || null,
        location_display: user.location_display || null,
        website_url: user.website_url || null,
        primary_profile_type: user.primary_profile_type || 'fan',
        profile_types: user.profile_types || ['fan'],
        social_links: publicSocials,
        verification_status: user.verification_status || null,
        verification_badges: user.verification_badges || [],
        profile_visibility: 'public',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});