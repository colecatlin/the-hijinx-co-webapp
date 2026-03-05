import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asset_id, entity_id } = await req.json();
    if (!asset_id || !entity_id) return Response.json({ error: 'asset_id and entity_id required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.AssetReview.filter({ asset_id, entity_id });
    if (existing.length) return Response.json({ review: existing[0] });

    const now = new Date().toISOString();
    const review = await base44.asServiceRole.entities.AssetReview.create({
      asset_id,
      entity_id,
      status: 'uploaded',
      created_at: now,
      updated_at: now,
    });
    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});