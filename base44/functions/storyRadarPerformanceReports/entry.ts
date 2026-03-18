/**
 * storyRadarPerformanceReports
 *
 * Generates editorial analytics reports from StoryPerformanceMetrics data.
 *
 * Report types (pass as { report: "..." }):
 *
 *   top_stories_30d         — top performing stories in last 30 days
 *   top_story_types         — avg performance by story_type
 *   top_categories          — avg performance by category
 *   entity_performance      — avg performance by related_entity_names
 *   radar_impact            — Story Radar adoption/publish rates
 *   format_performance      — performance by story format (from linked recommendations)
 *   story_type_breakdown    — full breakdown by type with avg scores
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ROLES = ['admin', 'editor'];

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function avg(arr, field) {
  const valid = arr.map(x => x[field]).filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function sum(arr, field) {
  return arr.reduce((acc, x) => acc + (x[field] ?? 0), 0);
}

async function getRecentMetrics(base44, days) {
  const all = await base44.asServiceRole.entities.StoryPerformanceMetrics.list('-published_date', 500);
  if (!days) return all;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return all.filter(m => m.published_date && new Date(m.published_date).getTime() >= cutoff);
}

// ─── Report generators ───────────────────────────────────────────────────────

function topStories30d(metrics) {
  return metrics
    .filter(m => m.performance_score != null)
    .sort((a, b) => (b.performance_score ?? 0) - (a.performance_score ?? 0))
    .slice(0, 20)
    .map(m => ({
      story_id:          m.story_id,
      story_title:       m.story_title,
      performance_score: m.performance_score,
      virality_score:    m.virality_score,
      longevity_score:   m.longevity_score,
      views_total:       m.views_total ?? 0,
      engagement_score:  m.engagement_score ?? 0,
      published_date:    m.published_date,
      story_type:        m.story_type,
      category:          m.category,
      radar_originated:  m.radar_originated ?? false,
      editor_rating:     m.editor_rating,
    }));
}

function topStoryTypes(metrics) {
  const groups = groupBy(metrics.filter(m => m.story_type), m => m.story_type);
  return Object.entries(groups)
    .map(([story_type, items]) => ({
      story_type,
      count:             items.length,
      avg_performance:   avg(items, 'performance_score'),
      avg_engagement:    avg(items, 'engagement_score'),
      avg_virality:      avg(items, 'virality_score'),
      avg_longevity:     avg(items, 'longevity_score'),
      total_views:       sum(items, 'views_total'),
    }))
    .filter(r => r.avg_performance != null)
    .sort((a, b) => (b.avg_performance ?? 0) - (a.avg_performance ?? 0));
}

function topCategories(metrics) {
  const groups = groupBy(metrics.filter(m => m.category), m => m.category);
  return Object.entries(groups)
    .map(([category, items]) => ({
      category,
      count:           items.length,
      avg_performance: avg(items, 'performance_score'),
      avg_engagement:  avg(items, 'engagement_score'),
      total_views:     sum(items, 'views_total'),
    }))
    .filter(r => r.avg_performance != null)
    .sort((a, b) => (b.avg_performance ?? 0) - (a.avg_performance ?? 0));
}

function entityPerformance(metrics) {
  const entityMap = {};
  for (const m of metrics) {
    for (const name of (m.related_entity_names ?? [])) {
      if (!entityMap[name]) entityMap[name] = [];
      entityMap[name].push(m);
    }
  }
  return Object.entries(entityMap)
    .map(([entity_name, items]) => ({
      entity_name,
      story_count:     items.length,
      avg_performance: avg(items, 'performance_score'),
      avg_engagement:  avg(items, 'engagement_score'),
      total_views:     sum(items, 'views_total'),
    }))
    .filter(r => r.avg_performance != null && r.story_count >= 2)
    .sort((a, b) => (b.avg_performance ?? 0) - (a.avg_performance ?? 0))
    .slice(0, 30);
}

async function radarImpact(base44, allMetrics) {
  // Story Radar contribution metrics
  const total = allMetrics.length;
  const radarOriginated = allMetrics.filter(m => m.radar_originated);
  const radarCount = radarOriginated.length;

  // Count by status from StoryRecommendation
  const [generated, approved, drafted, published] = await Promise.all([
    base44.asServiceRole.entities.StoryRecommendation.list('-created_date', 1000),
    base44.asServiceRole.entities.StoryRecommendation.filter({ status: 'approved' }),
    base44.asServiceRole.entities.StoryRecommendation.filter({ status: 'drafted' }),
    base44.asServiceRole.entities.StoryRecommendation.filter({ status: 'published' }),
  ]);

  const genCount = generated.length;
  const approvedCount = approved.length;
  const draftedCount = drafted.length;
  const publishedCount = published.length;

  const adoptionRate  = genCount > 0 ? Math.round((approvedCount / genCount) * 100) : 0;
  const publishRate   = approvedCount > 0 ? Math.round((publishedCount / approvedCount) * 100) : 0;
  const draftRate     = approvedCount > 0 ? Math.round((draftedCount / approvedCount) * 100) : 0;

  const radarPerf      = radarOriginated.length > 0 ? avg(radarOriginated, 'performance_score') : null;
  const manualMetrics  = allMetrics.filter(m => !m.radar_originated);
  const manualPerf     = manualMetrics.length > 0 ? avg(manualMetrics, 'performance_score') : null;

  return {
    recommendations_generated: genCount,
    recommendations_approved:  approvedCount,
    recommendations_drafted:   draftedCount,
    recommendations_published: publishedCount,
    adoption_rate_pct:         adoptionRate,
    draft_conversion_rate_pct: draftRate,
    publish_rate_pct:          publishRate,
    radar_stories_published:   radarCount,
    total_stories_tracked:     total,
    radar_share_pct:           total > 0 ? Math.round((radarCount / total) * 100) : 0,
    avg_radar_performance:     radarPerf,
    avg_manual_performance:    manualPerf,
    radar_vs_manual_delta:     (radarPerf != null && manualPerf != null) ? (radarPerf - manualPerf) : null,
  };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const reportType = body.report ?? 'top_stories_30d';
    const days = body.days ?? 30;

    const metrics = await getRecentMetrics(base44, reportType === 'entity_performance' || reportType === 'top_story_types' || reportType === 'top_categories' || reportType === 'story_type_breakdown' ? null : days);

    let result;
    switch (reportType) {
      case 'top_stories_30d':
        result = topStories30d(metrics);
        break;
      case 'top_story_types':
      case 'story_type_breakdown':
        result = topStoryTypes(metrics);
        break;
      case 'top_categories':
        result = topCategories(metrics);
        break;
      case 'entity_performance':
        result = entityPerformance(metrics);
        break;
      case 'radar_impact':
        result = await radarImpact(base44, metrics);
        break;
      default:
        return Response.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
    }

    return Response.json({ success: true, report: reportType, data: result, generated_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});