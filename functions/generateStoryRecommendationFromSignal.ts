import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Statuses that constitute an "active" recommendation (block dedup creation)
const ACTIVE_STATUSES = ['suggested', 'approved', 'saved', 'drafted'];

// Default cooldown in hours after a recommendation is created
const DEFAULT_COOLDOWN_HOURS = 48;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryRecommendation',
      entity_id: metadata.recommendation_id ?? metadata.signal_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

/**
 * Build a stable deduplication fingerprint from the AI result + signal context.
 * Format: story_type::category::sorted_entity_ids::top_angle_words
 */
function buildFingerprint(aiResult, signal) {
  const type = (aiResult.story_type ?? 'news').toLowerCase().trim();
  const category = (aiResult.recommended_category ?? '').toLowerCase().trim();

  const entityIds = [signal.source_entity_id]
    .filter(Boolean)
    .sort()
    .join('|');

  const angleWords = (aiResult.angle ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 5)
    .sort()
    .join('-');

  return `${type}::${category}::${entityIds}::${angleWords}`;
}

// ─── AI EVALUATION ────────────────────────────────────────────────────────────

const AI_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    worth_covering:             { type: 'boolean' },
    title_suggestion:           { type: 'string' },
    summary:                    { type: 'string' },
    angle:                      { type: 'string' },
    why_now:                    { type: 'string' },
    story_type:                 { type: 'string' },
    target_reader:              { type: 'string' },
    recommended_category:       { type: 'string' },
    recommended_subcategory:    { type: 'string' },
    recommended_tags:           { type: 'array', items: { type: 'string' } },
    recommended_format:         { type: 'string' },
    publish_timing:             { type: 'string' },
    seo_keywords:               { type: 'array', items: { type: 'string' } },
    suggested_headline_alt_1:   { type: 'string' },
    suggested_headline_alt_2:   { type: 'string' },
    suggested_excerpt:          { type: 'string' },
    draft_intro:                { type: 'string' },
    draft_outline:              { type: 'string' },
    priority_score:             { type: 'number' },
    urgency_score:              { type: 'number' },
    confidence_score:           { type: 'number' },
    newsworthiness_score:       { type: 'number' },
    coverage_gap_score:         { type: 'number' },
    follow_up_story_flag:       { type: 'boolean' },
    story_gap_detected:         { type: 'boolean' },
  },
  required: ['worth_covering'],
};

// ─── COVERAGE CONTEXT ────────────────────────────────────────────────────────

async function fetchCoverageContext(base44, signal) {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const recentCoverage = await base44.asServiceRole.entities.OutletStoryCoverageMap.list('-published_date', 50);
    const entityName = signal.source_entity_name ?? '';
    return recentCoverage.filter(c => {
      if (!c.published_date || c.published_date < cutoff) return false;
      if (entityName && c.covered_entity_names?.some(n => n.toLowerCase().includes(entityName.toLowerCase()))) return true;
      if (c.category === signal.source_entity_type) return true;
      return false;
    }).slice(0, 5);
  } catch (_) {
    return [];
  }
}

function buildCoverageContextBlock(coverageRows) {
  if (!coverageRows.length) return '';
  const lines = [``, `RECENT OUTLET COVERAGE MEMORY (use to inform coverage_gap_score and follow_up_story_flag):`];
  for (const c of coverageRows) {
    const date = c.published_date ? c.published_date.slice(0, 10) : 'unknown date';
    lines.push(`  - "${c.story_title}" [${c.article_type ?? 'story'}] on ${date}`);
    if (c.article_angle) lines.push(`    Angle: ${c.article_angle}`);
    if (c.covered_topics?.length) lines.push(`    Topics: ${c.covered_topics.slice(0, 4).join(', ')}`);
  }
  lines.push(``, `Coverage scoring guidance:`);
  lines.push(`  - If same entity + same angle recently covered → lower coverage_gap_score, set follow_up_story_flag=true`);
  lines.push(`  - If same entity but clearly new angle → keep coverage_gap_score, story still has merit`);
  lines.push(`  - If entity not recently covered → raise coverage_gap_score, story_gap_detected may be true`);
  return lines.join('\n');
}

