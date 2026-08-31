import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * submitDeliverables
 * Creates a DeliverableSubmission and updates the MediaCompliance last_submission_at.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { requirement_id, holder_media_user_id, request_id, event_id, asset_ids } = await req.json();
    if (!requirement_id || !holder_media_user_id || !asset_ids?.length) {
      return Response.json({ error: 'requirement_id, holder_media_user_id, asset_ids required' }, { status: 400 });
    }

    // Verify the authenticated caller owns the holder_media_user_id MediaUser
    // record (or is an admin) before accepting deliverable submissions.
    const mediaUsers = await base44.asServiceRole.entities.MediaUser.filter({ id: holder_media_user_id });
    const mediaUser = mediaUsers?.[0];
    if (!mediaUser) return Response.json({ error: 'Media user not found' }, { status: 404 });
    if (mediaUser.user_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: you may only submit deliverables for yourself' }, { status: 403 });
    }

    const now = new Date().toISOString();

    const submission = await base44.entities.DeliverableSubmission.create({
      requirement_id,
      holder_media_user_id,
      ...(request_id && { request_id }),
      ...(event_id && { event_id }),
      asset_ids: asset_ids || [],
      submitted_at: now,
      review_status: 'pending',
      created_at: now,
      updated_at: now,
    });

    // Update compliance last_submission_at
    const existing = await base44.entities.MediaCompliance.filter({ holder_media_user_id });
    if (existing.length > 0) {
      await base44.entities.MediaCompliance.update(existing[0].id, {
        last_submission_at: now,
        updated_at: now,
      });
    } else {
      await base44.entities.MediaCompliance.create({
        holder_media_user_id,
        status: 'good',
        last_submission_at: now,
        outstanding_requirements_count: 0,
        updated_at: now,
      });
    }

    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});