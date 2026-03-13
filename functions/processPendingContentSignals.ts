import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, event_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      event_type,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    });
  } catch (_) { /* fire-and-forget */ }
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
    audience_fit_score:         { type: 'number' },
    freshness_score:            { type: 'number' },
    narrative_strength_score:   { type: 'number' },
    coverage_gap_score:         { type: 'number' },
  },
  required: ['worth_covering'],
};

function buildPrompt(signal) {
  const parts = [
    `You are an editorial strategist for The Outlet, a motorsports media publication covering racing, business, culture, tech, and marketplace.`,
    ``,
    `Evaluate the following platform update for editorial value. Focus on:`,
    `- Motorsports relevance and newsworthiness`,
    `- Narrative potential and story hook strength`,
    `- Urgency and time-sensitivity`,
    `- Audience interest for motorsports readers`,
    `- Whether this creates a genuinely new story opportunity (not a repeat of existing coverage)`,
    ``,
    `Rules:`,
    `- Prefer concrete narrative hooks over generic angles`,
    `- Avoid recommending filler or obvious recap content`,
    `- Prioritize explainable, specific reasoning`,
    `- Do NOT auto-publish or finalize anything — this is a recommendation only`,
    `- Recommend only if there is clear editorial merit`,
    ``,
    `SIGNAL DETAILS:`,
    `  Signal Type: ${signal.signal_type ?? 'unknown'}`,
    `  Trigger Action: ${signal.trigger_action ?? 'unknown'}`,
    `  Summary: ${signal.signal_summary ?? '(none)'}`,
    `  Source Entity Type: ${signal.source_entity_type ?? 'unknown'}`,
    `  Source Entity Name: ${signal.source_entity_name ?? 'unknown'}`,
    `  Importance Level: ${signal.importance_level ?? 'medium'}`,
  ];

  if (signal.previous_value || signal.new_value) {
    parts.push(`  Change: "${signal.previous_value ?? '—'}" → "${signal.new_value ?? '—'}"`);
  }

  if (signal.related_entity_names?.length) {
    parts.push(`  Related Entities: ${signal.related_entity_names.join(', ')}`);
  }

  if (signal.raw_data) {
    try {
      const raw = JSON.parse(signal.raw_data);
      const preview = JSON.stringify(raw).slice(0, 400);
      parts.push(`  Raw Data Preview: ${preview}`);
    } catch (_) { /* skip */ }
  }

  parts.push(``);
  parts.push(`Based on all of the above, return a structured JSON assessment. All score fields should be 0–100. Be direct and specific in title, angle, and summary fields. If worth_covering is false, you may leave most text fields empty but still explain briefly in the summary why this is not worth covering.`);

  return parts.join('\n');
}

async function evaluateSignalWithAI(base44, signal) {
  const prompt = buildPrompt(signal);
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: AI_OUTPUT_SCHEMA,
  });
  return result;
}

// ─── SIGNAL PROCESSING ────────────────────────────────────────────────────────