async function runAIEvaluation(base44, signal) {
  const coverageRows = await fetchCoverageContext(base44, signal);

  const parts = [
    `You are an editorial strategist for The Outlet, a motorsports media publication.`,
    ``,
    `Evaluate the following platform update for editorial value. Focus on:`,
    `- Motorsports relevance and newsworthiness`,
    `- Narrative potential and concrete story hook strength`,
    `- Urgency and time-sensitivity`,
    `- Audience interest for motorsports readers`,
    `- Whether this creates a genuinely new story opportunity`,
    ``,
    `Rules:`,
    `- Prefer concrete narrative hooks over generic angles`,
    `- Avoid filler or obvious recap content`,
    `- Do NOT auto-publish — this is a recommendation only`,
    `- Set follow_up_story_flag = true if this clearly relates to a recently published story`,
    `- Set story_gap_detected = true if the topic is important but undercovered`,
    ``,
    `SIGNAL:`,
    `  Type: ${signal.signal_type ?? 'unknown'}`,
    `  Action: ${signal.trigger_action ?? 'unknown'}`,
    `  Summary: ${signal.signal_summary ?? '(none)'}`,
    `  Entity Type: ${signal.source_entity_type ?? 'unknown'}`,
    `  Entity Name: ${signal.source_entity_name ?? 'unknown'}`,
    `  Importance: ${signal.importance_level ?? 'medium'}`,
  ];

  if (signal.previous_value || signal.new_value) {
    parts.push(`  Change: "${signal.previous_value ?? '—'}" → "${signal.new_value ?? '—'}"`);
  }
  if (signal.related_entity_names?.length) {
    parts.push(`  Related: ${signal.related_entity_names.join(', ')}`);
  }
  if (signal.raw_data) {
    try {
      const preview = JSON.stringify(JSON.parse(signal.raw_data)).slice(0, 400);
      parts.push(`  Raw Preview: ${preview}`);
    } catch (_) { /* skip */ }
  }

  parts.push(buildCoverageContextBlock(coverageRows));
  parts.push(``, `Return structured JSON. All score fields 0–100.`);

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: parts.join('\n'),
    response_json_schema: AI_OUTPUT_SCHEMA,
  });
}

// ─── DUPLICATE / COOLDOWN CHECKS ─────────────────────────────────────────────

/**
 * Find an active recommendation matching this fingerprint that is not in cooldown.
 * Returns { existing, inCooldown } where existing may be null.
 */
async function findExistingRecommendation(base44, fingerprint) {
  const now = new Date().toISOString();

  // Fetch active recommendations with this fingerprint
  const matches = await base44.asServiceRole.entities.StoryRecommendation.filter(
    { recommendation_fingerprint: fingerprint },
    '-created_date',
    10
  );

  const active = matches.filter(r => ACTIVE_STATUSES.includes(r.status));
  if (!active.length) return { existing: null, inCooldown: false };

  const newest = active[0];

  // Check cooldown
  if (newest.cooldown_until && newest.cooldown_until > now) {
    return { existing: newest, inCooldown: true };
  }

  return { existing: newest, inCooldown: false };
}

// ─── MAIN GENERATION LOGIC ───────────────────────────────────────────────────

