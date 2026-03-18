import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Unified slug utilities (single implementation, inlined per platform constraints) ──
function generateEntitySlug(text) {
  if (!text) return 'entity';
  const slug = text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'entity';
}
async function generateUniqueEntitySlug(base44, entityName, text, excludeId = null, fallback = 'entity') {
  const base = generateEntitySlug(text) || generateEntitySlug(fallback) || 'entity';
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await base44.asServiceRole.entities[entityName]
      .filter({ slug: candidate }, '-created_date', 1).catch(() => []);
    const collision = existing.find(r => r.id !== excludeId);
    if (!collision) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

/**
 * createMediaOutlet
 *
 * Admin-only. Creates a new MediaOutlet with a unique slug.
 *
 * Payload:
 *   name        - required
 *   outlet_type - required
 *   description, website_url, social_links, logo_url, cover_image_url,
 *   primary_contact_user_id, specialties, series_covered  — all optional
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, outlet_type, description, website_url, social_links, logo_url, cover_image_url, primary_contact_user_id, specialties, series_covered } = body;

    if (!name || !outlet_type) {
      return Response.json({ error: 'name and outlet_type are required' }, { status: 400 });
    }

    const slug = await generateUniqueEntitySlug(base44, 'MediaOutlet', name, null, 'outlet');

    const outletData = {
      name,
      slug,
      outlet_type,
      outlet_status: 'draft',
      verification_status: 'pending',
      public_visible: false,
      monetization_eligible: false,
      contributor_user_ids: [],
      contributor_profile_ids: [],
    };

    if (description) outletData.description = description;
    if (website_url) outletData.website_url = website_url;
    if (social_links) outletData.social_links = social_links;
    if (logo_url) outletData.logo_url = logo_url;
    if (cover_image_url) outletData.cover_image_url = cover_image_url;
    if (primary_contact_user_id) outletData.primary_contact_user_id = primary_contact_user_id;
    if (specialties) outletData.specialties = specialties;
    if (series_covered) outletData.series_covered = series_covered;

    const outlet = await base44.asServiceRole.entities.MediaOutlet.create(outletData);

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'media_outlet_created',
      entity_type: 'MediaOutlet',
      entity_id: outlet.id,
      user_email: user.email,
      status: 'success',
      message: `MediaOutlet "${name}" created by ${user.email}`,
      metadata: { media_outlet_id: outlet.id, acted_by_user_id: user.id, slug },
    }).catch(() => {});

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'media_outlet_slug_generated',
      entity_type: 'MediaOutlet',
      entity_id: outlet.id,
      user_email: user.email,
      status: 'success',
      message: `Slug "${slug}" generated for MediaOutlet ${outlet.id}`,
      metadata: { media_outlet_id: outlet.id, slug },
    }).catch(() => {});

    return Response.json({ success: true, outlet_id: outlet.id, slug });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});