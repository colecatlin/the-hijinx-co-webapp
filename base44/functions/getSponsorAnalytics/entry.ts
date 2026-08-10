/**
 * getSponsorAnalytics
 * Phase 17F — Read-only function that computes the complete Sponsor Analytics
 * & ROI payload. Returns one structured payload with all commercial intelligence
 * metrics, each tagged with classification and evidence source.
 *
 * Admin-only — financial values are never exposed publicly.
 * Read-only — never creates or modifies any state.
 * No predictive analytics. No estimated financial values.
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
    const body = await req.json().catch(() => ({}));
    const { slug, organization_id, public_safe = false } = body;

    if (!slug && !organization_id) {
      return Response.json({ error: 'slug or organization_id is required' }, { status: 400 });
    }

    // Resolve Organization
    let organization: any = null;
    if (organization_id) {
      organization = await base44.asServiceRole.entities.Organization.get(organization_id).catch(() => null);
    } else {
      const list = await base44.asServiceRole.entities.Organization.filter({
        $or: [
          { slug },
          { canonical_slug: slug },
          { normalized_name: slug.toLowerCase().replace(/[^a-z0-9]/g, '') },
        ],
      }).catch(() => []);
      organization = (list && list[0]) || null;
    }

    if (!organization) {
      return Response.json({ error: 'Sponsor not found' }, { status: 404 });
    }

    if (organization.type !== 'Sponsor') {
      return Response.json({ error: 'Organization is not a sponsor type' }, { status: 404 });
    }

    // Visibility check
    if (!isSponsorPublic(organization)) {
      return Response.json({ error: 'Sponsor not found' }, { status: 404 });
    }

    // For non-public-safe (full analytics), require admin
    if (!public_safe) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin access required for full analytics' }, { status: 403 });
      }
    }

    // Load complete analytics context
    const ctx = await loadSponsorAnalyticsContext(base44, organization);

    // Build all metric categories
    const commercialMetrics = buildCommercialMetrics(ctx);
    const activationMetrics = buildActivationMetrics(ctx);
    const deliverableMetrics = buildDeliverableMetrics(ctx);
    const mediaMetrics = buildMediaMetrics(ctx);
    const exposureMetrics = buildExposureMetrics(ctx);
    const performanceMetrics = buildPerformanceMetrics(ctx);
    const trendMetrics = buildTrendMetrics(ctx);
    const readiness = calculateROIReadiness(ctx);
    const completenessSummary = buildAnalyticsCompletenessSummary(ctx);

    // Build composite payload
    const analytics: any = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || organization.canonical_slug || null,
        type: organization.type,
        industry: organization.industry || null,
        visibility_status: organization.visibility_status || 'draft',
        created_date: organization.created_date || null,
      },
      commercial_metrics: commercialMetrics,
      activation_metrics: activationMetrics,
      deliverable_metrics: deliverableMetrics,
      media_metrics: mediaMetrics,
      exposure_metrics: exposureMetrics,
      performance_metrics: performanceMetrics,
      trend_metrics: trendMetrics,
      readiness,
      completeness_summary: completenessSummary,
      generated_at: new Date().toISOString(),
      engine_version: '17F.1',
    };

    // Admin-only sections
    if (!public_safe) {
      const financialMetrics = buildFinancialMetrics(ctx);
      const advertisementMetrics = buildAdvertisementMetrics(ctx);
      const commerceMetrics = buildCommerceMetrics(ctx);

      analytics.financial_metrics = financialMetrics;
      analytics.advertisement_metrics = advertisementMetrics;
      analytics.commerce_metrics = commerceMetrics;

      // Evidence matrix (all metrics combined)
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
      analytics.evidence_matrix = buildEvidenceMatrix(allMetrics);
    }

    // Return public-safe subset if requested
    if (public_safe) {
      return Response.json(buildPublicSafeAnalytics(analytics));
    }

    return Response.json(analytics);
  } catch (err) {
    console.error('[getSponsorAnalytics] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}