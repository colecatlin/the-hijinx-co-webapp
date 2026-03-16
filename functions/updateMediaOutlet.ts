import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * updateMediaOutlet
 *
 * Admin-only in V1. Updates outlet metadata.
 *
 * Payload:
 *   outlet_id - required
 *   fields    - object of fields to update
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { outlet_id, fields } = await req.json();
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

    return Response.json({ success: true, outlet_id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});