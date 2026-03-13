import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ACTIVE_CLUSTER_STATUSES = ['forming', 'active', 'peaking'];
const CLUSTER_WINDOW_DAYS = 30; // only consider clusters active within last 30 days
const MIN_SIGNALS_TO_CREATE_CLUSTER = 1; // allow creation from first signal if AI confidence high
const CLUSTER_CREATE_CONFIDENCE_THRESHOLD = 70; // AI confidence to auto-create

const SUPPORTED_TREND_TYPES = [
  'entity_surge', 'topic_wave', 'rivalry', 'milestone_run', 'controversy',
  'sponsorship_wave', 'series_growth', 'other'
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryTrendCluster',
      entity_id: metadata.cluster_id ?? metadata.signal_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

// ─── MOMENTUM SCORE ───────────────────────────────────────────────────────────

/**
 * V1 momentum score: lightweight, explainable.
 * Inputs: signal_count, recent signal importance, recommendation_count, time_proximity_days
 */
function computeMomentumScore(cluster, newSignal) {
  const signalCount = (cluster.signal_count ?? 0) + 1;
  const recCount = cluster.story_count ?? 0;

  // Base: signal volume (up to 40pts, caps at 10 signals)
  const signalVolume = Math.min(signalCount / 10, 1) * 40;

  // Importance of new signal (up to 30pts)
  const importanceMap = { critical: 30, high: 22, medium: 14, low: 6 };
  const importancePts = importanceMap[newSignal.importance_level ?? 'medium'] ?? 14;

  // Recency: how recent is the cluster's last activity (up to 20pts)
  let recencyPts = 20;
  if (cluster.last_activity_date) {
    const daysSince = (Date.now() - new Date(cluster.last_activity_date).getTime()) / (1000 * 60 * 60 * 24);
    recencyPts = Math.max(0, 20 - daysSince * 2); // decay 2pts/day
  }

  // Recommendations/stories linked (up to 10pts)
  const recPts = Math.min(recCount * 2, 10);

  return Math.round(Math.min(signalVolume + importancePts + recencyPts + recPts, 100));
}

// ─── AI CLUSTER MATCHING ──────────────────────────────────────────────────────

const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    best_cluster_id: { type: 'string', description: 'ID of the best matching cluster, or empty string if none match' },
    match_confidence: { type: 'number', description: '0-100 confidence that signal belongs to best_cluster_id' },
    should_create_new: { type: 'boolean', description: 'True if signal warrants a new cluster' },
    new_trend_name: { type: 'string', description: 'Name for a new cluster if should_create_new is true' },
    new_trend_type: { type: 'string', description: 'Trend type for new cluster (entity_surge, topic_wave, rivalry, milestone_run, controversy, sponsorship_wave, series_growth, other)' },
    new_trend_summary: { type: 'string', description: 'Brief summary of the emerging trend' },
    reasoning: { type: 'string', description: 'Brief explanation of the matching or creation decision' },
  },
  required: ['match_confidence', 'should_create_new'],
};

async function runClusterMatchAI(base44, signal, activeClusters) {
  const clusterList = activeClusters.map(c => [
    `  ID: ${c.id}`,
    `  Name: ${c.trend_name}`,
    `  Type: ${c.trend_type}`,
    `  Summary: ${c.trend_summary ?? ''}`,
    `  Entities: ${(c.related_entity_names ?? []).join(', ')}`,
    `  Signal Count: ${c.signal_count ?? 0}`,
    `  Last Activity: ${c.last_activity_date ?? 'unknown'}`,
    `  Tags: ${(c.tags ?? []).join(', ')}`,
    `  ---`,
  ].join('\n')).join('\n');

  const prompt = [
    `You are an editorial trend analyst for The Outlet, a motorsports media publication.`,
    ``,
    `A new content signal has been detected. Determine whether it belongs to an existing active trend cluster, or whether it starts a new one.`,
    ``,
    `NEW SIGNAL:`,
    `  Type: ${signal.signal_type ?? 'unknown'}`,
    `  Action: ${signal.trigger_action ?? 'unknown'}`,
    `  Summary: ${signal.signal_summary ?? '(none)'}`,
    `  Entity Type: ${signal.source_entity_type ?? 'unknown'}`,
    `  Entity Name: ${signal.source_entity_name ?? 'unknown'}`,
    `  Importance: ${signal.importance_level ?? 'medium'}`,
    ...(signal.related_entity_names?.length ? [`  Related: ${signal.related_entity_names.join(', ')}`] : []),
    ``,
    activeClusters.length
      ? `ACTIVE TREND CLUSTERS (last ${CLUSTER_WINDOW_DAYS} days):\n${clusterList}`
      : `ACTIVE TREND CLUSTERS: none currently active.`,
    ``,
    `Instructions:`,
    `- If the signal clearly belongs to one of the active clusters above, set best_cluster_id to that cluster's ID and match_confidence >= 65`,
    `- If no cluster matches well (match_confidence < 65), set best_cluster_id to empty string`,
    `- If the signal represents a new emerging trend worth tracking, set should_create_new = true with name, type, and summary`,
    `- Do NOT force unrelated signals into clusters — only cluster if there is a real thematic connection`,
    `- Only suggest new cluster creation if the signal has medium or higher importance and represents something ongoing, not a one-off`,
    `- Valid trend types: entity_surge, topic_wave, rivalry, milestone_run, controversy, sponsorship_wave, series_growth, other`,
    ``,
    `Return structured JSON.`,
  ].join('\n');

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: MATCH_SCHEMA,
  });
}

// ─── CLUSTER UPDATE ───────────────────────────────────────────────────────────

