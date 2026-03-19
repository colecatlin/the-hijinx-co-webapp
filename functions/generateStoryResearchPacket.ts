/**
 * generateStoryResearchPacket
 *
 * Unified research packet generator for The Outlet editorial system.
 * Accepts a source_type + source_id (or manual topic payload) and produces
 * a structured StoryResearchPacket for writers and editors.
 *
 * source_type options:
 *   recommendation | narrative_arc | trend_cluster | story |
 *   driver | team | track | series | event | manual_topic
 *
 * Call:
 *   { source_type: "recommendation", source_id: "..." }
 *   { source_type: "driver",         source_id: "..." }
 *   { source_type: "manual_topic",   topic: "...", context: "..." }
 *   { source_type: "...", source_id: "...", regenerate: true }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ROLES = ['admin'];
const REUSE_WINDOW_HOURS = 4; // skip if fresh packet within this window

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryResearchPacket',
      entity_id: metadata.packet_id ?? '',
      metadata,
    });
  } catch (_) {}
}

function buildFingerprint(sourceType, sourceId) {
  return `${sourceType}::${sourceId ?? 'manual'}`;
}

async function findRecentPacket(base44, fingerprint) {
  const cutoff = new Date(Date.now() - REUSE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const matches = await base44.asServiceRole.entities.StoryResearchPacket.filter(
    { research_fingerprint: fingerprint }, '-generated_at', 3
  );
  const fresh = matches.find(p =>
    p.status !== 'archived' &&
    (p.generated_at ?? p.created_date ?? '') >= cutoff
  );
  return fresh ?? null;
}

// ─── CONTEXT GATHERERS ───────────────────────────────────────────────────────

async function gatherRecentCoverage(base44, entityNames = [], category = '') {
  try {
    const all = await base44.asServiceRole.entities.OutletStoryCoverageMap.list('-published_date', 60);
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const names = entityNames.map(n => n.toLowerCase());
    return all.filter(c => {
      if ((c.published_date ?? '') < cutoff) return false;
      if (names.length && c.covered_entity_names?.some(n => names.some(q => n.toLowerCase().includes(q)))) return true;
      if (category && c.category === category) return true;
      return false;
    }).slice(0, 8);
  } catch (_) { return []; }
}

async function gatherRecentResults(base44, entityIds = [], entityNames = []) {
  try {
    const results = await base44.asServiceRole.entities.Results.list('-created_date', 50);
    if (!entityIds.length && !entityNames.length) return results.slice(0, 10);
    const ids = new Set(entityIds);
    const names = entityNames.map(n => n.toLowerCase());
    return results.filter(r =>
      (r.driver_id && ids.has(r.driver_id)) ||
      (r.team_id && ids.has(r.team_id)) ||
      (r.series_id && ids.has(r.series_id)) ||
      (r.driver_name && names.some(n => r.driver_name.toLowerCase().includes(n)))
    ).slice(0, 10);
  } catch (_) { return []; }
}

async function gatherStandings(base44, seriesId = null) {
  try {
    const standings = seriesId
      ? await base44.asServiceRole.entities.Standings.filter({ series_id: seriesId }, '-updated_date', 20)
      : await base44.asServiceRole.entities.Standings.list('-updated_date', 20);
    return standings.slice(0, 10);
  } catch (_) { return []; }
}

async function gatherUpcomingEvents(base44, seriesId = null) {
  try {
    const now = new Date().toISOString();
    const events = await base44.asServiceRole.entities.Event.list('-created_date', 30);
    const upcoming = events.filter(e => (e.event_date ?? '') >= now || e.status === 'upcoming').slice(0, 5);
    return upcoming;
  } catch (_) { return []; }
}

async function gatherRecentStories(base44, entityNames = []) {
  try {
    const stories = await base44.asServiceRole.entities.OutletStory.list('-published_date', 30);
    if (!entityNames.length) return stories.filter(s => s.status === 'published').slice(0, 6);
    const names = entityNames.map(n => n.toLowerCase());
    return stories.filter(s =>
      s.status === 'published' &&
      names.some(n => (s.title ?? '').toLowerCase().includes(n))
    ).slice(0, 6);
  } catch (_) { return []; }
}

// ─── SOURCE LOADERS ──────────────────────────────────────────────────────────

async function loadRecommendationContext(base44, sourceId) {
  const rec = await base44.asServiceRole.entities.StoryRecommendation.get(sourceId);
  if (!rec) throw new Error('Recommendation not found');

  const entityNames = rec.related_entity_names ?? [];
  const [coverage, results, stories] = await Promise.all([
    gatherRecentCoverage(base44, entityNames, rec.recommended_category),
    gatherRecentResults(base44, rec.related_entity_ids ?? [], entityNames),
    gatherRecentStories(base44, entityNames),
  ]);

  return {
    sourceTitle: rec.title_suggestion,
    entityNames,
    entityIds: rec.related_entity_ids ?? [],
    context: {
      recommendation: rec,
      coverage,
      results,
      stories,
    },
    relatedRecommendationIds: [sourceId],
    relatedTrendClusterIds: rec.trend_cluster_id ? [rec.trend_cluster_id] : [],
    relatedNarrativeArcIds: rec.narrative_arc_id ? [rec.narrative_arc_id] : [],
  };
}

async function loadNarrativeArcContext(base44, sourceId) {
  const arc = await base44.asServiceRole.entities.NarrativeArc.get(sourceId);
  if (!arc) throw new Error('Narrative arc not found');

  const entityNames = arc.entity_names ?? [];
  const [coverage, results, stories] = await Promise.all([
    gatherRecentCoverage(base44, entityNames),
    gatherRecentResults(base44, arc.entity_ids ?? [], entityNames),
    gatherRecentStories(base44, entityNames),
  ]);

  return {
    sourceTitle: arc.arc_name,
    entityNames,
    entityIds: arc.entity_ids ?? [],
    context: { arc, coverage, results, stories },
    relatedRecommendationIds: arc.recommendation_ids ?? [],
    relatedTrendClusterIds: arc.trend_cluster_ids ?? [],
    relatedNarrativeArcIds: [sourceId],
  };
}

async function loadTrendClusterContext(base44, sourceId) {
  const cluster = await base44.asServiceRole.entities.StoryTrendCluster.get(sourceId);
  if (!cluster) throw new Error('Trend cluster not found');

  const entityNames = cluster.related_entity_names ?? [];
  const [coverage, results, stories] = await Promise.all([
    gatherRecentCoverage(base44, entityNames),
    gatherRecentResults(base44, cluster.related_entity_ids ?? [], entityNames),
    gatherRecentStories(base44, entityNames),
  ]);

  return {
    sourceTitle: cluster.trend_name,
    entityNames,
    entityIds: cluster.related_entity_ids ?? [],
    context: { cluster, coverage, results, stories },
    relatedRecommendationIds: cluster.recommendation_ids ?? [],
    relatedTrendClusterIds: [sourceId],
    relatedNarrativeArcIds: [],
  };
}

async function loadStoryContext(base44, sourceId) {
  const story = await base44.asServiceRole.entities.OutletStory.get(sourceId);
  if (!story) throw new Error('Story not found');

  const [coverage, stories] = await Promise.all([
    gatherRecentCoverage(base44, [], story.primary_category),
    gatherRecentStories(base44, [story.title?.split(' ').slice(0, 3).join(' ')]),
  ]);

  return {
    sourceTitle: story.title,
    entityNames: [],
    entityIds: [],
    context: { story, coverage, stories },
    relatedStoryIds: [sourceId],
    relatedRecommendationIds: [],
    relatedTrendClusterIds: [],
    relatedNarrativeArcIds: [],
  };
}

async function loadEntityContext(base44, sourceType, sourceId) {
  let record = null;
  let entityNames = [];
  let seriesId = null;

  try {
    const entityMap = {
      driver: 'Driver', team: 'Team', track: 'Track', series: 'Series', event: 'Event'
    };
    const entityName = entityMap[sourceType];
    if (!entityName) throw new Error(`Unknown entity type: ${sourceType}`);
    record = await base44.asServiceRole.entities[entityName].get(sourceId);
  } catch (e) {
    throw new Error(`Could not load ${sourceType}: ${e.message}`);
  }

  if (!record) throw new Error(`${sourceType} not found`);

  // Build entity name from record
  const displayName = record.trend_name ?? record.first_name
    ? `${record.first_name ?? ''} ${record.last_name ?? ''}`.trim()
    : record.name ?? record.title ?? record.series_name ?? record.track_name ?? record.event_name ?? sourceId;

  entityNames = [displayName];
  if (sourceType === 'driver' && record.team_id) seriesId = record.primary_series_id;
  if (sourceType === 'series') seriesId = sourceId;

  const [coverage, results, standings, events, stories] = await Promise.all([
    gatherRecentCoverage(base44, entityNames),
    gatherRecentResults(base44, [sourceId], entityNames),
    gatherStandings(base44, seriesId),
    gatherUpcomingEvents(base44, seriesId),
    gatherRecentStories(base44, entityNames),
  ]);

  return {
    sourceTitle: displayName,
    entityNames,
    entityIds: [sourceId],
    context: { record, sourceType, coverage, results, standings, events, stories },
    relatedRecommendationIds: [],
    relatedTrendClusterIds: [],
    relatedNarrativeArcIds: [],
  };
}

async function loadManualTopicContext(base44, payload) {
  const topic = payload.topic ?? 'Unknown Topic';
  const entityNames = payload.entity_names ?? [];
  const [coverage, stories] = await Promise.all([
    gatherRecentCoverage(base44, entityNames),
    gatherRecentStories(base44, entityNames),
  ]);

  return {
    sourceTitle: topic,
    entityNames,
    entityIds: [],
    context: { topic, additionalContext: payload.context ?? '', coverage, stories },
    relatedRecommendationIds: [],
    relatedTrendClusterIds: [],
    relatedNarrativeArcIds: [],
  };
}

// ─── AI PACKET BUILDER ───────────────────────────────────────────────────────

const PACKET_SCHEMA = {
  type: 'object',
  properties: {
    title:                          { type: 'string' },
    summary:                        { type: 'string' },
    editorial_brief:                { type: 'string' },
    why_this_matters:               { type: 'string' },
    recommended_angle:              { type: 'string' },
    target_reader:                  { type: 'string' },
    recent_results_context:         { type: 'string' },
    standings_context:              { type: 'string' },
    schedule_context:               { type: 'string' },
    business_context:               { type: 'string' },
    cultural_context:               { type: 'string' },
    historical_context:             { type: 'string' },
    recent_coverage_summary:        { type: 'string' },
    coverage_gaps:                  { type: 'string' },
    key_talking_points:             { type: 'array', items: { type: 'string' } },
    stats_snapshot:                 { type: 'string' },
    notable_quotes_or_placeholders: { type: 'string' },
    seo_keywords:                   { type: 'array', items: { type: 'string' } },
    suggested_headlines:            { type: 'array', items: { type: 'string' } },
    suggested_sections:             { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'summary', 'editorial_brief', 'recommended_angle'],
};

function buildContextBlock(ctx, sourceType) {
  const lines = [];

  // Source-specific context
  if (ctx.recommendation) {
    const r = ctx.recommendation;
    lines.push(`STORY RECOMMENDATION:`);
    lines.push(`  Title: ${r.title_suggestion ?? ''}`);
    lines.push(`  Summary: ${r.summary ?? ''}`);
    lines.push(`  Angle: ${r.angle ?? ''}`);
    lines.push(`  Why Now: ${r.why_now ?? ''}`);
    lines.push(`  Story Type: ${r.story_type ?? ''} | Category: ${r.recommended_category ?? ''}`);
    lines.push(`  Priority: ${r.priority_score ?? 0} | Urgency: ${r.urgency_score ?? 0} | Confidence: ${r.confidence_score ?? 0}`);
    if (r.draft_outline) lines.push(`  Draft Outline: ${r.draft_outline.slice(0, 300)}`);
    lines.push('');
  }

  if (ctx.arc) {
    const a = ctx.arc;
    lines.push(`NARRATIVE ARC:`);
    lines.push(`  Name: ${a.arc_name ?? ''}`);
    lines.push(`  Type: ${a.arc_type ?? ''}`);
    lines.push(`  Summary: ${a.arc_summary ?? ''}`);
    lines.push(`  Momentum: ${a.momentum_score ?? 0} | Importance: ${a.importance_score ?? 0}`);
    lines.push(`  Entities: ${(a.entity_names ?? []).join(', ')}`);
    lines.push('');
  }

  if (ctx.cluster) {
    const c = ctx.cluster;
    lines.push(`TREND CLUSTER:`);
    lines.push(`  Name: ${c.trend_name ?? ''}`);
    lines.push(`  Type: ${c.trend_type ?? ''}`);
    lines.push(`  Summary: ${c.trend_summary ?? ''}`);
    lines.push(`  Momentum: ${c.momentum_score ?? 0} | Signals: ${c.signal_count ?? 0}`);
    lines.push('');
  }

  if (ctx.story) {
    const s = ctx.story;
    lines.push(`EXISTING STORY CONTEXT:`);
    lines.push(`  Title: ${s.title ?? ''}`);
    lines.push(`  Category: ${s.primary_category ?? ''} / ${s.sub_category ?? ''}`);
    lines.push(`  Status: ${s.status ?? ''}`);
    lines.push(`  Published: ${s.published_date ?? 'not yet'}`);
    if (s.subtitle) lines.push(`  Subtitle: ${s.subtitle}`);
    lines.push('');
  }

  if (ctx.record && ctx.sourceType) {
    lines.push(`ENTITY: ${(ctx.sourceType ?? '').toUpperCase()}`);
    lines.push(`  ${JSON.stringify(ctx.record).slice(0, 500)}`);
    lines.push('');
  }

  if (ctx.results?.length) {
    lines.push(`RECENT RESULTS (${ctx.results.length}):`);
    for (const r of ctx.results.slice(0, 8)) {
      const pos = r.position ?? r.finish_position ?? '?';
      const name = r.driver_name ?? r.team_name ?? '';
      const event = r.event_name ?? r.series_name ?? '';
      lines.push(`  - Position ${pos}: ${name} @ ${event}`);
    }
    lines.push('');
  }

  if (ctx.standings?.length) {
    lines.push(`CURRENT STANDINGS (top ${Math.min(ctx.standings.length, 8)}):`);
    for (const s of ctx.standings.slice(0, 8)) {
      lines.push(`  - ${s.position ?? '?'}. ${s.driver_name ?? s.team_name ?? 'Unknown'}: ${s.points ?? 0} pts`);
    }
    lines.push('');
  }

  if (ctx.events?.length) {
    lines.push(`UPCOMING EVENTS:`);
    for (const e of ctx.events.slice(0, 4)) {
      lines.push(`  - ${e.name ?? e.event_name ?? 'Event'} on ${e.event_date ?? e.start_date ?? 'TBD'}`);
    }
    lines.push('');
  }

  if (ctx.coverage?.length) {
    lines.push(`RECENT OUTLET COVERAGE (${ctx.coverage.length} related articles):`);
    for (const c of ctx.coverage) {
      lines.push(`  - "${c.story_title}" [${c.article_type ?? 'story'}] — ${c.published_date?.slice(0, 10) ?? 'unknown'}`);
      if (c.article_angle) lines.push(`    Angle: ${c.article_angle}`);
    }
    lines.push('');
  } else {
    lines.push(`RECENT OUTLET COVERAGE: None found for this topic.`);
    lines.push('');
  }

  if (ctx.stories?.length) {
    lines.push(`PUBLISHED OUTLET STORIES (${ctx.stories.length}):`);
    for (const s of ctx.stories.slice(0, 6)) {
      lines.push(`  - "${s.title}" — ${s.published_date?.slice(0, 10) ?? s.status}`);
    }
    lines.push('');
  }

  if (ctx.topic) {
    lines.push(`TOPIC: ${ctx.topic}`);
    if (ctx.additionalContext) lines.push(`ADDITIONAL CONTEXT: ${ctx.additionalContext}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function runAIPacketBuilder(base44, sourceType, sourceTitle, contextBlock) {
  const prompt = [
    `You are an editorial research assistant for The Outlet, a motorsports and culture media publication.`,
    ``,
    `Generate a comprehensive, writer-ready research packet for the following editorial topic.`,
    `Your job: organize facts, identify context, surface story angles, point out coverage gaps, and help the writer move faster.`,
    ``,
    `IMPORTANT RULES:`,
    `- Do NOT invent or fabricate facts. If information is incomplete, clearly indicate uncertainty.`,
    `- Do NOT auto-publish or write a finished article.`,
    `- Focus on accuracy, clarity, and practical narrative usefulness.`,
    `- Highlight what matters most to The Outlet audience (motorsports fans, drivers, teams, industry professionals).`,
    `- Identify fresh angles or undercovered elements based on the coverage context provided.`,
    ``,
    `SOURCE TYPE: ${sourceType.replace(/_/g, ' ').toUpperCase()}`,
    `SOURCE TITLE: ${sourceTitle}`,
    ``,
    `=== CONTEXT ===`,
    contextBlock,
    `=== END CONTEXT ===`,
    ``,
    `Generate the full research packet. For each section:`,
    `- summary: 2-3 sentences on what this packet covers`,
    `- editorial_brief: the story opportunity and why The Outlet should cover this`,
    `- why_this_matters: relevance to motorsports fans and The Outlet's audience`,
    `- recommended_angle: the sharpest, most compelling editorial angle`,
    `- target_reader: who would be most interested`,
    `- recent_results_context: summarize what recent competition results tell us`,
    `- standings_context: what the standings reveal (if relevant)`,
    `- schedule_context: upcoming events or timing that matters (if relevant)`,
    `- business_context: sponsorship, team moves, business angles (if relevant, otherwise leave empty)`,
    `- cultural_context: human interest, culture, fan angle (if relevant, otherwise leave empty)`,
    `- historical_context: historical precedent or comparison (if relevant, otherwise leave empty)`,
    `- recent_coverage_summary: what The Outlet has already published on this topic`,
    `- coverage_gaps: what has NOT been covered that should be`,
    `- key_talking_points: 5-8 concrete bullet points a writer should hit`,
    `- stats_snapshot: key numbers, records, or data points in plain text`,
    `- notable_quotes_or_placeholders: suggest who to interview or what quotes might exist`,
    `- seo_keywords: 6-10 keywords for search optimization`,
    `- suggested_headlines: 3 headline options (varied tone/angle)`,
    `- suggested_sections: 4-6 article section headings for the body`,
    ``,
    `Return structured JSON.`,
  ].join('\n');

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: PACKET_SCHEMA,
    model: 'claude_sonnet_4_6',
  });
}

// ─── MAIN BUILD FUNCTION ─────────────────────────────────────────────────────

async function buildPacket(base44, { source_type, source_id, topic, context, entity_names, regenerate, requested_by }) {
  const now = new Date().toISOString();
  const fingerprint = buildFingerprint(source_type, source_id ?? topic);

  // Dedup check
  if (!regenerate) {
    const existing = await findRecentPacket(base44, fingerprint);
    if (existing) {
      return { success: true, packet_id: existing.id, reused: true, message: 'Recent packet already exists.' };
    }
  }

  // Load source context
  let loaded;
  switch (source_type) {
    case 'recommendation':  loaded = await loadRecommendationContext(base44, source_id); break;
    case 'narrative_arc':   loaded = await loadNarrativeArcContext(base44, source_id); break;
    case 'trend_cluster':   loaded = await loadTrendClusterContext(base44, source_id); break;
    case 'story':           loaded = await loadStoryContext(base44, source_id); break;
    case 'manual_topic':    loaded = await loadManualTopicContext(base44, { topic, context, entity_names }); break;
    default:
      // Driver, team, track, series, event
      loaded = await loadEntityContext(base44, source_type, source_id);
  }

  const contextBlock = buildContextBlock(loaded.context, source_type);

  // Generate AI packet
  let aiResult;
  try {
    aiResult = await runAIPacketBuilder(base44, source_type, loaded.sourceTitle, contextBlock);
  } catch (err) {
    throw new Error(`AI generation failed: ${err.message}`);
  }

  // Save packet
  const packet = await base44.asServiceRole.entities.StoryResearchPacket.create({
    generated_at:                   now,
    source_type,
    source_id:                      source_id ?? null,
    source_title:                   loaded.sourceTitle,
    title:                          aiResult.title ?? loaded.sourceTitle,
    summary:                        aiResult.summary ?? '',
    editorial_brief:                aiResult.editorial_brief ?? '',
    why_this_matters:               aiResult.why_this_matters ?? '',
    recommended_angle:              aiResult.recommended_angle ?? '',
    target_reader:                  aiResult.target_reader ?? '',
    recent_results_context:         aiResult.recent_results_context ?? '',
    standings_context:              aiResult.standings_context ?? '',
    schedule_context:               aiResult.schedule_context ?? '',
    business_context:               aiResult.business_context ?? '',
    cultural_context:               aiResult.cultural_context ?? '',
    historical_context:             aiResult.historical_context ?? '',
    recent_coverage_summary:        aiResult.recent_coverage_summary ?? '',
    coverage_gaps:                  aiResult.coverage_gaps ?? '',
    key_talking_points:             aiResult.key_talking_points ?? [],
    stats_snapshot:                 aiResult.stats_snapshot ?? '',
    notable_quotes_or_placeholders: aiResult.notable_quotes_or_placeholders ?? '',
    seo_keywords:                   aiResult.seo_keywords ?? [],
    suggested_headlines:            aiResult.suggested_headlines ?? [],
    suggested_sections:             aiResult.suggested_sections ?? [],
    related_entity_ids:             loaded.entityIds ?? [],
    related_entity_names:           loaded.entityNames ?? [],
    related_story_ids:              loaded.relatedStoryIds ?? [],
    related_recommendation_ids:     loaded.relatedRecommendationIds ?? [],
    related_trend_cluster_ids:      loaded.relatedTrendClusterIds ?? [],
    related_narrative_arc_ids:      loaded.relatedNarrativeArcIds ?? [],
    status:                         'generated',
    research_fingerprint:           fingerprint,
  });

  await logOp(base44, regenerate ? 'story_research_packet_regenerated' : 'story_research_packet_generated', {
    packet_id:   packet.id,
    source_type,
    source_id:   source_id ?? null,
    acted_by:    requested_by ?? null,
  });

  return { success: true, packet_id: packet.id, reused: false };
}

// ─── ATTACH TO DRAFT ─────────────────────────────────────────────────────────

async function attachToDraft(base44, packetId, storyId, requestedBy) {
  const [packet, story] = await Promise.all([
    base44.asServiceRole.entities.StoryResearchPacket.get(packetId),
    base44.asServiceRole.entities.OutletStory.get(storyId),
  ]);

  if (!packet) return { success: false, error: 'Packet not found' };
  if (!story) return { success: false, error: 'Story not found' };
  if (story.status === 'published') return { success: false, error: 'Cannot attach to a published story. Only drafts.' };

  await base44.asServiceRole.entities.StoryResearchPacket.update(packetId, {
    status: 'attached_to_draft',
    linked_draft_story_id: storyId,
  });

  await logOp(base44, 'story_research_packet_attached_to_draft', {
    packet_id: packetId,
    story_id:  storyId,
    acted_by:  requestedBy ?? null,
  });

  return { success: true };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (user !== null && !ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'generate';

    if (action === 'attach_to_draft') {
      const result = await attachToDraft(base44, body.packet_id, body.story_id, user?.email);
      return Response.json(result);
    }

    // Default: generate
    const { source_type, source_id, topic, context, entity_names, regenerate } = body;

    if (!source_type) {
      return Response.json({ error: 'source_type is required' }, { status: 400 });
    }

    if (source_type !== 'manual_topic' && !source_id) {
      return Response.json({ error: 'source_id is required for non-manual topics' }, { status: 400 });
    }

    const result = await buildPacket(base44, {
      source_type, source_id, topic, context, entity_names,
      regenerate: regenerate === true,
      requested_by: user?.email,
    });

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});