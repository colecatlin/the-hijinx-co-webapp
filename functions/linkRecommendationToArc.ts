/**
 * linkRecommendationToArc
 *
 * Attempts to link a StoryRecommendation to a relevant NarrativeArc.
 * Called after a recommendation is created, or on-demand.
 *
 * Call:
 *   { recommendation_id: "..." }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    best_arc_id:      { type: 'string', description: 'ID of the best matching arc, or empty string' },
    match_confidence: { type: 'number', description: '0-100 confidence of match' },
    reasoning:        { type: 'string' },
  },
  required: ['match_confidence'],
};

async function findBestArc(base44, rec) {
  const arcs = await base44.asServiceRole.entities.NarrativeArc.list('-momentum_score', 30);
  const activeArcs = arcs.filter(a => ['active', 'emerging'].includes(a.status));

  if (activeArcs.length === 0) return null;

  const arcList = activeArcs.map(a =>
    `  [${a.id}] ${a.arc_type} | "${a.arc_name}" | entities:${(a.entity_names ?? []).join(', ')}`
  ).join('\n');

  const prompt = [
    `You are an editorial analyst for The Outlet, a motorsports media publication.`,
    ``,
    `A new story recommendation has been created. Determine if it belongs to one of the active narrative arcs below.`,
    ``,
    `RECOMMENDATION:`,
    `  Title: ${rec.title_suggestion ?? ''}`,
    `  Story Type: ${rec.story_type ?? ''}`,
    `  Angle: ${rec.angle ?? ''}`,
    `  Summary: ${rec.summary ?? ''}`,
    `  Category: ${rec.recommended_category ?? ''}`,
    `  Related Entities: ${(rec.related_entity_names ?? []).join(', ')}`,
    ``,
    `ACTIVE NARRATIVE ARCS:`,
    arcList,
    ``,
    `Return the best_arc_id (or empty string) and match_confidence 0-100.`,
    `Only match if there is a clear thematic connection (match_confidence >= 70).`,
  ].join('\n');

  try {
    return await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: MATCH_SCHEMA,
    });
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const recId = body.recommendation_id;
    if (!recId) return Response.json({ error: 'recommendation_id is required' }, { status: 400 });

    const rec = await base44.asServiceRole.entities.StoryRecommendation.get(recId);
    if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });

    // Already linked
    if (rec.narrative_arc_id) {
      return Response.json({ success: true, already_linked: true, arc_id: rec.narrative_arc_id });
    }

    const aiResult = await findBestArc(base44, rec);
    if (!aiResult || !aiResult.best_arc_id || aiResult.match_confidence < 70) {
      return Response.json({ success: true, linked: false, reason: 'No strong arc match found' });
    }

    // Update recommendation with arc link
    await base44.asServiceRole.entities.StoryRecommendation.update(recId, {
      narrative_arc_id: aiResult.best_arc_id,
    });

    // Update arc with recommendation reference
    const arc = await base44.asServiceRole.entities.NarrativeArc.get(aiResult.best_arc_id);
    if (arc) {
      const updatedRecs = [...new Set([...(arc.recommendation_ids ?? []), recId])];
      await base44.asServiceRole.entities.NarrativeArc.update(arc.id, {
        recommendation_ids: updatedRecs,
        last_update_date:   new Date().toISOString(),
      });
    }

    return Response.json({ success: true, linked: true, arc_id: aiResult.best_arc_id, confidence: aiResult.match_confidence });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});