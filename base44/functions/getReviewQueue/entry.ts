import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_id, status, limit } = await req.json();
    if (!entity_id) return Response.json({ error: 'entity_id required' }, { status: 400 });

    const statusList = status || ['uploaded', 'in_review', 'flagged'];
    const maxLimit = limit || 50;

    // Fetch all reviews for entity, filter by status
    const allReviews = await base44.asServiceRole.entities.AssetReview.filter({ entity_id });
    const filtered = allReviews
      .filter(r => Array.isArray(statusList) ? statusList.includes(r.status) : r.status === statusList)
      .sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date))
      .slice(0, maxLimit);

    if (!filtered.length) return Response.json({ reviews: [] });

    // Join MediaAsset fields
    const assetIds = [...new Set(filtered.map(r => r.asset_id))];
    const allAssets = await base44.asServiceRole.entities.MediaAsset.list();
    const assetMap = {};
    allAssets.filter(a => assetIds.includes(a.id)).forEach(a => { assetMap[a.id] = a; });

    // Join AssetLinks
    const allLinks = await base44.asServiceRole.entities.AssetLink.list();
    const linkMap = {};
    allLinks.filter(l => assetIds.includes(l.asset_id)).forEach(l => {
      if (!linkMap[l.asset_id]) linkMap[l.asset_id] = [];
      linkMap[l.asset_id].push(l);
    });

    const reviews = filtered.map(r => ({
      ...r,
      asset: assetMap[r.asset_id] ? {
        file_name: assetMap[r.asset_id].file_name,
        asset_type: assetMap[r.asset_id].asset_type,
        created_at: assetMap[r.asset_id].created_at || assetMap[r.asset_id].created_date,
        description: assetMap[r.asset_id].description,
        uploader_media_user_id: assetMap[r.asset_id].uploader_media_user_id,
        drive_file_id: assetMap[r.asset_id].drive_file_id,
        title: assetMap[r.asset_id].title,
      } : null,
      links: linkMap[r.asset_id] || [],
    }));

    return Response.json({ reviews });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});