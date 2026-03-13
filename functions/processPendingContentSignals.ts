import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['suggested', 'approved', 'saved', 'drafted'];
const DEFAULT_COOLDOWN_HOURS = 48;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: metadata.source_entity_type ?? 'ContentSignal',
      entity_id: metadata.signal_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

function buildFingerprint(aiResult, signal) {
  const type = (aiResult.story_type ?? 'news').toLowerCase().trim();
  const category = (aiResult.recommended_category ?? '').toLowerCase().trim();
  const entityIds = [signal.source_entity_id].filter(Boolean).sort().join('|');
  const angleWords = (aiResult.angle ?? '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ')
    .filter(w => w.length > 3).slice(0, 5).sort().join('-');
  return `${type}::${category}::${entityIds}::${angleWords}`;
}

async function findExistingRecommendation(base44, fingerprint) {
  const now = new Date().toISOString();
  const matches = await base44.asServiceRole.entities.StoryRecommendation.filter(
    { recommendation_fingerprint: fingerprint }, '-created_date', 10
  );
  const active = matches.filter(r => ACTIVE_STATUSES.includes(r.status));
  if (!active.length) return { existing: null, inCooldown: false };
  const newest = active[0];
  if (newest.cooldown_until && newest.cooldown_until > now) {
    return { existing: newest, inCooldown: true };
  }
  return { existing: newest, inCooldown: false };
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
    // Fetch recent coverage entries for the same entity or category
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const recentCoverage = await base44.asServiceRole.entities.OutletStoryCoverageMap.list('-published_date', 50);
    const entityName = signal.source_entity_name ?? '';
    const relevant = recentCoverage.filter(c => {
      if (!c.published_date || c.published_date < cutoff) return false;
      if (entityName && c.covered_entity_names?.some(n => n.toLowerCase().includes(entityName.toLowerCase()))) return true;
      if (c.category === signal.source_entity_type) return true;
      return false;
    }).slice(0, 5);
    return relevant;
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

async function evaluateSignalWithAI(base44, signal) {
  const coverageRows = await fetchCoverageContext(base44, signal);

  // Log that a coverage check was run for this signal
  await logOp(base44, 'story_radar_coverage_check_run', {
    signal_id: signal.id,
    source_entity_name: signal.source_entity_name,
    coverage_rows_found: coverageRows.length,
  });

  const parts = [
    `You are an editorial strategist for The Outlet, a motorsports media publication.`,
    `Evaluate the following platform update for editorial value. Focus on motorsports relevance, narrative potential, urgency, and audience interest.`,
    `Rules: prefer concrete hooks, avoid filler, do NOT auto-publish, recommend only if clear editorial merit.`,
    `Set follow_up_story_flag=true if this clearly relates to a recent published story.`,
    `Set story_gap_detected=true if topic is important but undercovered.`,
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
    try { parts.push(`  Raw Preview: ${JSON.stringify(JSON.parse(signal.raw_data)).slice(0, 400)}`); } catch (_) { /* skip */ }
  }

  parts.push(buildCoverageContextBlock(coverageRows));
  parts.push(``, `Return structured JSON. All score fields 0–100.`);

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: parts.join('\n'),
    response_json_schema: AI_OUTPUT_SCHEMA,
  });
}

// ─── SIGNAL PROCESSING ────────────────────────────────────────────────────────

async function processSignal(base44, signal, stats) {
  let aiResult = null;

  try {
    aiResult = await evaluateSignalWithAI(base44, signal);
  } catch (err) {
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

  // Build fingerprint and check for dedup/cooldown
  const fingerprint = buildFingerprint(aiResult, signal);
  const { existing, inCooldown } = await findExistingRecommendation(base44, fingerprint);

  if (existing) {
    const updatedSignalIds = [...new Set([...(existing.source_signal_ids ?? []), signal.id])];
    const noteTag = inCooldown ? '[suppressed]' : '[merged]';
    await base44.asServiceRole.entities.StoryRecommendation.update(existing.id, {
      source_signal_ids: updatedSignalIds,
      urgency_score: Math.max(existing.urgency_score ?? 0, aiResult.urgency_score ?? 0),
      editor_notes: (existing.editor_notes ?? '') +
        `\n${noteTag} Signal ${signal.id} at ${now}${inCooldown ? ` (cooldown until ${existing.cooldown_until})` : ''}.`,
    });
    await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
      status: 'processed',
      ai_processed: true,
      ai_processed_at: now,
      ai_notes: aiResult.summary ?? '',
      linked_recommendation_id: existing.id,
      recommendation_ids: [existing.id],
    });
    await logOp(base44, inCooldown ? 'story_radar_recommendation_suppressed' : 'story_radar_recommendation_merged', {
      signal_id: signal.id,
      recommendation_id: existing.id,
      recommendation_fingerprint: fingerprint,
      suppression_reason: inCooldown ? `cooldown_active_until_${existing.cooldown_until}` : undefined,
    });

    // Still attempt clustering even for merged/suppressed signals
    try {
      await base44.asServiceRole.functions.invoke('clusterSignalIntoTrend', { signal_id: signal.id });
    } catch (_) { /* best-effort */ }

    // Count merged/suppressed as not a new recommendation
    stats.signals_ignored++;
    return;
  }

  // Create new recommendation
  const cooldownUntil = new Date(Date.now() + DEFAULT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  let recommendation = null;
  try {
    recommendation = await base44.asServiceRole.entities.StoryRecommendation.create({
      title_suggestion:           aiResult.title_suggestion ?? '',
      slug_suggestion:            (aiResult.title_suggestion ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
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
      recommendation_fingerprint: fingerprint,
      cooldown_until:             cooldownUntil,
      status:                     'suggested',
      generated_at:               now,
      source_signal_ids:          [signal.id],
      related_entity_ids:         signal.source_entity_id ? [signal.source_entity_id] : [],
      related_entity_names:       signal.source_entity_name ? [signal.source_entity_name] : [],
    });
  } catch (err) {
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

  await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
    status: 'processed',
    ai_processed: true,
    ai_processed_at: now,
    ai_notes: aiResult.summary ?? '',
    linked_recommendation_id: recommendation.id,
    recommendation_ids: [recommendation.id],
  });

  await logOp(base44, 'story_radar_recommendation_created', {
    signal_id: signal.id,
    recommendation_id: recommendation.id,
    recommendation_fingerprint: fingerprint,
    source_entity_type: signal.source_entity_type,
    source_entity_id: signal.source_entity_id,
    title_suggestion: aiResult.title_suggestion,
    priority_score: aiResult.priority_score,
  });

  // Attempt trend clustering (non-blocking — failure does not fail signal processing)
  try {
    await base44.asServiceRole.functions.invoke('clusterSignalIntoTrend', { signal_id: signal.id });
  } catch (_) { /* clustering is best-effort */ }

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