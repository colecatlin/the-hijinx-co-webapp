/**
 * detectStoryTrafficSpike
 *
 * Analyzes StoryPerformanceMetrics records for unusual growth patterns.
 * If a story shows a traffic spike (high virality_score or early view surge),
 * creates a ContentSignal for Story Radar to consider follow-up stories.
 *
 * Call:
 *   { metrics_id: "..." }   — check a single record
 *   { scan_recent: true }   — scan all records updated in last 24h (admin scheduled)
 *
 * Deduplication: uses dedupe_key in ContentSignal to prevent duplicate spikes per story.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const VIRALITY_THRESHOLD    = 60; // virality_score above this = spike
const EARLY_VIEWS_THRESHOLD = 500; // views_first_24h above this = spike

async function logOp(base44, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'story_traffic_spike_detected',
      entity_name: 'ContentSignal',
      entity_id: metadata.signal_id ?? '',
      metadata,
    });
  } catch (_) {}
}

async function checkForSpike(base44, m) {
  const isViral  = (m.virality_score ?? 0) >= VIRALITY_THRESHOLD;
  const isEarly  = (m.views_first_24h ?? 0) >= EARLY_VIEWS_THRESHOLD;

  if (!isViral && !isEarly) return { spiked: false };

  const dedupeKey = `traffic_spike:${m.story_id}`;

  // Deduplicate — skip if we already created a signal for this story
  const existing = await base44.asServiceRole.entities.ContentSignal.filter(
    { dedupe_key: dedupeKey }, '-created_date', 1
  );
  if (existing.length > 0) return { spiked: false, deduplicated: true };

  const summary = [
    `"${m.story_title ?? m.story_id}" is experiencing a traffic spike.`,
    isViral  ? `Virality score: ${Math.round(m.virality_score)}.` : '',
    isEarly  ? `${m.views_first_24h?.toLocaleString()} views in first 24h.` : '',
    m.category ? `Category: ${m.category}.` : '',
  ].filter(Boolean).join(' ');

  const signal = await base44.asServiceRole.entities.ContentSignal.create({
    source_entity_type:  'External',
    source_entity_name:  m.story_title ?? 'Published Story',
    signal_type:         'other',
    trigger_action:      'article_traffic_spike',
    importance_level:    isViral ? 'high' : 'medium',
    signal_summary:      summary,
    dedupe_key:          dedupeKey,
    detected_at:         new Date().toISOString(),
    status:              'new',
    raw_data:            JSON.stringify({
      story_id:         m.story_id,
      story_title:      m.story_title,
      virality_score:   m.virality_score,
      views_first_24h:  m.views_first_24h,
      performance_score: m.performance_score,
      category:         m.category,
      story_type:       m.story_type,
    }),
  });

  await logOp(base44, {
    signal_id:    signal.id,
    story_id:     m.story_id,
    metrics_id:   m.id,
    virality_score: m.virality_score,
    views_first_24h: m.views_first_24h,
  });

  return { spiked: true, signal_id: signal.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Scan recent records
    if (body.scan_recent) {
      const all = await base44.asServiceRole.entities.StoryPerformanceMetrics.list('-last_computed_at', 100);
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const recent = all.filter(m => m.last_computed_at && new Date(m.last_computed_at).getTime() >= cutoff);

      let spikeCount = 0;
      const results = [];
      for (const m of recent) {
        const r = await checkForSpike(base44, m);
        if (r.spiked) spikeCount++;
        results.push({ story_id: m.story_id, ...r });
      }
      return Response.json({ success: true, scanned: recent.length, spikes_detected: spikeCount, results });
    }

    // Single record check
    const metricsId = body.metrics_id;
    if (!metricsId) return Response.json({ error: 'metrics_id or scan_recent required' }, { status: 400 });

    const m = await base44.asServiceRole.entities.StoryPerformanceMetrics.get(metricsId);
    if (!m) return Response.json({ error: 'Metrics record not found' }, { status: 404 });

    const result = await checkForSpike(base44, m);
    return Response.json({ success: true, metrics_id: metricsId, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});