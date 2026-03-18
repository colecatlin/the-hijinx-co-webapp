import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      asset_id,
      target_type,
      target_entity_id,
      event_id,
      request_id,
    } = await req.json();

    if (!asset_id || !target_type) {
      return Response.json(
        { error: 'Missing asset_id or target_type' },
        { status: 400 }
      );
    }

    // Fetch the asset
    const asset = await base44.entities.MediaAsset.list().then((all) =>
      all.find((a) => a.id === asset_id)
    );

    if (!asset) {
      return Response.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    const reasons = [];
    let can_publish = true;

    // Check embargo
    if (asset.embargo_until) {
      const now = new Date();
      const embargo = new Date(asset.embargo_until);
      if (embargo > now) {
        can_publish = false;
        reasons.push('Asset is embargoed');
      }
    }

    // Check usage rights if target_entity_id provided
    if (target_entity_id && can_publish) {
      const agreements = await base44.entities.UsageRightsAgreement.filter({
        holder_media_user_id: asset.uploader_media_user_id,
        entity_id: target_entity_id,
      });

      const relevant = agreements.filter(
        (a) => a.request_id === request_id || a.event_id === event_id
      );

      if (relevant.length > 0) {
        const hasFullyExecuted = relevant.some(
          (a) => a.status === 'fully_executed'
        );
        if (!hasFullyExecuted) {
          can_publish = false;
          reasons.push('Usage rights agreement not fully executed');
        }
      }
    }

    return Response.json({
      can_publish,
      reasons,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});