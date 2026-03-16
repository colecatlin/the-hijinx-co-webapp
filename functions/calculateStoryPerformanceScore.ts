/**
 * calculateStoryPerformanceScore
 *
 * Calculates composite performance, virality, and longevity scores for a
 * StoryPerformanceMetrics record based on its current metric values.
 *
 * Scoring model:
 *   performance_score = 40% views + 25% engagement + 20% social + 15% longevity
 *   virality_score    = early traffic spike + share velocity
 *   longevity_score   = sustained traffic relative to age
 *
 * Call:
 *   - { metrics_id: "..." }  — update a single record
 *   - { recalculate_all: true } — batch update all records (admin only, rate-limited)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryPerformanceMetrics',
      entity_id: metadata.metrics_id ?? '',
      metadata,
    });
  } catch (_) {}
}

// ── Score normalizers ────────────────────────────────────────────────────────

function viewsScore(m) {
  // Normalize: 10k views = 100, scale below
  const total = m.views_total ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, (total / 10000) * 100);
}

function engagementScore(m) {
  // Use provided engagement_score if available, else derive from time + scroll
  if (m.engagement_score != null && m.engagement_score > 0) return m.engagement_score;
  const timeScore = Math.min(100, ((m.time_on_page_average ?? 0) / 300) * 100); // 5 min = 100
  const scrollScore = m.scroll_depth_average ?? 0;
  return (timeScore * 0.5 + scrollScore * 0.5);
}

function socialScore(m) {
  const shares = m.social_shares ?? 0;
  const clicks = m.social_clickthroughs ?? 0;
  const shareScore = Math.min(100, (shares / 500) * 100); // 500 shares = 100
  const clickScore = Math.min(100, (clicks / 2000) * 100); // 2k clicks = 100
  return (shareScore * 0.6 + clickScore * 0.4);
}

function computeViralityScore(m) {
  // Virality = early views (24h) as % of total + share velocity
  const total = m.views_total ?? 0;
  const early = m.views_first_24h ?? 0;
  const shares = m.social_shares ?? 0;
  if (total <= 0) return 0;
  const earlyRatio = Math.min(1, early / Math.max(1, total));
  const shareVelocity = Math.min(1, shares / 200); // 200 shares = max
  return Math.round((earlyRatio * 0.6 + shareVelocity * 0.4) * 100);
}

function computeLongevityScore(m, publishedDate) {
  // Longevity = if story keeps getting views relative to age
  const total = m.views_total ?? 0;
  const first7 = m.views_first_7_days ?? 0;
  if (total <= 0) return 0;

  // Days since publish
  let ageDays = 30;
  if (publishedDate) {
    const age = (Date.now() - new Date(publishedDate).getTime()) / (1000 * 60 * 60 * 24);
    ageDays = Math.max(1, age);
  }

  // If older than 7 days, how much traffic came after first 7 days
  if (ageDays < 7) return 50; // too early to tell
  const laterViews = total - first7;
  const laterRatio = laterViews / total;
  return Math.round(Math.min(100, laterRatio * 100));
}

function calculateScores(m) {
  const vScore = viewsScore(m);
  const eScore = engagementScore(m);
  const sScore = socialScore(m);
  const lScore = computeLongevityScore(m, m.published_date);
  const vViralScore = computeViralityScore(m);

  const performanceScore = Math.round(
    vScore * 0.40 +
    eScore * 0.25 +
    sScore * 0.20 +
    lScore * 0.15
  );

  return {
    performance_score: Math.min(100, performanceScore),
    virality_score:    Math.min(100, vViralScore),
    longevity_score:   Math.min(100, lScore),
    last_computed_at:  new Date().toISOString(),
  };
}

// ── Single record update ─────────────────────────────────────────────────────

async function updateSingleRecord(base44, metricsId) {
  const m = await base44.asServiceRole.entities.StoryPerformanceMetrics.get(metricsId);
  if (!m) return { success: false, error: `Metrics record ${metricsId} not found` };

  const scores = calculateScores(m);
  await base44.asServiceRole.entities.StoryPerformanceMetrics.update(metricsId, scores);
  return { success: true, metrics_id: metricsId, scores };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Batch recalculate
    if (body.recalculate_all) {
      const all = await base44.asServiceRole.entities.StoryPerformanceMetrics.list('-published_date', 500);
      let updated = 0;
      for (const m of all) {
        const scores = calculateScores(m);
        await base44.asServiceRole.entities.StoryPerformanceMetrics.update(m.id, scores);
        updated++;
      }
      await logOp(base44, 'story_performance_batch_recalculated', {
        acted_by_user_id: user.email,
        count: updated,
      });
      return Response.json({ success: true, updated });
    }

    // Single record
    const metricsId = body.metrics_id;
    if (!metricsId) return Response.json({ error: 'metrics_id is required' }, { status: 400 });

    const result = await updateSingleRecord(base44, metricsId);
    await logOp(base44, 'story_performance_score_calculated', {
      metrics_id: metricsId,
      acted_by_user_id: user.email,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});