import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asset_id, entity_id } = await req.json();
    if (!asset_id || !entity_id) return Response.json({ error: 'asset_id and entity_id required' }, { status: 400 });

    // Authorization: caller must own the asset or hold an owner/editor
    // collaborator role on the target entity before creating an AssetReview.
    if (user.role !== 'admin') {
      // Check asset ownership
      const asset = await base44.asServiceRole.entities.MediaAsset.get(asset_id).catch(() => null);
      const ownsAsset = asset && asset.uploader_media_user_id
        ? (await base44.asServiceRole.entities.MediaUser.filter({ id: asset.uploader_media_user_id })).some(mu => mu.user_id === user.id)
        : asset && asset.owner_user_id === user.id;

      if (!ownsAsset) {
        // Check entity collaborator authority
        const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
          user_id: user.id,
          entity_id,
        });
        const hasAccess = collaborators.some(c => ['owner', 'editor'].includes(c.role));
        if (!hasAccess) {
          return Response.json({ error: 'Forbidden: must own the asset or hold authority on the target entity' }, { status: 403 });
        }
      }
    }

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