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

    // Verify the review belongs to the claimed entity (prevents IDOR: a
    // collaborator on entity A cannot update a review belonging to entity B
    // by supplying entity A's id alongside entity B's review_id).
    const existing = await base44.asServiceRole.entities.AssetReview.get(review_id);
    if (!existing) return Response.json({ error: 'Review not found' }, { status: 404 });
    if (existing.entity_id !== entity_id) return Response.json({ error: 'Forbidden: review does not belong to this entity' }, { status: 403 });

    // Validate authority — always check the server-verified caller identity,
    // never a client-supplied reviewer_user_id (which could spoof another
    // user's collaborator record to bypass the authority check).
    if (user.role !== 'admin') {
      const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
        entity_id,
        user_id: user.id,
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