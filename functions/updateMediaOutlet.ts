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
 * updateMediaOutlet
 *
 * Admin-only. Updates outlet metadata.
 *
 * Payload:
 *   outlet_id       - required
 *   fields          - object of fields to update
 *   regenerate_slug - boolean (admin-only), regenerate slug from current/updated name
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { outlet_id, fields, regenerate_slug } = await req.json();
    if (!outlet_id || !fields) {
      return Response.json({ error: 'outlet_id and fields are required' }, { status: 400 });
    }

    const outlet = await base44.asServiceRole.entities.MediaOutlet.get(outlet_id).catch(() => null);
    if (!outlet) return Response.json({ error: 'MediaOutlet not found' }, { status: 404 });

    // Strip protected fields from update
    const safeFields = { ...fields };
    delete safeFields.id;
    delete safeFields.created_date;
    delete safeFields.contributor_user_ids;
    delete safeFields.contributor_profile_ids;

    // Optional slug regeneration — only on explicit request, uses unified utility
    const previousSlug = outlet.slug;
    let newSlug = outlet.slug;
    if (regenerate_slug) {
      const nameForSlug = safeFields.name || outlet.name;
      newSlug = await generateUniqueEntitySlug(base44, 'MediaOutlet', nameForSlug, outlet_id, 'outlet');
      safeFields.slug = newSlug;
    }

    await base44.asServiceRole.entities.MediaOutlet.update(outlet_id, safeFields);

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'media_outlet_updated',
      entity_type: 'MediaOutlet',
      entity_id: outlet_id,
      user_email: user.email,
      status: 'success',
      message: `MediaOutlet "${outlet.name}" updated by ${user.email}`,
      metadata: { media_outlet_id: outlet_id, acted_by_user_id: user.id, fields_updated: Object.keys(safeFields) },
    }).catch(() => {});

    if (newSlug !== previousSlug) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'media_outlet_slug_regenerated',
        entity_type: 'MediaOutlet',
        entity_id: outlet_id,
        user_email: user.email,
        status: 'success',
        message: `Slug changed from "${previousSlug}" to "${newSlug}" for MediaOutlet ${outlet_id}`,
        metadata: { media_outlet_id: outlet_id, previous_slug: previousSlug, new_slug: newSlug },
      }).catch(() => {});
    }

    return Response.json({ success: true, outlet_id, slug: newSlug });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});