import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { review_id, entity_id, status, notes, reviewer_user_id } = await req.json();
    if (!review_id || !entity_id || !status) return Response.json({ error: 'review_id, entity_id, and status required' }, { status: 400 });

    const VALID = ['uploaded', 'in_review', 'approved', 'rejected', 'flagged'];
    if (!VALID.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 });

    // Validate authority
    if (user.role !== 'admin') {
      const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
        entity_id,
        user_id: reviewer_user_id || user.id,
      });
      if (!collaborators.length) return Response.json({ error: 'Forbidden: no authority on this entity' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.AssetReview.update(review_id, {
      status,
      notes: notes || undefined,
      reviewer_user_id: reviewer_user_id || user.id,
      updated_at: new Date().toISOString(),
    });
    return Response.json({ review: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});