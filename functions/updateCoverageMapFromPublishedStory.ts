import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'OutletStoryCoverageMap',
      entity_id: metadata.coverage_map_id ?? metadata.story_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

// Derive article_type from OutletStory sub_category
function deriveArticleType(subCategory) {
  if (!subCategory) return 'other';
  const s = subCategory.toLowerCase();
  if (s.includes('race report') || s.includes('result')) return 'race_report';
  if (s.includes('analysis') || s.includes('data') || s.includes('standing') || s.includes('championship')) return 'analysis';
  if (s.includes('opinion') || s.includes('letter')) return 'opinion';
  if (s.includes('profile') || s.includes('spotlight') || s.includes('creator')) return 'profile';
  if (s.includes('photo') || s.includes('film') || s.includes('lens')) return 'photo_essay';
  if (s.includes('news') || s.includes('deal') || s.includes('sponsor') || s.includes('broadcast')) return 'news';
  if (s.includes('feature') || s.includes('essay') || s.includes('behind')) return 'feature';
  return 'other';
}

// ─── AI EXTRACTION ────────────────────────────────────────────────────────────

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    article_angle:        { type: 'string', description: 'Primary editorial angle or framing of this story in 1-2 sentences' },
    covered_entity_names: { type: 'array', items: { type: 'string' }, description: 'Driver, team, series, track names mentioned prominently' },
    covered_topics:       { type: 'array', items: { type: 'string' }, description: 'Key story topics (e.g. sponsorship, championship battle, driver contract)' },
    covered_keywords:     { type: 'array', items: { type: 'string' }, description: 'SEO-level keywords the story covers' },
    evergreen_score:      { type: 'number', description: 'How evergreen is this story 0-100 (100=timeless, 0=day-of-news only)' },
  },
  required: ['article_angle', 'covered_topics'],
};

async function extractCoverageData(base44, story) {
  const bodyPreview = (story.body ?? '').replace(/<[^>]+>/g, ' ').slice(0, 800);

  const prompt = [
    `You are an editorial archivist for The Outlet, a motorsports media publication.`,
    ``,
    `Extract coverage metadata from this published story so future story recommendations can avoid redundancy.`,
    ``,
    `STORY:`,
    `  Title: ${story.title ?? ''}`,
    `  Subtitle: ${story.subtitle ?? ''}`,
    `  Category: ${story.primary_category ?? ''} / ${story.sub_category ?? ''}`,
    `  Tags: ${(story.tags ?? []).join(', ')}`,
    `  Author: ${story.author ?? ''}`,
    `  Body excerpt: ${bodyPreview}`,
    ``,
    `Return structured JSON with:`,
    `- article_angle: the primary editorial angle (what makes this story unique)`,
    `- covered_entity_names: drivers, teams, tracks, series named prominently`,
    `- covered_topics: key themes (e.g. "championship battle", "sponsorship deal", "team roster change")`,
    `- covered_keywords: SEO keywords this story covers`,
    `- evergreen_score: 0-100 (100=timeless reference piece, 0=breaks only today)`,
  ].join('\n');

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: EXTRACTION_SCHEMA,
  });
}

// ─── MAIN LOGIC ───────────────────────────────────────────────────────────────

async function upsertCoverageMap(base44, storyId) {
  // Load story
  const story = await base44.asServiceRole.entities.OutletStory.get(storyId);
  if (!story) return { success: false, error: `Story ${storyId} not found` };

  if (story.status !== 'published') {
    return { success: false, skipped: true, reason: `Story status is "${story.status}", not published` };
  }

  // Extract coverage data via AI
  let extracted = {};
  try {
    extracted = await extractCoverageData(base44, story);
  } catch (err) {
    // Non-fatal — continue with what we have from story fields
    extracted = { article_angle: '', covered_entity_names: [], covered_topics: story.tags ?? [], covered_keywords: story.tags ?? [], evergreen_score: 50 };
  }

  // Check for existing coverage map row for this story
  const existing = await base44.asServiceRole.entities.OutletStoryCoverageMap.filter({ story_id: storyId }, '-created_date', 1);
  const existingRow = existing[0] ?? null;

  const now = new Date().toISOString();
  const payload = {
    story_title:          story.title ?? '',
    story_id:             storyId,
    category:             story.primary_category ?? 'Racing',
    subcategory:          story.sub_category ?? '',
    article_type:         deriveArticleType(story.sub_category),
    article_angle:        extracted.article_angle ?? '',
    published_date:       story.published_date ?? now,
    covered_entity_names: extracted.covered_entity_names ?? [],
    covered_topics:       extracted.covered_topics ?? (story.tags ?? []),
    covered_keywords:     extracted.covered_keywords ?? (story.tags ?? []),
    evergreen_score:      extracted.evergreen_score ?? 50,
    last_computed_at:     now,
  };

  let coverageRow;
  if (existingRow) {
    coverageRow = await base44.asServiceRole.entities.OutletStoryCoverageMap.update(existingRow.id, payload);
    await logOp(base44, 'story_radar_coverage_map_updated', {
      story_id: storyId,
      coverage_map_id: existingRow.id,
      action: 'updated',
    });
    return { success: true, action: 'updated', coverage_map_id: existingRow.id };
  } else {
    coverageRow = await base44.asServiceRole.entities.OutletStoryCoverageMap.create(payload);
    await logOp(base44, 'story_radar_coverage_map_updated', {
      story_id: storyId,
      coverage_map_id: coverageRow.id,
      action: 'created',
    });
    return { success: true, action: 'created', coverage_map_id: coverageRow.id };
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));

    // Support both direct call (story_id) and entity automation event (event.entity_id)
    const storyId = body.story_id ?? body.event?.entity_id ?? null;

    // For entity automations: check if the story just became published
    // For direct calls: admin-only
    if (!storyId) {
      // Entity automation path — check data directly
      const data = body.data ?? {};
      if (data.id && data.status === 'published') {
        const result = await upsertCoverageMap(base44, data.id);
        return Response.json(result);
      }
      return Response.json({ error: 'story_id is required' }, { status: 400 });
    }

    // Direct admin call — verify auth
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const result = await upsertCoverageMap(base44, storyId);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});