async function generate(base44, signalId, providedAiResult) {
  // 1. Load signal
  const signal = await base44.asServiceRole.entities.ContentSignal.get(signalId);
  if (!signal) {
    return { success: false, error: `Signal ${signalId} not found` };
  }

  // 2. Run AI if not provided
  let aiResult = providedAiResult;
  if (!aiResult) {
    aiResult = await runAIEvaluation(base44, signal);
  }

  // 3. Not worth covering
  if (!aiResult?.worth_covering) {
    return { success: true, worth_covering: false, action: 'not_covering' };
  }

  // 4. Build fingerprint
  const fingerprint = buildFingerprint(aiResult, signal);

  // 5. Check for existing active recommendation
  const { existing, inCooldown } = await findExistingRecommendation(base44, fingerprint);
  const now = new Date().toISOString();

  if (existing) {
    if (inCooldown) {
      // Suppressed by cooldown — just attach signal
      const updatedSignalIds = [...new Set([...(existing.source_signal_ids ?? []), signalId])];
      await base44.asServiceRole.entities.StoryRecommendation.update(existing.id, {
        source_signal_ids: updatedSignalIds,
        editor_notes: (existing.editor_notes ?? '') +
          `\n[suppressed] Signal ${signalId} merged at ${now} (cooldown active until ${existing.cooldown_until}).`,
      });
      await logOp(base44, 'story_radar_recommendation_suppressed', {
        signal_id: signalId,
        recommendation_id: existing.id,
        recommendation_fingerprint: fingerprint,
        suppression_reason: `cooldown_active_until_${existing.cooldown_until}`,
      });
      return { success: true, action: 'suppressed', recommendation_id: existing.id, fingerprint };
    }

    // Active duplicate — merge signal into existing
    const updatedSignalIds = [...new Set([...(existing.source_signal_ids ?? []), signalId])];
    await base44.asServiceRole.entities.StoryRecommendation.update(existing.id, {
      source_signal_ids: updatedSignalIds,
      urgency_score: Math.max(existing.urgency_score ?? 0, aiResult.urgency_score ?? 0),
      editor_notes: (existing.editor_notes ?? '') +
        `\n[merged] Signal ${signalId} at ${now}.`,
    });
    await logOp(base44, 'story_radar_recommendation_merged', {
      signal_id: signalId,
      recommendation_id: existing.id,
      recommendation_fingerprint: fingerprint,
    });
    return { success: true, action: 'merged', recommendation_id: existing.id, fingerprint };
  }

  // 6. Create new recommendation
  const cooldownUntil = new Date(Date.now() + DEFAULT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

  const recommendation = await base44.asServiceRole.entities.StoryRecommendation.create({
    title_suggestion:           aiResult.title_suggestion ?? '',
    slug_suggestion:            aiResult.title_suggestion
                                  ? aiResult.title_suggestion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                                  : '',
    summary:                    aiResult.summary ?? '',
    angle:                      aiResult.angle ?? '',
    why_now:                    aiResult.why_now ?? '',
    story_type:                 aiResult.story_type ?? 'news',
    target_reader:              aiResult.target_reader ?? '',
    recommended_category:       aiResult.recommended_category ?? '',
    recommended_subcategory:    aiResult.recommended_subcategory ?? '',
    recommended_tags:           aiResult.recommended_tags ?? [],
    recommended_format:         aiResult.recommended_format ?? 'short',
    publish_timing:             aiResult.publish_timing ?? '',
    seo_keywords:               aiResult.seo_keywords ?? [],
    suggested_headline_alt_1:   aiResult.suggested_headline_alt_1 ?? '',
    suggested_headline_alt_2:   aiResult.suggested_headline_alt_2 ?? '',
    suggested_excerpt:          aiResult.suggested_excerpt ?? '',
    draft_intro:                aiResult.draft_intro ?? '',
    draft_outline:              aiResult.draft_outline ?? '',
    priority_score:             aiResult.priority_score ?? 50,
    urgency_score:              aiResult.urgency_score ?? 50,
    confidence_score:           aiResult.confidence_score ?? 50,
    newsworthiness_score:       aiResult.newsworthiness_score ?? 50,
    coverage_gap_score:         aiResult.coverage_gap_score ?? 50,
    follow_up_story_flag:       aiResult.follow_up_story_flag === true,
    story_gap_detected:         aiResult.story_gap_detected === true,
    status:                     'suggested',
    recommendation_fingerprint: fingerprint,
    cooldown_until:             cooldownUntil,
    generated_at:               now,
    source_signal_ids:          [signalId],
    related_entity_ids:         signal.source_entity_id ? [signal.source_entity_id] : [],
    related_entity_names:       signal.source_entity_name ? [signal.source_entity_name] : [],
  });

  await logOp(base44, 'story_radar_recommendation_created', {
    signal_id: signalId,
    recommendation_id: recommendation.id,
    recommendation_fingerprint: fingerprint,
    title_suggestion: aiResult.title_suggestion,
    priority_score: aiResult.priority_score,
    source_entity_type: signal.source_entity_type,
    source_entity_id: signal.source_entity_id,
  });

  return {
    success: true,
    action: 'created',
    recommendation_id: recommendation.id,
    fingerprint,
    worth_covering: true,
  };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { signal_id, ai_result } = body;

    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    const result = await generate(base44, signal_id, ai_result ?? null);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});