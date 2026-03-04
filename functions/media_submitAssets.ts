import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      uploader_media_user_id,
      assets,
      requirement_id,
      request_id,
      event_id,
    } = await req.json();

    if (!uploader_media_user_id || !assets || assets.length === 0) {
      return Response.json(
        { error: 'Missing uploader_media_user_id or assets' },
        { status: 400 }
      );
    }

    const asset_ids = [];
    const reviewEntities = new Set();

    // Create MediaAsset records and AssetLinks
    for (const assetData of assets) {
      const asset = await base44.entities.MediaAsset.create({
        uploader_media_user_id,
        drive_file_id: assetData.drive_file_id,
        file_name: assetData.file_name,
        mime_type: assetData.mime_type,
        asset_type: assetData.asset_type || 'photo',
        title: assetData.title,
        description: assetData.description,
        captured_date: assetData.captured_date,
        embargo_until: assetData.embargo_until,
      });

      asset_ids.push(asset.id);

      // Create AssetLinks for tags
      if (assetData.tags && assetData.tags.length > 0) {
        for (const tag of assetData.tags) {
          await base44.entities.AssetLink.create({
            asset_id: asset.id,
            subject_type: tag.subject_type,
            subject_id: tag.subject_id,
            primary: tag.primary || false,
          });
          reviewEntities.add(`${tag.subject_type}:${tag.subject_id}`);
        }
      }
    }

    // Create AssetReview records for each entity scope
    for (const entityKey of reviewEntities) {
      const [entity_type, entity_id] = entityKey.split(':');
      for (const asset_id of asset_ids) {
        await base44.entities.AssetReview.create({
          asset_id,
          entity_type,
          entity_id,
          status: 'uploaded',
        });
      }
    }

    // Create DeliverableSubmission if requirement provided
    let submission_id = null;
    if (requirement_id) {
      const submission = await base44.entities.DeliverableSubmission.create({
        requirement_id,
        holder_media_user_id: uploader_media_user_id,
        event_id,
        request_id,
        asset_ids,
        submitted_at: new Date().toISOString(),
        review_status: 'pending',
      });
      submission_id = submission.id;
    }

    // Write operation log
    await base44.entities.OperationLog.create({
      operation_type: 'media_submit_assets',
      entity_name: 'MediaAsset',
      status: 'success',
      performed_by_user_id: user.id,
      metadata_json: JSON.stringify({
        asset_count: asset_ids.length,
        requirement_id,
        submission_id,
      }),
    });

    return Response.json({
      asset_ids,
      submission_id,
      count: asset_ids.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});