async function attachSignalToCluster(base44, cluster, signal) {
  const now = new Date().toISOString();
  const updatedSignalIds = [...new Set([...(cluster.signal_ids ?? []), signal.id])];
  const updatedEntityIds = [...new Set([...(cluster.related_entity_ids ?? []), ...(signal.source_entity_id ? [signal.source_entity_id] : [])])];
  const updatedEntityNames = [...new Set([...(cluster.related_entity_names ?? []), ...(signal.source_entity_name ? [signal.source_entity_name] : [])])];
  const newMomentum = computeMomentumScore(cluster, signal);
  const newSignalCount = (cluster.signal_count ?? 0) + 1;

  // Promote cluster status based on signal count
  let status = cluster.status;
  if (status === 'forming' && newSignalCount >= 3) status = 'active';
  if (status === 'active' && newSignalCount >= 8) status = 'peaking';

  await base44.asServiceRole.entities.StoryTrendCluster.update(cluster.id, {
    signal_ids: updatedSignalIds,
    signal_count: newSignalCount,
    related_entity_ids: updatedEntityIds,
    related_entity_names: updatedEntityNames,
    last_activity_date: now,
    momentum_score: newMomentum,
    status,
  });

  // Link cluster back to signal
  await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
    trend_cluster_id: cluster.id,
  });

  await logOp(base44, 'story_radar_signal_clustered', {
    signal_id: signal.id,
    cluster_id: cluster.id,
    trend_type: cluster.trend_type,
    momentum_score: newMomentum,
  });

  return { action: 'attached', cluster_id: cluster.id, momentum_score: newMomentum };
}

// ─── CLUSTER CREATION ─────────────────────────────────────────────────────────

async function createNewCluster(base44, signal, aiResult) {
  const now = new Date().toISOString();
  const trendType = SUPPORTED_TREND_TYPES.includes(aiResult.new_trend_type) ? aiResult.new_trend_type : 'other';
  const initialMomentum = computeMomentumScore({ signal_count: 0, story_count: 0 }, signal);

  const cluster = await base44.asServiceRole.entities.StoryTrendCluster.create({
    trend_name: aiResult.new_trend_name ?? `${signal.source_entity_name ?? 'Unknown'} Trend`,
    trend_type: trendType,
    trend_summary: aiResult.new_trend_summary ?? signal.signal_summary ?? '',
    status: 'forming',
    momentum_score: initialMomentum,
    signal_count: 1,
    story_count: 0,
    signal_ids: [signal.id],
    related_entity_ids: signal.source_entity_id ? [signal.source_entity_id] : [],
    related_entity_names: signal.source_entity_name ? [signal.source_entity_name] : [],
    tags: signal.related_entity_names ?? [],
    start_date: now,
    first_signal_at: signal.detected_at ?? now,
    last_activity_date: now,
  });

  // Link cluster back to signal
  await base44.asServiceRole.entities.ContentSignal.update(signal.id, {
    trend_cluster_id: cluster.id,
  });

  await logOp(base44, 'story_radar_cluster_created', {
    signal_id: signal.id,
    cluster_id: cluster.id,
    trend_type: trendType,
    momentum_score: initialMomentum,
    trend_name: aiResult.new_trend_name,
  });

  return { action: 'created', cluster_id: cluster.id, momentum_score: initialMomentum };
}

// ─── MAIN CLUSTERING LOGIC ────────────────────────────────────────────────────

async function clusterSignal(base44, signalId) {
  const signal = await base44.asServiceRole.entities.ContentSignal.get(signalId);
  if (!signal) return { success: false, error: `Signal ${signalId} not found` };

  // Skip already clustered signals
  if (signal.trend_cluster_id) {
    return { success: true, action: 'already_clustered', cluster_id: signal.trend_cluster_id };
  }

  // Fetch active clusters within the time window
  const cutoff = new Date(Date.now() - CLUSTER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const allClusters = await base44.asServiceRole.entities.StoryTrendCluster.list('-last_activity_date', 30);
  const activeClusters = allClusters.filter(c =>
    ACTIVE_CLUSTER_STATUSES.includes(c.status) &&
    (c.last_activity_date ?? c.start_date ?? '') >= cutoff
  );

  // Run AI matching
  let aiResult;
  try {
    aiResult = await runClusterMatchAI(base44, signal, activeClusters);
  } catch (err) {
    return { success: false, error: `AI cluster match failed: ${err.message}` };
  }

  // Try to attach to existing cluster
  if (aiResult.best_cluster_id && aiResult.match_confidence >= 65) {
    const targetCluster = activeClusters.find(c => c.id === aiResult.best_cluster_id);
    if (targetCluster) {
      const result = await attachSignalToCluster(base44, targetCluster, signal);
      await logOp(base44, 'story_radar_cluster_updated', {
        signal_id: signal.id,
        cluster_id: targetCluster.id,
        trend_type: targetCluster.trend_type,
        momentum_score: result.momentum_score,
        match_confidence: aiResult.match_confidence,
      });
      return { success: true, ...result };
    }
  }

  // Create new cluster if AI recommends it and confidence is high enough
  if (aiResult.should_create_new && aiResult.match_confidence >= CLUSTER_CREATE_CONFIDENCE_THRESHOLD && aiResult.new_trend_name) {
    const result = await createNewCluster(base44, signal, aiResult);
    return { success: true, ...result };
  }

  // No cluster match and no creation — leave unclustered
  return { success: true, action: 'unclustered', reasoning: aiResult.reasoning ?? 'No strong cluster match found.' };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { signal_id } = body;

    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    const result = await clusterSignal(base44, signal_id);
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});