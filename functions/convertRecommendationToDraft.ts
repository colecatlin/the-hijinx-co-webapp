import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const VALID_CATEGORIES = ['Racing', 'Business', 'Culture', 'Tech', 'Media', 'Marketplace'];
const DRAFTABLE_STATUSES = ['approved', 'saved'];

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryRecommendation',
      entity_id: metadata.recommendation_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const recommendationId = body.recommendationId ?? body.recommendation_id;
    if (!recommendationId) {
      return Response.json({ error: 'recommendation_id is required' }, { status: 400 });
    }

    const rec = await base44.asServiceRole.entities.StoryRecommendation.get(recommendationId);
    if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });

    // Duplicate guard — already converted
    if (rec.linked_story_id || rec.status === 'drafted') {
      return Response.json({
        success: true,
        already_converted: true,
        story_id: rec.linked_story_id,
        message: 'Draft already exists for this recommendation.',
      });
    }

    // Status guard — only approved or saved can become drafted
    if (!DRAFTABLE_STATUSES.includes(rec.status)) {
      return Response.json({
        error: `Cannot convert to draft from status "${rec.status}". Must be approved or saved first.`,
        current_status: rec.status,
      }, { status: 409 });
    }

    const slug = (rec.slug_suggestion || rec.title_suggestion || '')
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 120);

    const category = VALID_CATEGORIES.includes(rec.recommended_category) ? rec.recommended_category : 'Racing';

    const bodyParts = [];
    if (rec.draft_intro) bodyParts.push(rec.draft_intro);
    if (rec.draft_outline) bodyParts.push('\n\n---\n\n**Outline:**\n' + rec.draft_outline);

    const now = new Date().toISOString();

    const story = await base44.asServiceRole.entities.OutletStory.create({
      title:            rec.title_suggestion,
      slug:             slug || undefined,
      subtitle:         rec.suggested_excerpt || undefined,
      body:             bodyParts.join('\n\n') || undefined,
      primary_category: category,
      sub_category:     rec.recommended_subcategory || undefined,
      tags:             rec.recommended_tags ?? [],
      status:           'draft',
      author:           rec.assigned_to || user.full_name || user.email,
    });

    const previousStatus = rec.status;
    await base44.asServiceRole.entities.StoryRecommendation.update(rec.id, {
      status:               'drafted',
      linked_story_id:      story.id,
      converted_to_draft_at: now,
      editor_notes: (rec.editor_notes ?? '') + `\n[drafted] by ${user.email} at ${now}`,
    });

    await logOp(base44, 'story_radar_recommendation_drafted', {
      recommendation_id: rec.id,
      acted_by_user_id: user.id ?? user.email,
      previous_status: previousStatus,
      new_status: 'drafted',
      draft_story_id: story.id,
    });

    return Response.json({ success: true, story_id: story.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});