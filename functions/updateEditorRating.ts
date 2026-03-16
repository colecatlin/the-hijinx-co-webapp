/**
 * updateEditorRating
 *
 * Allows admins/editors to set an editor_rating and editor_notes on a
 * StoryPerformanceMetrics record. This editorial feedback is used by Story
 * Radar to balance pure performance metrics with qualitative editorial judgment.
 *
 * Call:
 *   { metrics_id, editor_rating, editor_notes }
 *   or
 *   { story_id, editor_rating, editor_notes }  — resolves metrics record by story_id
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ROLES = ['admin', 'editor'];

async function logOp(base44, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'story_editor_rating_updated',
      entity_name: 'StoryPerformanceMetrics',
      entity_id: metadata.metrics_id ?? '',
      metadata,
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    let metricsId = body.metrics_id ?? null;

    // Resolve by story_id if metrics_id not provided
    if (!metricsId && body.story_id) {
      const rows = await base44.asServiceRole.entities.StoryPerformanceMetrics.filter(
        { story_id: body.story_id }, '-created_date', 1
      );
      if (rows.length === 0) {
        return Response.json({ error: 'No performance metrics found for this story' }, { status: 404 });
      }
      metricsId = rows[0].id;
    }

    if (!metricsId) return Response.json({ error: 'metrics_id or story_id is required' }, { status: 400 });

    const rating = body.editor_rating;
    const notes  = body.editor_notes;

    if (rating != null && (typeof rating !== 'number' || rating < 0 || rating > 100)) {
      return Response.json({ error: 'editor_rating must be a number between 0 and 100' }, { status: 400 });
    }

    const update = {};
    if (rating != null) update.editor_rating = rating;
    if (notes  != null) update.editor_notes  = notes;

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'Provide editor_rating or editor_notes' }, { status: 400 });
    }

    await base44.asServiceRole.entities.StoryPerformanceMetrics.update(metricsId, update);

    await logOp(base44, {
      metrics_id:      metricsId,
      acted_by_user_id: user.email,
      editor_rating:   rating,
      has_notes:       !!notes,
    });

    return Response.json({ success: true, metrics_id: metricsId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});