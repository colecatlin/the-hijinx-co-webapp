/**
 * initStoryPerformanceRecord
 *
 * Called when an OutletStory is published (via entity automation or direct admin call).
 * Creates or updates a StoryPerformanceMetrics record, links it back to a
 * StoryRecommendation if the story originated from Story Radar, and updates
 * the recommendation status to "published".
 *
 * Supports:
 *   - entity automation payload  { event: { entity_id }, data: {...} }
 *   - direct admin call          { story_id: "..." }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryPerformanceMetrics',
      entity_id: metadata.story_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

async function initPerformanceRecord(base44, storyId) {
  const story = await base44.asServiceRole.entities.OutletStory.get(storyId);
  if (!story) return { success: false, error: `Story ${storyId} not found` };
  if (story.status !== 'published') {
    return { success: false, skipped: true, reason: `Story status is "${story.status}", not published` };
  }

  const now = new Date().toISOString();

  // ── Find linked StoryRecommendation ──────────────────────────────────────
  // A recommendation may link here via linked_story_id
  let rec = null;
  const recSearch = await base44.asServiceRole.entities.StoryRecommendation.filter(
    { linked_story_id: storyId }, '-created_date', 1
  );
  if (recSearch.length > 0) rec = recSearch[0];

  // ── Guard: check for existing metrics record ──────────────────────────────
  const existing = await base44.asServiceRole.entities.StoryPerformanceMetrics.filter(
    { story_id: storyId }, '-created_date', 1
  );
  const existingRow = existing[0] ?? null;

  const payload = {
    story_id:          storyId,
    story_title:       story.title ?? '',
    story_slug:        story.slug ?? '',
    published_date:    story.published_date ?? now,
    story_type:        story.sub_category ?? '',
    category:          story.primary_category ?? '',
    subcategory:       story.sub_category ?? '',
    tags:              story.tags ?? [],
    recommendation_id: rec?.id ?? null,
    radar_originated:  !!rec,
    // Scores initialized to 0 — updated by calculateStoryPerformanceScore
    performance_score:  0,
    virality_score:     0,
    longevity_score:    0,
    engagement_score:   0,
    last_computed_at:   now,
  };

  let metricsId;
  if (existingRow) {
    await base44.asServiceRole.entities.StoryPerformanceMetrics.update(existingRow.id, payload);
    metricsId = existingRow.id;
  } else {
    const created = await base44.asServiceRole.entities.StoryPerformanceMetrics.create(payload);
    metricsId = created.id;
  }

  // ── Update StoryRecommendation to "published" status ─────────────────────
  if (rec && !['published', 'covered'].includes(rec.status)) {
    await base44.asServiceRole.entities.StoryRecommendation.update(rec.id, {
      status:          'published',
      linked_story_id: storyId,
    });
    await logOp(base44, 'story_radar_recommendation_published', {
      story_id:          storyId,
      recommendation_id: rec.id,
      metrics_id:        metricsId,
      radar_originated:  true,
    });
  }

  await logOp(base44, 'story_performance_record_initialized', {
    story_id:        storyId,
    metrics_id:      metricsId,
    radar_originated: !!rec,
    action: existingRow ? 'updated' : 'created',
  });

  return {
    success: true,
    metrics_id: metricsId,
    radar_originated: !!rec,
    recommendation_id: rec?.id ?? null,
    action: existingRow ? 'updated' : 'created',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Entity automation path
    if (!body.story_id && body.event?.entity_id) {
      const data = body.data ?? {};
      if (data.status === 'published') {
        const result = await initPerformanceRecord(base44, body.event.entity_id);
        return Response.json(result);
      }
      return Response.json({ skipped: true, reason: 'Story not published yet' });
    }

    // Direct admin call
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const storyId = body.story_id;
    if (!storyId) return Response.json({ error: 'story_id is required' }, { status: 400 });

    const result = await initPerformanceRecord(base44, storyId);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});