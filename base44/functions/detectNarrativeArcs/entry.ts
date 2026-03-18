/**
 * detectNarrativeArcs
 *
 * Analyzes recent ContentSignals, StoryTrendClusters, and StoryRecommendations
 * to detect emerging narrative arcs across the motorsports ecosystem.
 *
 * For each detected arc, creates or updates a NarrativeArc record and optionally
 * auto-generates a NarrativeCoveragePlan.
 *
 * Also:
 * - Flags coverage gaps (high momentum, low story count)
 * - Creates StoryRadarAlert for narrative gaps
 *
 * Call:
 *   {}                         — run full detection pass (admin/scheduled)
 *   { scan_window_days: 14 }   — custom lookback window
 *   { dry_run: true }          — analyze without writing
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ROLES = ['admin'];
const DEFAULT_SCAN_DAYS = 21;
const MOMENTUM_THRESHOLD = 45;
const COVERAGE_GAP_THRESHOLD = 60; // momentum above this with 0 stories = gap

const ARC_TYPES = [
  'championship_battle', 'rivalry', 'momentum_shift', 'win_streak',
  'rookie_breakout', 'sponsor_movement', 'team_growth', 'series_instability',
  'schedule_drama', 'controversy', 'industry_trend', 'cultural_story', 'technology_shift'
];

const COVERAGE_STRATEGY_MAP = {
  championship_battle: 'major_editorial_focus',
  rivalry: 'priority_story',
  win_streak: 'priority_story',
  controversy: 'priority_story',
  momentum_shift: 'developing_story',
  rookie_breakout: 'developing_story',
  sponsor_movement: 'developing_story',
  team_growth: 'developing_story',
  series_instability: 'priority_story',
  schedule_drama: 'developing_story',
  industry_trend: 'light_watch',
  cultural_story: 'light_watch',
  technology_shift: 'light_watch',
};

const STORY_TYPE_SUGGESTIONS = {
  championship_battle: ['explainer', 'data_story', 'analysis', 'event_recap', 'feature'],
  rivalry: ['feature', 'analysis', 'event_recap', 'opinion'],
  win_streak: ['quick_update', 'feature', 'data_story'],
  controversy: ['quick_update', 'analysis', 'opinion'],
  momentum_shift: ['analysis', 'feature', 'event_recap'],
  rookie_breakout: ['feature', 'interview', 'data_story'],
  sponsor_movement: ['quick_update', 'analysis'],
  team_growth: ['feature', 'interview', 'timeline'],
  series_instability: ['analysis', 'explainer', 'quick_update'],
  schedule_drama: ['quick_update', 'analysis'],
  industry_trend: ['analysis', 'explainer', 'feature'],
  cultural_story: ['feature', 'opinion', 'interview'],
  technology_shift: ['explainer', 'analysis', 'feature'],
};

const STORY_COUNT_SUGGESTIONS = {
  major_editorial_focus: 6,
  priority_story: 4,
  developing_story: 3,
  light_watch: 2,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'NarrativeArc',
      entity_id: metadata.arc_id ?? '',
      metadata,
    });
  } catch (_) {}
}

function computeArcMomentum({ signalCount, recCount, clusterCount, avgSignalImportance, storyCount }) {
  // 30% signal volume (caps at 15 signals = 100)
  const sigScore = Math.min((signalCount / 15) * 30, 30);
  // 25% recommendation frequency (caps at 5 recs)
  const recScore = Math.min((recCount / 5) * 25, 25);
  // 20% article performance proxy (stories published, caps at 3)
  const storyScore = Math.min((storyCount / 3) * 20, 20);
  // 15% trend cluster activity (caps at 3 clusters)
  const clusterScore = Math.min((clusterCount / 3) * 15, 15);
  // 10% entity attention (avg importance: critical=10, high=7, medium=4, low=1)
  const impMap = { critical: 10, high: 7, medium: 4, low: 1 };
  const impScore = impMap[avgSignalImportance] ?? 4;

  return Math.round(Math.min(sigScore + recScore + storyScore + clusterScore + impScore, 100));
}

// ─── AI ARC DETECTION ─────────────────────────────────────────────────────────

const ARC_DETECTION_SCHEMA = {
  type: 'object',
  properties: {
    arcs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          arc_name:    { type: 'string' },
          arc_type:    { type: 'string' },
          arc_summary: { type: 'string' },
          entity_names: { type: 'array', items: { type: 'string' } },
          signal_ids:   { type: 'array', items: { type: 'string' } },
          cluster_ids:  { type: 'array', items: { type: 'string' } },
          importance_score: { type: 'number' },
          dedupe_key:  { type: 'string' },
          reasoning:   { type: 'string' },
        },
        required: ['arc_name', 'arc_type', 'arc_summary', 'dedupe_key'],
      }
    }
  },
  required: ['arcs'],
};

async function runArcDetectionAI(base44, signals, clusters) {
  const sigLines = signals.slice(0, 40).map(s =>
    `  [${s.id}] ${s.signal_type} | ${s.source_entity_name ?? '?'} | ${s.importance_level} | ${s.signal_summary?.slice(0, 100) ?? ''}`
  ).join('\n');

  const clusterLines = clusters.slice(0, 20).map(c =>
    `  [${c.id}] ${c.trend_type} | ${c.trend_name} | momentum:${c.momentum_score ?? 0} | entities:${(c.related_entity_names ?? []).join(', ')}`
  ).join('\n');

  const prompt = [
    `You are a motorsports narrative analyst for The Outlet, a specialist motorsports media publication.`,
    ``,
    `Analyze these recent content signals and trend clusters for emerging narrative arcs — storylines that span multiple events and deserve ongoing editorial coverage.`,
    ``,
    `RECENT SIGNALS (last ${DEFAULT_SCAN_DAYS} days):`,
    sigLines || '  (none)',
    ``,
    `ACTIVE TREND CLUSTERS:`,
    clusterLines || '  (none)',
    ``,
    `Detect up to 5 genuine narrative arcs. For each arc:`,
    `- arc_type must be one of: ${ARC_TYPES.join(', ')}`,
    `- arc_name: short evocative name (e.g. "Smith vs Jones Championship Battle", "Rodriguez Rookie Surge")`,
    `- arc_summary: 2-3 sentence editorial narrative summary`,
    `- entity_names: drivers/teams/series most central to this arc`,
    `- signal_ids: IDs from the list above that contributed`,
    `- cluster_ids: trend cluster IDs associated`,
    `- importance_score: 0-100 editorial importance`,
    `- dedupe_key: stable key like "arc:championship_battle:smith:jones" (lowercase, no spaces)`,
    ``,
    `Only detect arcs with genuine narrative depth — not single events. Prefer fewer high-quality arcs over many weak ones.`,
    `If no genuine arcs are detected, return an empty arcs array.`,
    ``,
    `Return structured JSON.`,
  ].join('\n');

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: ARC_DETECTION_SCHEMA,
  });
}

// ─── COVERAGE PLAN GENERATION ────────────────────────────────────────────────

async function generateCoveragePlan(base44, arc) {
  const strategy = COVERAGE_STRATEGY_MAP[arc.arc_type] ?? 'developing_story';
  const storyTypes = STORY_TYPE_SUGGESTIONS[arc.arc_type] ?? ['analysis', 'feature'];
  const storyCount = STORY_COUNT_SUGGESTIONS[strategy] ?? 3;

  const plan = await base44.asServiceRole.entities.NarrativeCoveragePlan.create({
    arc_id:                  arc.id,
    arc_name:                arc.arc_name,
    coverage_strategy:       strategy,
    recommended_story_count: storyCount,
    recommended_story_types: storyTypes,
    coverage_timeline:       buildTimelineSuggestion(arc.arc_type),
    coverage_status:         'planned',
    ai_generated:            true,
    stories_published:       0,
  });

  return plan;
}

function buildTimelineSuggestion(arcType) {
  const timelines = {
    championship_battle: 'Points gap explainer → Mid-season analysis → Race-by-race recaps → Championship decider preview → Season wrap',
    rivalry: 'Introduction feature → Head-to-head data story → On-track incident analysis → Season rivalry retrospective',
    win_streak: 'First win recap → Streak feature → Data comparison piece → End of streak or continuation analysis',
    rookie_breakout: 'Introducing the rookie → First podium feature → Season progress analysis → Breakout season wrap',
    controversy: 'Breaking update → Rule analysis explainer → Opinion piece → Resolution wrap-up',
    momentum_shift: 'Performance change analysis → Driver/team profile update → Data story → Event preview framing',
    sponsor_movement: 'Announcement quick update → Business analysis → Impact on team/series feature',
    team_growth: 'Team profile feature → Milestone quick update → Season strategy analysis',
    series_instability: 'Status explainer → Impact on drivers analysis → Resolution coverage',
    schedule_drama: 'Change announcement → Impact analysis → Rescheduled event preview',
    industry_trend: 'Trend explainer → Data story → Expert opinion feature',
    cultural_story: 'Feature story → Community angle → Broader context piece',
    technology_shift: 'Explainer → Impact analysis → Adoption story',
  };
  return timelines[arcType] ?? 'Developing story → Analysis → Feature wrap';
}

// ─── ALERT FOR COVERAGE GAPS ─────────────────────────────────────────────────

async function createGapAlert(base44, arc) {
  const dedupeKey = `narrative_gap:${arc.id}`;
  const existing = await base44.asServiceRole.entities.StoryRadarAlert.filter(
    { dedupe_key: dedupeKey }, '-created_date', 1
  );
  if (existing.length > 0) return null;

  return await base44.asServiceRole.entities.StoryRadarAlert.create({
    alert_type:          'narrative_gap',
    title:               `Coverage Gap: "${arc.arc_name}"`,
    message:             `Narrative arc "${arc.arc_name}" has high momentum (${Math.round(arc.momentum_score ?? 0)}) but no published stories. Consider activating coverage plan.`,
    related_cluster_id:  arc.trend_cluster_ids?.[0] ?? null,
    severity:            arc.momentum_score >= 75 ? 'urgent' : 'warning',
    status:              'unread',
    triggered_at:        new Date().toISOString(),
    dedupe_key:          dedupeKey,
  });
}

// ─── MAIN DETECTION PASS ─────────────────────────────────────────────────────

async function runDetectionPass(base44, scanDays, dryRun) {
  const cutoff = new Date(Date.now() - scanDays * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [signals, clusters] = await Promise.all([
    base44.asServiceRole.entities.ContentSignal.list('-detected_at', 100),
    base44.asServiceRole.entities.StoryTrendCluster.list('-momentum_score', 30),
  ]);

  const recentSignals = signals.filter(s =>
    (s.detected_at ?? s.created_date ?? '') >= cutoff &&
    !['ignored', 'dismissed'].includes(s.status)
  );

  const activeClusters = clusters.filter(c =>
    ['active', 'forming', 'peaking'].includes(c.status) &&
    (c.last_activity_date ?? c.start_date ?? '') >= cutoff
  );

  if (recentSignals.length === 0 && activeClusters.length === 0) {
    return { success: true, arcs_detected: 0, message: 'No recent signals or clusters to analyze.' };
  }

  // Run AI detection
  let aiResult;
  try {
    aiResult = await runArcDetectionAI(base44, recentSignals, activeClusters);
  } catch (err) {
    return { success: false, error: `AI arc detection failed: ${err.message}` };
  }

  const detectedArcs = aiResult?.arcs ?? [];
  if (detectedArcs.length === 0) {
    return { success: true, arcs_detected: 0, message: 'No narrative arcs detected in current signals.' };
  }

  if (dryRun) {
    return { success: true, dry_run: true, arcs_detected: detectedArcs.length, arcs: detectedArcs };
  }

  // Load existing arcs for dedup check
  const existingArcs = await base44.asServiceRole.entities.NarrativeArc.list('-created_date', 100);
  const existingByDedupeKey = Object.fromEntries(existingArcs.map(a => [a.dedupe_key, a]));

  const stats = { created: 0, updated: 0, plans_created: 0, gaps_flagged: 0 };

  for (const detected of detectedArcs) {
    const arcType = ARC_TYPES.includes(detected.arc_type) ? detected.arc_type : 'industry_trend';
    const signalCount = (detected.signal_ids ?? []).length;
    const clusterCount = (detected.cluster_ids ?? []).length;

    // Find dominant signal importance
    const relatedSigs = recentSignals.filter(s => (detected.signal_ids ?? []).includes(s.id));
    const impPriority = { critical: 4, high: 3, medium: 2, low: 1 };
    const topImportance = relatedSigs.length
      ? relatedSigs.sort((a, b) => (impPriority[b.importance_level] ?? 0) - (impPriority[a.importance_level] ?? 0))[0].importance_level
      : 'medium';

    const momentum = computeArcMomentum({
      signalCount,
      recCount: 0,
      clusterCount,
      avgSignalImportance: topImportance,
      storyCount: 0,
    });

    const arcPayload = {
      arc_name:         detected.arc_name,
      arc_type:         arcType,
      arc_summary:      detected.arc_summary,
      entity_names:     detected.entity_names ?? [],
      signal_ids:       detected.signal_ids ?? [],
      trend_cluster_ids: detected.cluster_ids ?? [],
      momentum_score:   momentum,
      importance_score: detected.importance_score ?? 50,
      last_update_date: now,
      dedupe_key:       detected.dedupe_key,
    };

    let arc;
    const existingArc = existingByDedupeKey[detected.dedupe_key];

    if (existingArc && !['closed', 'ignored'].includes(existingArc.status)) {
      // Update existing arc
      const updatedSignalIds = [...new Set([...(existingArc.signal_ids ?? []), ...(detected.signal_ids ?? [])])];
      const updatedClusterIds = [...new Set([...(existingArc.trend_cluster_ids ?? []), ...(detected.cluster_ids ?? [])])];
      const newMomentum = Math.max(existingArc.momentum_score ?? 0, momentum);
      const newStatus = newMomentum >= 70 ? 'active' : 'emerging';

      await base44.asServiceRole.entities.NarrativeArc.update(existingArc.id, {
        ...arcPayload,
        signal_ids:        updatedSignalIds,
        trend_cluster_ids: updatedClusterIds,
        momentum_score:    newMomentum,
        status:            existingArc.status === 'ignored' ? existingArc.status : newStatus,
        entity_names:      [...new Set([...(existingArc.entity_names ?? []), ...(detected.entity_names ?? [])])],
      });
      arc = { ...existingArc, ...arcPayload, momentum_score: newMomentum };
      stats.updated++;
    } else if (!existingArc) {
      // Create new arc
      arc = await base44.asServiceRole.entities.NarrativeArc.create({
        ...arcPayload,
        status:     momentum >= 70 ? 'active' : 'emerging',
        start_date: now,
      });
      stats.created++;

      // Auto-generate coverage plan for new arcs
      try {
        const plan = await generateCoveragePlan(base44, arc);
        await base44.asServiceRole.entities.NarrativeArc.update(arc.id, { coverage_plan_id: plan.id });
        stats.plans_created++;
      } catch (_) { /* non-fatal */ }

      await logOp(base44, 'narrative_arc_created', {
        arc_id:   arc.id,
        arc_type: arcType,
        momentum_score: momentum,
        arc_name: detected.arc_name,
      });
    } else {
      continue; // existing closed/ignored arc — skip
    }

    // Coverage gap detection
    const storyCount = (arc.story_ids ?? []).length;
    if ((arc.momentum_score ?? momentum) >= COVERAGE_GAP_THRESHOLD && storyCount === 0) {
      const arcForGap = existingArc
        ? { ...existingArc, momentum_score: Math.max(existingArc.momentum_score ?? 0, momentum) }
        : arc;
      await base44.asServiceRole.entities.NarrativeArc.update(arcForGap.id, { coverage_gap_flagged: true });
      try { await createGapAlert(base44, arcForGap); } catch (_) {}
      stats.gaps_flagged++;
    }
  }

  await logOp(base44, 'narrative_arc_detection_run', {
    scan_days:      scanDays,
    signals_analyzed: recentSignals.length,
    clusters_analyzed: activeClusters.length,
    arcs_detected:  detectedArcs.length,
    arcs_created:   stats.created,
    arcs_updated:   stats.updated,
    plans_created:  stats.plans_created,
    gaps_flagged:   stats.gaps_flagged,
  });

  return { success: true, ...stats, arcs_detected: detectedArcs.length };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow scheduled/system calls (no user) or admin
    if (user !== null && !ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const scanDays = Number(body.scan_window_days) || DEFAULT_SCAN_DAYS;
    const dryRun = body.dry_run === true;

    const result = await runDetectionPass(base44, scanDays, dryRun);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});