async function processSignal(base44, signal, stats) {
  let aiResult = null;

  try {
    aiResult = await evaluateSignalWithAI(base44, signal);
  } catch (err) {
    // AI call failed — mark errored, log, allow retry
    await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
      status: 'errored',
      ai_processed: false,
      processing_notes: `AI evaluation failed: ${err.message}`,
      error_message: err.message,
    });
    await logOp(base44, 'story_radar_signal_processing_failed', {
      signal_id: signal.id,
      source_entity_type: signal.source_entity_type,
      source_entity_id: signal.source_entity_id,
      error: err.message,
    });
    stats.signals_errored++;
    stats.errors.push(`Signal ${signal.id}: ${err.message}`);
    return;
  }

  const now = new Date().toISOString();

  if (!aiResult?.worth_covering) {
    // Not worth covering — mark as ignored
    await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
      status: 'ignored',
      ai_processed: true,
      ai_processed_at: now,
      ai_notes: aiResult?.summary ?? 'AI determined not worth covering.',
    });
    await logOp(base44, 'story_radar_signal_processed', {
      signal_id: signal.id,
      source_entity_type: signal.source_entity_type,
      source_entity_id: signal.source_entity_id,
      worth_covering: false,
    });
    stats.signals_ignored++;
    return;
  }

  // Worth covering — create StoryRecommendation
  let recommendation = null;
  try {
    recommendation = await base44.asServiceRole.entities.StoryRecommendation.create({
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
      status:                     'suggested',
      generated_at:               now,
      source_signal_ids:          [signal.id],
      related_entity_ids:         signal.source_entity_id ? [signal.source_entity_id] : [],
      related_entity_names:       signal.source_entity_name ? [signal.source_entity_name] : [],
    });
  } catch (err) {
    // Recommendation create failed — still mark signal errored
    await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
      status: 'errored',
      ai_processed: false,
      processing_notes: `Recommendation creation failed: ${err.message}`,
      error_message: err.message,
    });
    await logOp(base44, 'story_radar_signal_processing_failed', {
      signal_id: signal.id,
      source_entity_type: signal.source_entity_type,
      source_entity_id: signal.source_entity_id,
      error: `Recommendation creation failed: ${err.message}`,
    });
    stats.signals_errored++;
    stats.errors.push(`Signal ${signal.id} recommendation create: ${err.message}`);
    return;
  }

  // Mark signal as processed, link recommendation
  await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
    status: 'processed',
    ai_processed: true,
    ai_processed_at: now,
    ai_notes: aiResult.summary ?? '',
    linked_recommendation_id: recommendation.id,
    recommendation_ids: [recommendation.id],
  });

  await logOp(base44, 'story_radar_recommendation_generated', {
    signal_id: signal.id,
    source_entity_type: signal.source_entity_type,
    source_entity_id: signal.source_entity_id,
    worth_covering: true,
    recommendation_id: recommendation.id,
    title_suggestion: aiResult.title_suggestion,
    priority_score: aiResult.priority_score,
  });

  stats.recommendations_created++;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize  = Math.min(Number(body.batch_size) || 10, 25); // cap at 25
    const retryErrors = body.retry_errors === true;

    // Build status filter: new, queued, and optionally errored
    const statusesToProcess = retryErrors
      ? ['new', 'queued', 'errored']
      : ['new', 'queued'];

    // Fetch unprocessed signals
    const allPending = [];
    for (const status of statusesToProcess) {
      const batch = await base44.asServiceRole.entities.ContentSignal.filter(
        { ai_processed: false, status },
        '-created_date',
        batchSize
      );
      allPending.push(...batch);
    }

    // Deduplicate (in case of overlap) and cap
    const seen = new Set();
    const pending = [];
    for (const s of allPending) {
      if (!seen.has(s.id) && pending.length < batchSize) {
        seen.add(s.id);
        pending.push(s);
      }
    }

    const stats = {
      signals_checked:          pending.length,
      recommendations_created:  0,
      signals_ignored:          0,
      signals_errored:          0,
      warnings:                 [],
      errors:                   [],
    };

    if (pending.length === 0) {
      return Response.json({ success: true, message: 'No pending signals to process.', ...stats });
    }

    // Mark all as queued before processing to prevent double-pickup
    for (const signal of pending) {
      if (signal.status === 'new') {
        await base44.asServiceRole.entities.ContentSignal.update(signal.id, { status: 'queued' });
      }
    }

    // Process sequentially to avoid rate-limit issues
    for (const signal of pending) {
      await processSignal(base44, signal, stats);
    }

    return Response.json({
      success: true,
      signals_checked:         stats.signals_checked,
      recommendations_created: stats.recommendations_created,
      signals_ignored:         stats.signals_ignored,
      signals_errored:         stats.signals_errored,
      warnings:                stats.warnings,
      errors:                  stats.errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});