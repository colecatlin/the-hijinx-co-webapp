/**
 * auditSponsorAnalytics
 * Phase 17F — Read-only audit of the Sponsor Analytics platform.
 * Validates classification correctness, evidence integrity, visibility
 * enforcement, financial leak detection, and metric computation quality.
 * Returns IDs only — no repairs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  isSponsorPublic,
  loadSponsorAnalyticsContext,
  buildCommercialMetrics,
  buildFinancialMetrics,
  buildActivationMetrics,
  buildDeliverableMetrics,
  buildMediaMetrics,
  buildAdvertisementMetrics,
  buildExposureMetrics,
  buildCommerceMetrics,
  buildPerformanceMetrics,
  buildTrendMetrics,
  calculateROIReadiness,
  buildEvidenceMatrix,
  buildAnalyticsCompletenessSummary,
  buildPublicSafeAnalytics,
  type Metric,
} from '../../shared/sponsorAnalyticsHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Load all Sponsor organizations
    const allOrgs = await base44.asServiceRole.entities.Organization.filter({
      type: 'Sponsor',
    }).catch(() => []);

    const issues = {
      broken_calculations: [] as any[],
      classification_errors: [] as any[],
      evidence_mismatches: [] as any[],
      visibility_leaks: [] as any[],
      financial_leaks: [] as any[],
      missing_evidence: [] as any[],
      invalid_trends: [] as any[],
      duplicate_metrics: [] as any[],
      missing_summaries: [] as any[],
      readiness_miscalculation: [] as any[],
    };

    const stats = {
      total_sponsors: 0,
      sponsors_with_analytics: 0,
      total_metrics_computed: 0,
      measured_metrics: 0,
      derived_metrics: 0,
      estimated_metrics: 0,
      unavailable_metrics: 0,
      financial_leaks_detected: 0,
      visibility_leaks_detected: 0,
    };

    for (const org of (allOrgs as any[])) {
      stats.total_sponsors++;
      if (!isSponsorPublic(org)) continue;

      try {
        const ctx = await loadSponsorAnalyticsContext(base44, org);
        stats.sponsors_with_analytics++;

        // Build all metrics
        const commercialMetrics = buildCommercialMetrics(ctx);
        const financialMetrics = buildFinancialMetrics(ctx);
        const activationMetrics = buildActivationMetrics(ctx);
        const deliverableMetrics = buildDeliverableMetrics(ctx);
        const mediaMetrics = buildMediaMetrics(ctx);
        const advertisementMetrics = buildAdvertisementMetrics(ctx);
        const exposureMetrics = buildExposureMetrics(ctx);
        const commerceMetrics = buildCommerceMetrics(ctx);
        const performanceMetrics = buildPerformanceMetrics(ctx);
        const trendMetrics = buildTrendMetrics(ctx);
        const readiness = calculateROIReadiness(ctx);

        const allMetrics = {
          ...commercialMetrics,
          ...financialMetrics,
          ...activationMetrics,
          ...deliverableMetrics,
          ...mediaMetrics,
          ...advertisementMetrics,
          ...exposureMetrics,
          ...commerceMetrics,
          ...performanceMetrics,
          ...trendMetrics,
        };

        // Check each metric for classification errors and evidence
        for (const [name, metric] of Object.entries(allMetrics)) {
          if (!metric || typeof metric !== 'object' || !('classification' in (metric as any))) continue;
          const m = metric as Metric;
          stats.total_metrics_computed++;

          switch (m.classification) {
            case 'Measured': stats.measured_metrics++; break;
            case 'Derived': stats.derived_metrics++; break;
            case 'Estimated': stats.estimated_metrics++; break;
            case 'Unavailable': stats.unavailable_metrics++; break;
          }

          // Classification error: Measured but no evidence_entity
          if (m.classification === 'Measured' && !m.evidence_entity && !m.evidence_source) {
            issues.classification_errors.push({
              organization_id: org.id,
              metric: name,
              issue: 'measured_without_evidence',
            });
          }

          // Classification error: Unavailable but has a value
          if (m.classification === 'Unavailable' && m.value != null) {
            issues.classification_errors.push({
              organization_id: org.id,
              metric: name,
              issue: 'unavailable_with_value',
            });
          }

          // Evidence mismatch: has evidence_function but no evidence_source
          if (m.evidence_function && !m.evidence_source && m.classification !== 'Unavailable') {
            issues.evidence_mismatches.push({
              organization_id: org.id,
              metric: name,
              issue: 'function_without_source',
            });
          }

          // Financial leak: financial metric with Measured value that should be admin-only
          if (name.includes('revenue') || name.includes('gross') || name.includes('amount')) {
            if (m.classification === 'Measured' && m.value != null && m.value > 0) {
              // This is expected in admin context — check for public leak separately
            }
          }
        }

        // Check readiness score bounds
        if (readiness.score < 0 || readiness.score > 100) {
          issues.readiness_miscalculation.push({
            organization_id: org.id,
            score: readiness.score,
            issue: 'out_of_bounds',
          });
        }

        // Check readiness dimension weights sum to 100
        const weightSum = readiness.dimensions.reduce((s: number, d: any) => s + d.weight, 0);
        if (weightSum !== 100) {
          issues.readiness_miscalculation.push({
            organization_id: org.id,
            weight_sum: weightSum,
            issue: 'weights_do_not_sum_to_100',
          });
        }

        // Check for missing summaries
        if (!readiness.dimensions || readiness.dimensions.length === 0) {
          issues.missing_summaries.push({
            organization_id: org.id,
            issue: 'missing_readiness_dimensions',
          });
        }

        // Check trend data for invalid entries (null months, NaN counts)
        const trendEntries = [
          trendMetrics.activations_over_time,
          trendMetrics.deliverables_over_time,
          trendMetrics.revenue_events_over_time,
          trendMetrics.sponsorship_growth,
        ];
        trendEntries.forEach((entry: Metric) => {
          if (entry.classification === 'Derived' && Array.isArray(entry.value)) {
            (entry.value as any[]).forEach((point: any) => {
              if (!point.month || typeof point.count !== 'number' || point.count < 0) {
                issues.invalid_trends.push({
                  organization_id: org.id,
                  issue: 'invalid_trend_point',
                  point,
                });
              }
            });
          }
        });

        // Check public-safe filter strips financial data
        const fullAnalytics: any = {
          organization: { id: org.id, name: org.name, slug: org.slug, type: 'Sponsor', industry: org.industry, visibility_status: org.visibility_status, created_date: org.created_date },
          commercial_metrics: commercialMetrics,
          activation_metrics: activationMetrics,
          deliverable_metrics: deliverableMetrics,
          media_metrics: mediaMetrics,
          exposure_metrics: exposureMetrics,
          performance_metrics: performanceMetrics,
          trend_metrics: trendMetrics,
          readiness,
          completeness_summary: buildAnalyticsCompletenessSummary(ctx),
          financial_metrics: financialMetrics,
          advertisement_metrics: advertisementMetrics,
          commerce_metrics: commerceMetrics,
        };
        const publicSafe = buildPublicSafeAnalytics(fullAnalytics);
        if (publicSafe.financial_metrics) {
          issues.financial_leaks.push({
            organization_id: org.id,
            issue: 'financial_metrics_in_public_safe',
          });
          stats.financial_leaks_detected++;
        }
        if (publicSafe.commerce_metrics) {
          issues.financial_leaks.push({
            organization_id: org.id,
            issue: 'commerce_metrics_in_public_safe',
          });
          stats.financial_leaks_detected++;
        }
        if (publicSafe.evidence_matrix) {
          issues.visibility_leaks.push({
            organization_id: org.id,
            issue: 'evidence_matrix_in_public_safe',
          });
          stats.visibility_leaks_detected++;
        }

      } catch (err: any) {
        issues.broken_calculations.push({
          organization_id: org.id,
          error: err.message || 'calculation_failed',
        });
      }
    }

    const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

    return Response.json({
      status: 'complete',
      timestamp: new Date().toISOString(),
      stats,
      issues,
      summary: {
        total_issues: totalIssues,
        critical: issues.financial_leaks.length + issues.visibility_leaks.length,
        warnings: issues.classification_errors.length + issues.evidence_mismatches.length +
                  issues.readiness_miscalculation.length,
        informational: issues.missing_evidence.length + issues.invalid_trends.length +
                       issues.missing_summaries.length + issues.broken_calculations.length,
      },
    });
  } catch (err) {
    console.error('[auditSponsorAnalytics] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}