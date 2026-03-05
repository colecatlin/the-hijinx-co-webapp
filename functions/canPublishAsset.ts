import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asset_id, target_type, target_entity_id } = await req.json();
    if (!asset_id) return Response.json({ error: 'asset_id is required' }, { status: 400 });

    // Load asset
    const assets = await base44.asServiceRole.entities.MediaAsset.filter({ id: asset_id });
    const asset = assets[0];
    if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404 });

    // Load asset links to determine governing entity
    const links = await base44.asServiceRole.entities.AssetLink.filter({ asset_id });

    let governingEntityId = null;

    if (target_entity_id) {
      governingEntityId = target_entity_id;
    } else {
      const eventLink = links.find(l => l.subject_type === 'event');
      const trackLink = links.find(l => l.subject_type === 'track');
      const seriesLink = links.find(l => l.subject_type === 'series');
      if (eventLink) governingEntityId = eventLink.subject_id;
      else if (trackLink) governingEntityId = trackLink.subject_id;
      else if (seriesLink) governingEntityId = seriesLink.subject_id;
    }

    if (!governingEntityId) {
      return Response.json({ allow: true, reason: 'no_governing_entity' });
    }

    const holder_media_user_id = asset.uploaded_by_media_user_id || asset.created_by;
    if (!holder_media_user_id) {
      return Response.json({ allow: true, reason: 'no_media_user_on_asset' });
    }

    // Check AssetReview status
    const reviews = await base44.asServiceRole.entities.AssetReview.filter({ asset_id, entity_id: governingEntityId });
    if (reviews.length) {
      const review = reviews[0];
      if (review.status !== 'approved') {
        return Response.json({ allow: false, reason: 'review_not_approved', review_id: review.id, review_status: review.status });
      }
    }

    // Check for usage rights agreement
    const agreements = await base44.asServiceRole.entities.UsageRightsAgreement.filter({
      entity_id: governingEntityId,
      holder_media_user_id,
    });

    if (!agreements.length) {
      return Response.json({ allow: true, reason: 'no_agreement_required' });
    }

    const agreement = agreements[0];
    const now = new Date();

    // Check expiry
    if (agreement.status !== 'fully_executed') {
      const mediaExpired = agreement.media_deadline && !agreement.media_signed_at && new Date(agreement.media_deadline) < now;
      const entityExpired = agreement.entity_deadline && !agreement.entity_signed_at && new Date(agreement.entity_deadline) < now;
      if (mediaExpired || entityExpired) {
        await base44.asServiceRole.entities.UsageRightsAgreement.update(agreement.id, { status: 'expired', updated_at: now.toISOString() });
        return Response.json({ allow: false, reason: 'rights_agreement_expired', agreement_id: agreement.id });
      }
    }

    if (agreement.status !== 'fully_executed') {
      return Response.json({ allow: false, reason: 'rights_not_executed', agreement_id: agreement.id });
    }

    return Response.json({ allow: true, reason: 'rights_executed', agreement_id: agreement.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});