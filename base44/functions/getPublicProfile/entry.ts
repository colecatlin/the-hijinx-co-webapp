import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Public-safe profile lookup by username_slug.
 * Returns only fields appropriate to the user's profile_visibility setting.
 * Never returns email, role, auth metadata, internal flags, or private socials.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ profile: null, visibility: 'private' });

    const body = await req.json().catch(() => ({}));
    const { username_slug } = body;

    if (!username_slug || typeof username_slug !== 'string') {
      return Response.json({ error: 'username_slug is required' }, { status: 400 });
    }

    const slug = username_slug.toLowerCase().trim();
    const users = await base44.asServiceRole.entities.User.filter({ username_slug: slug }, '-created_date', 1);
    const targetUser = users[0] || null;

    // Not found or private — identical response shape to prevent enumeration
    if (!targetUser || targetUser.profile_visibility === 'private') {
      return Response.json({ profile: null, visibility: 'private' });
    }

    // Limited — teaser only, no bio/socials/location
    if (targetUser.profile_visibility === 'limited') {
      return Response.json({
        visibility: 'limited',
        profile: {
          username: targetUser.username || null,
          username_slug: targetUser.username_slug || null,
          display_name: targetUser.display_name || targetUser.full_name || null,
          profile_photo_url: targetUser.profile_photo_url || null,
          primary_profile_type: targetUser.primary_profile_type || 'fan',
          profile_types: targetUser.profile_types || ['fan'],
          verification_badges: targetUser.verification_badges || [],
          verification_status: targetUser.verification_status || null,
          profile_visibility: 'limited',
        },
      });
    }

    // Public — return full allowed fields, filter socials
    const publicSocials = (targetUser.social_links || [])
      .filter(l => l.public_enabled !== false)
      .map(({ platform, url, handle }) => ({ platform, url, handle: handle || null }));

    return Response.json({
      visibility: 'public',
      profile: {
        username: targetUser.username || null,
        username_slug: targetUser.username_slug || null,
        display_name: targetUser.display_name || targetUser.full_name || null,
        profile_photo_url: targetUser.profile_photo_url || null,
        banner_image_url: targetUser.banner_image_url || null,
        bio: targetUser.bio || null,
        location_display: targetUser.location_display || null,
        website_url: targetUser.website_url || null,
        primary_profile_type: targetUser.primary_profile_type || 'fan',
        profile_types: targetUser.profile_types || ['fan'],
        social_links: publicSocials,
        verification_status: targetUser.verification_status || null,
        verification_badges: targetUser.verification_badges || [],
        profile_visibility: 'public',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});