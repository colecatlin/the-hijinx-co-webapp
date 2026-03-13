import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'editor', 'writer'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { recommendationId } = await req.json();
  if (!recommendationId) {
    return Response.json({ error: 'recommendationId is required' }, { status: 400 });
  }

  // Load the recommendation
  const [rec] = await base44.asServiceRole.entities.StoryRecommendation.filter({ id: recommendationId });
  if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });

  // Duplicate guard — if already linked to a draft, block
  if (rec.linked_story_id) {
    return Response.json({ error: 'Draft already exists', story_id: rec.linked_story_id }, { status: 409 });
  }

  if (rec.status === 'drafted') {
    return Response.json({ error: 'Recommendation has already been converted to a draft' }, { status: 409 });
  }

  // Build the slug from title_suggestion
  const slug = (rec.slug_suggestion || rec.title_suggestion || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120);

  // Map recommended_category to OutletStory's primary_category enum
  const validCategories = ['Racing', 'Business', 'Culture', 'Tech', 'Media', 'Marketplace'];
  const category = validCategories.includes(rec.recommended_category) ? rec.recommended_category : 'Racing';

  // Build body from available draft content
  const bodyParts = [];
  if (rec.draft_intro) bodyParts.push(rec.draft_intro);
  if (rec.draft_outline) bodyParts.push('\n\n---\n\n**Outline:**\n' + rec.draft_outline);

  // Create the OutletStory draft
  const story = await base44.asServiceRole.entities.OutletStory.create({
    title: rec.title_suggestion,
    slug: slug || undefined,
    subtitle: rec.suggested_excerpt || undefined,
    body: bodyParts.join('\n\n') || undefined,
    primary_category: category,
    sub_category: rec.recommended_subcategory || undefined,
    tags: rec.recommended_tags || [],
    status: 'draft',
    author: rec.assigned_to || user.full_name || user.email,
  });

  // Update the recommendation
  await base44.asServiceRole.entities.StoryRecommendation.update(rec.id, {
    status: 'drafted',
    linked_story_id: story.id,
    converted_to_draft_at: new Date().toISOString(),
  });

  return Response.json({ success: true, story_id: story.id });
});