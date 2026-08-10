/**
 * exportSponsorAnalytics
 * Phase 17F — Read-only export of Sponsor Analytics in CSV or JSON format.
 * Admin-only. Reuses the analytics engine and shared helpers.
 * No writes. No modifications.
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
  type Metric,
} from '../../shared/sponsorAnalyticsHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { organization_id, format = 'json' } = body;

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const organization = await base44.asServiceRole.entities.Organization.get(organization_id).catch(() => null);
    if (!organization) {
      return Response.json({ error: 'Sponsor not found' }, { status: 404 });
    }
    if (organization.type !== 'Sponsor') {
      return Response.json({ error: 'Organization is not a sponsor type' }, { status: 404 });
    }
    if (!isSponsorPublic(organization)) {
      return Response.json({ error: 'Sponsor not found' }, { status: 404 });
    }

    const ctx = await loadSponsorAnalyticsContext(base44, organization);

    // Build all metrics
    const allMetrics = {
      commercial: buildCommercialMetrics(ctx),
      financial: buildFinancialMetrics(ctx),
      activation: buildActivationMetrics(ctx),
      deliverable: buildDeliverableMetrics(ctx),
      media: buildMediaMetrics(ctx),
      advertisement: buildAdvertisementMetrics(ctx),
      exposure: buildExposureMetrics(ctx),
      commerce: buildCommerceMetrics(ctx),
      performance: buildPerformanceMetrics(ctx),
      trend: buildTrendMetrics(ctx),
    };

    const readiness = calculateROIReadiness(ctx);
    const completeness = buildAnalyticsCompletenessSummary(ctx);
    const evidenceMatrix = buildEvidenceMatrix(
      Object.values(allMetrics).reduce((acc, cat) => ({ ...acc, ...cat }), {})
    );

    const payload = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || organization.canonical_slug,
        industry: organization.industry,
      },
      generated_at: new Date().toISOString(),
      engine_version: '17F.1',
      metrics: allMetrics,
      readiness,
      completeness,
      evidence_matrix: evidenceMatrix,
    };

    if (format === 'csv') {
      // Flatten evidence matrix to CSV
      const headers = ['Metric', 'Value', 'Classification', 'Evidence Entity', 'Evidence Function', 'Confidence', 'Reason'];
      const rows = evidenceMatrix.map((row: any) => [
        row.metric,
        typeof row.value === 'object' ? JSON.stringify(row.value) : (row.value ?? ''),
        row.classification,
        row.evidence_entity,
        row.evidence_function,
        row.confidence,
        row.reason || '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell: any) => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','))
        .join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sponsor-analytics-${organization.slug || organization.id}.csv"`,
        },
      });
    }

    return Response.json(payload, {
      headers: {
        'Content-Disposition': `attachment; filename="sponsor-analytics-${organization.slug || organization.id}.json"`,
      },
    });
  } catch (err) {
    console.error('[exportSponsorAnalytics] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}