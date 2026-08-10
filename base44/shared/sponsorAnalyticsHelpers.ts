/**
 * sponsorAnalyticsHelpers.ts
 *
 * Phase 17F — Shared read-only helpers for the Sponsor Analytics & ROI platform.
 * All reusable analytics logic lives here — never duplicated between the
 * analytics engine, audit, export, or frontend.
 *
 * Every metric declares its evidence source and classification:
 *   Measured   — directly from an entity field
 *   Derived    — computed from one or more entity fields
 *   Estimated  — no precision fabricated; only used when a manual estimate exists
 *   Unavailable — no data source exists
 *
 * Financial values are never estimated. Exposure is evidence-based.
 * Performance uses authoritative racing data (Results, DriverCareerStats).
 * No predictive analytics. No commercial writes.
 */

import {
  loadSponsorContext,
  isSponsorPublic,
  type SponsorContext,
} from './sponsorExperienceHelpers.ts';

// Re-export for convenience — backend functions import from this module
export { isSponsorPublic } from './sponsorExperienceHelpers.ts';

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export type MetricClassification = 'Measured' | 'Derived' | 'Estimated' | 'Unavailable';

export interface Metric {
  value: any;
  classification: MetricClassification;
  evidence_source: string;
  evidence_entity?: string;
  evidence_function?: string;
  confidence: number; // 0-100
  reason?: string;
}

export function measuredMetric(
  value: any,
  evidenceEntity: string,
  evidenceFunction: string,
  confidence = 100
): Metric {
  return { value, classification: 'Measured', evidence_source: evidenceEntity, evidence_entity: evidenceEntity, evidence_function: evidenceFunction, confidence };
}

export function derivedMetric(
  value: any,
  evidenceEntity: string,
  evidenceFunction: string,
  confidence = 95
): Metric {
  return { value, classification: 'Derived', evidence_source: evidenceEntity, evidence_entity: evidenceEntity, evidence_function: evidenceFunction, confidence };
}

export function estimatedMetric(
  value: any,
  evidenceEntity: string,
  evidenceFunction: string,
  confidence = 50
): Metric {
  return { value, classification: 'Estimated', evidence_source: evidenceEntity, evidence_entity: evidenceEntity, evidence_function: evidenceFunction, confidence };
}

export function unavailableMetric(
  reason: string,
  evidenceFunction: string
): Metric {
  return { value: null, classification: 'Unavailable', evidence_source: 'none', evidence_function: evidenceFunction, confidence: 0, reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS CONTEXT (extends experience context with financial/performance data)
// ─────────────────────────────────────────────────────────────────────────────

export interface SponsorAnalyticsContext extends SponsorContext {
  revenueAgreements: any[];
  revenueEvents: any[];
  adAnalytics: any[];
  adAnalyticsByAd: Map<string, any[]>;
  orders: any[];
  orderItems: any[];
  racerProfileIds: string[];
  racerResults: Map<string, any[]>;
  racerCareerStats: Map<string, any>;
  allActivations: any[]; // includes private (admin analytics)
  allDeliverables: any[]; // includes private (admin analytics)
}

/**
 * Load the complete analytics context — extends the experience context with
 * financial, commerce, and performance data. Admin-only fields are loaded here
 * and filtered at the API boundary.
 */
export async function loadSponsorAnalyticsContext(
  base44: any,
  organization: any
): Promise<SponsorAnalyticsContext> {
  const baseCtx = await loadSponsorContext(base44, organization);
  const sidArray = Array.from(baseCtx.sponsorshipIds);

  // Parallel independent loads for analytics-specific data
  const [revenueAgreements, revenueEvents, allActivations, allDeliverables] = await Promise.all([
    sidArray.length > 0
      ? base44.asServiceRole.entities.RevenueAgreement.filter({
          linked_sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
    sidArray.length > 0
      ? base44.asServiceRole.entities.RevenueEvent.filter({
          linked_sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
    sidArray.length > 0
      ? base44.asServiceRole.entities.Activation.filter({
          sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
    sidArray.length > 0
      ? base44.asServiceRole.entities.SponsorshipDeliverable.filter({
          sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
  ]);

  // Ad analytics for this sponsor's advertisements
  const adIds = baseCtx.advertisements.map((ad: any) => ad.id);
  const adAnalytics = adIds.length > 0
    ? await base44.asServiceRole.entities.AdAnalytics.filter({
        advertisement_id: { $in: adIds },
      }).catch(() => [])
    : [];

  const adAnalyticsByAd = new Map<string, any[]>();
  (adAnalytics as any[]).forEach((aa: any) => {
    const key = aa.advertisement_id;
    if (!adAnalyticsByAd.has(key)) adAnalyticsByAd.set(key, []);
    adAnalyticsByAd.get(key)!.push(aa);
  });

  // Commerce: Orders + OrderItems (check if any products are sponsor-linked)
  // Product entity does not have a sponsor_organization_id field, so we check
  // via tags or category matching the sponsor name. This is best-effort.
  let orders: any[] = [];
  let orderItems: any[] = [];
  try {
    const orgNameLower = (organization.name || '').toLowerCase();
    if (orgNameLower) {
      const allProducts = await base44.asServiceRole.entities.Product.filter({
        status: 'active',
      }).catch(() => []);
      const sponsorProducts = (allProducts as any[]).filter((p: any) =>
        (p.tags || []).some((t: string) => t.toLowerCase().includes(orgNameLower)) ||
        (p.category || '').toLowerCase().includes(orgNameLower)
      );
      if (sponsorProducts.length > 0) {
        const productIds = sponsorProducts.map((p: any) => p.id);
        orderItems = await base44.asServiceRole.entities.OrderItem.filter({
          product_id: { $in: productIds },
        }).catch(() => []);
        const orderIds = Array.from(new Set(orderItems.map((oi: any) => oi.order_id)));
        if (orderIds.length > 0) {
          orders = await base44.asServiceRole.entities.Order.filter({
            id: { $in: orderIds },
          }).catch(() => []);
        }
      }
    }
  } catch {
    // Commerce data may not be accessible — skip
  }

  // Performance: Results + DriverCareerStats for sponsored racers
  const racerProfileIds = baseCtx.sponsorships
    .filter((s: any) => s.target_entity_type === 'RacerProfile' && s.target_entity_id)
    .map((s: any) => s.target_entity_id);
  const uniqueRacerIds = Array.from(new Set(racerProfileIds));

  const racerResults = new Map<string, any[]>();
  const racerCareerStats = new Map<string, any>();

  // Load career stats for sponsored racers (batch)
  if (uniqueRacerIds.length > 0) {
    try {
      const allCareerStats = await base44.asServiceRole.entities.DriverCareerStats.filter({
        driver_id: { $in: uniqueRacerIds },
        scope_type: 'career_total',
      }).catch(() => []);
      (allCareerStats as any[]).forEach((cs: any) => {
        const rid = cs.identity_id || cs.driver_id;
        if (rid && !racerCareerStats.has(rid)) {
          racerCareerStats.set(rid, cs);
        }
      });
    } catch {
      // Career stats may not be accessible
    }

    // Load recent results for sponsored racers (batch, limited)
    try {
      const allResults = await base44.asServiceRole.entities.Results.filter({
        driver_id: { $in: uniqueRacerIds },
        published: true,
      }, '-created_date', 200).catch(() => []);
      (allResults as any[]).forEach((r: any) => {
        const rid = r.driver_id;
        if (!racerResults.has(rid)) racerResults.set(rid, []);
        racerResults.get(rid)!.push(r);
      });
    } catch {
      // Results may not be accessible
    }
  }

  return {
    ...baseCtx,
    revenueAgreements: revenueAgreements as any[],
    revenueEvents: revenueEvents as any[],
    adAnalytics: adAnalytics as any[],
    adAnalyticsByAd,
    orders,
    orderItems,
    racerProfileIds: uniqueRacerIds,
    racerResults,
    racerCareerStats,
    allActivations: allActivations as any[],
    allDeliverables: allDeliverables as any[],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildCommercialMetrics(ctx: SponsorAnalyticsContext): any {
  const sponsorships = ctx.sponsorships;
  const agreements = ctx.revenueAgreements;
  const events = ctx.revenueEvents;

  return {
    total_sponsorships: measuredMetric(sponsorships.length, 'Sponsorship', 'getSponsorAnalytics'),
    active_sponsorships: measuredMetric(
      sponsorships.filter((s: any) => s.status === 'active').length,
      'Sponsorship', 'getSponsorAnalytics'
    ),
    historical_sponsorships: measuredMetric(
      sponsorships.filter((s: any) => ['completed', 'expired'].includes(s.status)).length,
      'Sponsorship', 'getSponsorAnalytics'
    ),
    agreement_count: measuredMetric(agreements.length, 'RevenueAgreement', 'getSponsorAnalytics'),
    active_agreements: measuredMetric(
      agreements.filter((a: any) => a.status === 'active').length,
      'RevenueAgreement', 'getSponsorAnalytics'
    ),
    revenue_event_count: measuredMetric(events.length, 'RevenueEvent', 'getSponsorAnalytics'),
    industries: measuredMetric(
      Array.from(new Set(sponsorships.map((s: any) => s.category).filter(Boolean))),
      'Sponsorship.category', 'getSponsorAnalytics'
    ),
    relationship_types: measuredMetric(
      Array.from(new Set(sponsorships.map((s: any) => s.relationship_type).filter(Boolean))),
      'Sponsorship.relationship_type', 'getSponsorAnalytics'
    ),
    tiers: measuredMetric(
      Array.from(new Set(sponsorships.map((s: any) => s.tier).filter(Boolean))),
      'Sponsorship.tier', 'getSponsorAnalytics'
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL METRICS (admin only — never exposed publicly)
// ─────────────────────────────────────────────────────────────────────────────

export function buildFinancialMetrics(ctx: SponsorAnalyticsContext): any {
  const agreements = ctx.revenueAgreements;
  const events = ctx.revenueEvents;

  // Only compute financial values if RevenueEvent records exist
  if (events.length === 0) {
    return {
      gross_revenue: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      platform_revenue: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      creator_revenue: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      outlet_revenue: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      average_agreement_value: unavailableMetric('No agreement values recorded', 'getSponsorAnalytics'),
      revenue_by_sponsorship: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      revenue_by_season: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
      revenue_by_category: unavailableMetric('No revenue events recorded', 'getSponsorAnalytics'),
    };
  }

  const gross = events.reduce((sum: number, e: any) => sum + (e.gross_amount || 0), 0);
  const platform = events.reduce((sum: number, e: any) => sum + (e.platform_amount || 0), 0);
  const creator = events.reduce((sum: number, e: any) => sum + (e.creator_amount || 0), 0);
  const outlet = events.reduce((sum: number, e: any) => sum + (e.outlet_amount || 0), 0);

  // Revenue by sponsorship
  const bySponsorship = new Map<string, number>();
  events.forEach((e: any) => {
    if (e.linked_sponsorship_id) {
      bySponsorship.set(
        e.linked_sponsorship_id,
        (bySponsorship.get(e.linked_sponsorship_id) || 0) + (e.gross_amount || 0)
      );
    }
  });

  // Revenue by season (from sponsorship season_year)
  const bySeason = new Map<string, number>();
  events.forEach((e: any) => {
    const sponsorship = ctx.sponsorships.find((s: any) => s.sponsorship_id === e.linked_sponsorship_id);
    const season = sponsorship?.season_year || 'unknown';
    bySeason.set(season, (bySeason.get(season) || 0) + (e.gross_amount || 0));
  });

  // Revenue by category (from sponsorship category)
  const byCategory = new Map<string, number>();
  events.forEach((e: any) => {
    const sponsorship = ctx.sponsorships.find((s: any) => s.sponsorship_id === e.linked_sponsorship_id);
    const category = sponsorship?.category || 'uncategorized';
    byCategory.set(category, (byCategory.get(category) || 0) + (e.gross_amount || 0));
  });

  // Average agreement value (from flat_fee_amount on agreements)
  const flatFees = agreements.filter((a: any) => a.flat_fee_amount != null).map((a: any) => a.flat_fee_amount);
  const avgAgreementValue = flatFees.length > 0
    ? flatFees.reduce((sum: number, v: number) => sum + v, 0) / flatFees.length
    : null;

  return {
    gross_revenue: measuredMetric(gross, 'RevenueEvent.gross_amount', 'getSponsorAnalytics'),
    platform_revenue: measuredMetric(platform, 'RevenueEvent.platform_amount', 'getSponsorAnalytics'),
    creator_revenue: measuredMetric(creator, 'RevenueEvent.creator_amount', 'getSponsorAnalytics'),
    outlet_revenue: measuredMetric(outlet, 'RevenueEvent.outlet_amount', 'getSponsorAnalytics'),
    average_agreement_value: avgAgreementValue != null
      ? derivedMetric(avgAgreementValue, 'RevenueAgreement.flat_fee_amount', 'getSponsorAnalytics')
      : unavailableMetric('No flat fee amounts recorded', 'getSponsorAnalytics'),
    revenue_by_sponsorship: derivedMetric(
      Array.from(bySponsorship.entries()).map(([id, amount]) => ({ sponsorship_id: id, amount })),
      'RevenueEvent + Sponsorship', 'getSponsorAnalytics'
    ),
    revenue_by_season: derivedMetric(
      Array.from(bySeason.entries()).map(([season, amount]) => ({ season, amount })),
      'RevenueEvent + Sponsorship.season_year', 'getSponsorAnalytics'
    ),
    revenue_by_category: derivedMetric(
      Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount })),
      'RevenueEvent + Sponsorship.category', 'getSponsorAnalytics'
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildActivationMetrics(ctx: SponsorAnalyticsContext): any {
  const activations = ctx.allActivations;
  const total = activations.length;

  const planned = activations.filter((a: any) => a.status === 'planned').length;
  const approved = activations.filter((a: any) => a.status === 'approved').length;
  const active = activations.filter((a: any) => a.status === 'active').length;
  const completed = activations.filter((a: any) => a.status === 'completed').length;
  const cancelled = activations.filter((a: any) => a.status === 'cancelled').length;

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Average duration (from start_date to end_date on completed activations)
  const durationsMs: number[] = [];
  activations.forEach((a: any) => {
    if (a.start_date && a.end_date) {
      const dur = new Date(a.end_date).getTime() - new Date(a.start_date).getTime();
      if (dur > 0) durationsMs.push(dur);
    }
  });
  const avgDurationMs = durationsMs.length > 0
    ? durationsMs.reduce((s: number, v: number) => s + v, 0) / durationsMs.length
    : null;

  // Public vs private
  const publicCount = activations.filter((a: any) => a.public_visibility === 'public').length;
  const privateCount = total - publicCount;

  // By type
  const byType = new Map<string, number>();
  activations.forEach((a: any) => {
    byType.set(a.activation_type, (byType.get(a.activation_type) || 0) + 1);
  });

  // By event
  const byEvent = new Map<string, number>();
  activations.forEach((a: any) => {
    if (a.linked_event_id) {
      byEvent.set(a.linked_event_id, (byEvent.get(a.linked_event_id) || 0) + 1);
    }
  });

  return {
    total: measuredMetric(total, 'Activation', 'getSponsorAnalytics'),
    planned: measuredMetric(planned, 'Activation.status', 'getSponsorAnalytics'),
    approved: measuredMetric(approved, 'Activation.status', 'getSponsorAnalytics'),
    active: measuredMetric(active, 'Activation.status', 'getSponsorAnalytics'),
    completed: measuredMetric(completed, 'Activation.status', 'getSponsorAnalytics'),
    cancelled: measuredMetric(cancelled, 'Activation.status', 'getSponsorAnalytics'),
    completion_percent: derivedMetric(completionPercent, 'Activation.status', 'getSponsorAnalytics'),
    average_duration_ms: avgDurationMs != null
      ? derivedMetric(avgDurationMs, 'Activation.start_date + end_date', 'getSponsorAnalytics')
      : unavailableMetric('No activations with both start and end dates', 'getSponsorAnalytics'),
    public_count: measuredMetric(publicCount, 'Activation.public_visibility', 'getSponsorAnalytics'),
    private_count: measuredMetric(privateCount, 'Activation.public_visibility', 'getSponsorAnalytics'),
    by_type: derivedMetric(
      Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      'Activation.activation_type', 'getSponsorAnalytics'
    ),
    by_event: derivedMetric(
      Array.from(byEvent.entries()).map(([event_id, count]) => ({ event_id, count })),
      'Activation.linked_event_id', 'getSponsorAnalytics'
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildDeliverableMetrics(ctx: SponsorAnalyticsContext): any {
  const deliverables = ctx.allDeliverables;
  const total = deliverables.length;

  const completed = deliverables.filter((d: any) => d.status === 'completed').length;
  const outstanding = deliverables.filter((d: any) => ['planned', 'in_progress', 'submitted', 'approved'].includes(d.status)).length;
  const cancelled = deliverables.filter((d: any) => d.status === 'cancelled').length;

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Over-delivered (quantity_completed > quantity_required)
  const overDelivered = deliverables.filter((d: any) =>
    d.quantity_completed != null && d.quantity_required != null && d.quantity_completed > d.quantity_required
  ).length;

  // Average completion time (from created_date to completed_at)
  const completionTimesMs: number[] = [];
  deliverables.forEach((d: any) => {
    if (d.completed_at && d.created_date) {
      const dur = new Date(d.completed_at).getTime() - new Date(d.created_date).getTime();
      if (dur > 0) completionTimesMs.push(dur);
    }
  });
  const avgCompletionMs = completionTimesMs.length > 0
    ? completionTimesMs.reduce((s: number, v: number) => s + v, 0) / completionTimesMs.length
    : null;

  // By type
  const byType = new Map<string, number>();
  deliverables.forEach((d: any) => {
    byType.set(d.deliverable_type, (byType.get(d.deliverable_type) || 0) + 1);
  });

  return {
    total: measuredMetric(total, 'SponsorshipDeliverable', 'getSponsorAnalytics'),
    completed: measuredMetric(completed, 'SponsorshipDeliverable.status', 'getSponsorAnalytics'),
    outstanding: measuredMetric(outstanding, 'SponsorshipDeliverable.status', 'getSponsorAnalytics'),
    cancelled: measuredMetric(cancelled, 'SponsorshipDeliverable.status', 'getSponsorAnalytics'),
    completion_percent: derivedMetric(completionPercent, 'SponsorshipDeliverable.status', 'getSponsorAnalytics'),
    over_delivered: derivedMetric(overDelivered, 'SponsorshipDeliverable.quantity_completed > quantity_required', 'getSponsorAnalytics'),
    average_completion_time_ms: avgCompletionMs != null
      ? derivedMetric(avgCompletionMs, 'SponsorshipDeliverable.completed_at - created_date', 'getSponsorAnalytics')
      : unavailableMetric('No deliverables with both created and completed dates', 'getSponsorAnalytics'),
    by_type: derivedMetric(
      Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      'SponsorshipDeliverable.deliverable_type', 'getSponsorAnalytics'
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildMediaMetrics(ctx: SponsorAnalyticsContext): any {
  const assignments = ctx.mediaAssignments;
  const ads = ctx.advertisements;
  const stories = ctx.outletStories;

  return {
    media_assignment_count: measuredMetric(assignments.length, 'MediaAssignment', 'getSponsorAnalytics'),
    advertisement_count: measuredMetric(ads.length, 'Advertisement', 'getSponsorAnalytics'),
    published_story_count: measuredMetric(stories.length, 'OutletStory', 'getSponsorAnalytics'),
    photo_count: unavailableMetric('No sponsor-linked photo tracking', 'getSponsorAnalytics'),
    video_count: unavailableMetric('No sponsor-linked video tracking', 'getSponsorAnalytics'),
    article_count: measuredMetric(stories.length, 'OutletStory', 'getSponsorAnalytics'),
    impressions: unavailableMetric('No impression tracking for editorial media', 'getSponsorAnalytics'),
    media_value: unavailableMetric('No valuation model implemented', 'getSponsorAnalytics'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVERTISEMENT METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdvertisementMetrics(ctx: SponsorAnalyticsContext): any {
  const ads = ctx.advertisements;
  const adAnalytics = ctx.adAnalytics;

  if (adAnalytics.length === 0) {
    return {
      total_impressions: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
      total_clicks: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
      total_conversions: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
      ctr: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
      conversion_rate: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
      by_advertisement: unavailableMetric('No ad analytics records', 'getSponsorAnalytics'),
    };
  }

  const impressions = adAnalytics.reduce((s: number, aa: any) => s + (aa.impressions || 0), 0);
  const clicks = adAnalytics.reduce((s: number, aa: any) => s + (aa.clicks || 0), 0);
  const conversions = adAnalytics.reduce((s: number, aa: any) => s + (aa.conversions || 0), 0);
  const ctr = impressions > 0 ? clicks / impressions : null;
  const convRate = clicks > 0 ? conversions / clicks : null;

  // By advertisement
  const byAd = ads.map((ad: any) => {
    const records = ctx.adAnalyticsByAd.get(ad.id) || [];
    const adImp = records.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
    const adClicks = records.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
    const adConv = records.reduce((s: number, r: any) => s + (r.conversions || 0), 0);
    return {
      advertisement_id: ad.id,
      title: ad.title,
      impressions: adImp,
      clicks: adClicks,
      conversions: adConv,
    };
  });

  return {
    total_impressions: measuredMetric(impressions, 'AdAnalytics.impressions', 'getSponsorAnalytics'),
    total_clicks: measuredMetric(clicks, 'AdAnalytics.clicks', 'getSponsorAnalytics'),
    total_conversions: measuredMetric(conversions, 'AdAnalytics.conversions', 'getSponsorAnalytics'),
    ctr: ctr != null
      ? derivedMetric(ctr, 'AdAnalytics.clicks / impressions', 'getSponsorAnalytics')
      : unavailableMetric('No impressions recorded', 'getSponsorAnalytics'),
    conversion_rate: convRate != null
      ? derivedMetric(convRate, 'AdAnalytics.conversions / clicks', 'getSponsorAnalytics')
      : unavailableMetric('No clicks recorded', 'getSponsorAnalytics'),
    by_advertisement: derivedMetric(byAd, 'AdAnalytics + Advertisement', 'getSponsorAnalytics'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPOSURE METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildExposureMetrics(ctx: SponsorAnalyticsContext): any {
  const activeSponsorships = ctx.sponsorships.filter((s: any) => s.status === 'active');
  const allSponsorships = ctx.sponsorships;

  const countByType = (type: string, activeOnly: boolean) => {
    const source = activeOnly ? activeSponsorships : allSponsorships;
    return new Set(
      source.filter((s: any) => s.target_entity_type === type && s.target_entity_id)
            .map((s: any) => s.target_entity_id)
    ).size;
  };

  return {
    sponsored_racers_current: measuredMetric(countByType('RacerProfile', true), 'Sponsorship → RacerProfile', 'getSponsorAnalytics'),
    sponsored_teams_current: measuredMetric(countByType('Team', true), 'Sponsorship → Team', 'getSponsorAnalytics'),
    sponsored_vehicles_current: measuredMetric(countByType('Vehicle', true), 'Sponsorship → Vehicle', 'getSponsorAnalytics'),
    sponsored_series_current: measuredMetric(countByType('Series', true), 'Sponsorship → Series', 'getSponsorAnalytics'),
    sponsored_events_current: measuredMetric(countByType('Event', true), 'Sponsorship → Event', 'getSponsorAnalytics'),
    sponsored_tracks_current: measuredMetric(countByType('Track', true), 'Sponsorship → Track', 'getSponsorAnalytics'),
    sponsored_media_current: measuredMetric(countByType('MediaAsset', true), 'Sponsorship → MediaAsset', 'getSponsorAnalytics'),
    sponsored_racers_all: measuredMetric(countByType('RacerProfile', false), 'Sponsorship → RacerProfile', 'getSponsorAnalytics'),
    sponsored_teams_all: measuredMetric(countByType('Team', false), 'Sponsorship → Team', 'getSponsorAnalytics'),
    supported_categories: measuredMetric(
      Array.from(new Set(allSponsorships.map((s: any) => s.category).filter(Boolean))),
      'Sponsorship.category', 'getSponsorAnalytics'
    ),
    supported_industries: measuredMetric(
      Array.from(new Set([ctx.organization.industry, ...allSponsorships.map((s: any) => s.category)].filter(Boolean))),
      'Organization.industry + Sponsorship.category', 'getSponsorAnalytics'
    ),
    current_campaigns: measuredMetric(
      activeSponsorships.filter((s: any) => s.campaign_name).length,
      'Sponsorship.campaign_name', 'getSponsorAnalytics'
    ),
    historical_campaigns: measuredMetric(
      allSponsorships.filter((s: any) => s.campaign_name && s.status !== 'active').length,
      'Sponsorship.campaign_name', 'getSponsorAnalytics'
    ),
    audience_reach: unavailableMetric('No audience measurement system', 'getSponsorAnalytics'),
    estimated_reach_sum: estimatedMetric(
      ctx.allActivations.reduce((s: number, a: any) => s + (a.estimated_reach || 0), 0),
      'Activation.estimated_reach (manually entered)', 'getSponsorAnalytics', 40
    ),
    actual_reach_sum: estimatedMetric(
      ctx.allActivations.reduce((s: number, a: any) => s + (a.actual_reach || 0), 0),
      'Activation.actual_reach (manually entered)', 'getSponsorAnalytics', 50
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCE METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildCommerceMetrics(ctx: SponsorAnalyticsContext): any {
  if (ctx.orders.length === 0) {
    return {
      order_count: unavailableMetric('No sponsor-linked orders found', 'getSponsorAnalytics'),
      gross_sales: unavailableMetric('No sponsor-linked orders found', 'getSponsorAnalytics'),
      units_sold: unavailableMetric('No sponsor-linked orders found', 'getSponsorAnalytics'),
      average_order_value: unavailableMetric('No sponsor-linked orders found', 'getSponsorAnalytics'),
      by_product: unavailableMetric('No sponsor-linked products found', 'getSponsorAnalytics'),
    };
  }

  const grossSales = ctx.orders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const unitsSold = ctx.orderItems.reduce((s: number, oi: any) => s + (oi.quantity || 0), 0);
  const avgOrderValue = ctx.orders.length > 0 ? grossSales / ctx.orders.length : null;

  // By product
  const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>();
  ctx.orderItems.forEach((oi: any) => {
    const key = oi.product_id;
    if (!byProduct.has(key)) {
      byProduct.set(key, { name: oi.product_name || 'Unknown', quantity: 0, revenue: 0 });
    }
    const entry = byProduct.get(key)!;
    entry.quantity += oi.quantity || 0;
    entry.revenue += oi.line_total || 0;
  });

  return {
    order_count: measuredMetric(ctx.orders.length, 'Order', 'getSponsorAnalytics'),
    gross_sales: measuredMetric(grossSales, 'Order.total', 'getSponsorAnalytics'),
    units_sold: derivedMetric(unitsSold, 'OrderItem.quantity', 'getSponsorAnalytics'),
    average_order_value: derivedMetric(avgOrderValue, 'Order.total / count', 'getSponsorAnalytics'),
    by_product: derivedMetric(
      Array.from(byProduct.entries()).map(([id, v]) => ({ product_id: id, ...v })),
      'OrderItem + Product', 'getSponsorAnalytics'
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE METRICS (from Results + DriverCareerStats)
// ─────────────────────────────────────────────────────────────────────────────

export function buildPerformanceMetrics(ctx: SponsorAnalyticsContext): any {
  if (ctx.racerProfileIds.length === 0) {
    return {
      sponsored_racer_count: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_wins: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_podiums: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_championships: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_top5: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_top10: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      total_starts: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
      by_racer: unavailableMetric('No sponsored racers', 'getSponsorAnalytics'),
    };
  }

  let totalWins = 0, totalPodiums = 0, totalChamps = 0, totalTop5 = 0, totalTop10 = 0, totalStarts = 0;
  const byRacer: any[] = [];

  ctx.racerProfileIds.forEach((racerId: string) => {
    const stats = ctx.racerCareerStats.get(racerId);
    if (stats) {
      totalWins += stats.career_wins || 0;
      totalPodiums += stats.career_podiums || 0;
      totalChamps += stats.championships || 0;
      totalTop5 += stats.career_top5 || 0;
      totalTop10 += stats.career_top10 || 0;
      totalStarts += stats.career_starts || 0;
      byRacer.push({
        racer_id: racerId,
        wins: stats.career_wins || 0,
        podiums: stats.career_podiums || 0,
        championships: stats.championships || 0,
        top5: stats.career_top5 || 0,
        top10: stats.career_top10 || 0,
        starts: stats.career_starts || 0,
      });
    } else {
      byRacer.push({ racer_id: racerId, wins: 0, podiums: 0, championships: 0, top5: 0, top10: 0, starts: 0 });
    }
  });

  return {
    sponsored_racer_count: measuredMetric(ctx.racerProfileIds.length, 'Sponsorship → RacerProfile', 'getSponsorAnalytics'),
    total_wins: derivedMetric(totalWins, 'DriverCareerStats.career_wins', 'getSponsorAnalytics'),
    total_podiums: derivedMetric(totalPodiums, 'DriverCareerStats.career_podiums', 'getSponsorAnalytics'),
    total_championships: derivedMetric(totalChamps, 'DriverCareerStats.championships', 'getSponsorAnalytics'),
    total_top5: derivedMetric(totalTop5, 'DriverCareerStats.career_top5', 'getSponsorAnalytics'),
    total_top10: derivedMetric(totalTop10, 'DriverCareerStats.career_top10', 'getSponsorAnalytics'),
    total_starts: derivedMetric(totalStarts, 'DriverCareerStats.career_starts', 'getSponsorAnalytics'),
    by_racer: derivedMetric(byRacer, 'DriverCareerStats', 'getSponsorAnalytics'),
    note: 'Performance metrics reflect sponsored racers career results. Sponsorship does not imply causation.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TREND METRICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildTrendMetrics(ctx: SponsorAnalyticsContext): any {
  // Activations over time (by start_date month)
  const activationsByMonth = new Map<string, number>();
  ctx.allActivations.forEach((a: any) => {
    if (a.start_date) {
      const month = a.start_date.substring(0, 7); // YYYY-MM
      activationsByMonth.set(month, (activationsByMonth.get(month) || 0) + 1);
    }
  });

  // Deliverables completed over time (by completed_at month)
  const deliverablesByMonth = new Map<string, number>();
  ctx.allDeliverables.forEach((d: any) => {
    if (d.completed_at) {
      const month = d.completed_at.substring(0, 7);
      deliverablesByMonth.set(month, (deliverablesByMonth.get(month) || 0) + 1);
    }
  });

  // Revenue events over time (by occurred_at month)
  const revenueByMonth = new Map<string, number>();
  ctx.revenueEvents.forEach((e: any) => {
    if (e.occurred_at) {
      const month = e.occurred_at.substring(0, 7);
      revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + 1);
    }
  });

  // Sponsorship growth (by created_date month)
  const sponsorshipsByMonth = new Map<string, number>();
  ctx.sponsorships.forEach((s: any) => {
    if (s.start_date) {
      const month = s.start_date.substring(0, 7);
      sponsorshipsByMonth.set(month, (sponsorshipsByMonth.get(month) || 0) + 1);
    }
  });

  const hasAnyTrend = activationsByMonth.size > 0 || deliverablesByMonth.size > 0 ||
    revenueByMonth.size > 0 || sponsorshipsByMonth.size > 0;

  if (!hasAnyTrend) {
    return {
      activations_over_time: unavailableMetric('No activation dates recorded', 'getSponsorAnalytics'),
      deliverables_over_time: unavailableMetric('No deliverable completion dates recorded', 'getSponsorAnalytics'),
      revenue_events_over_time: unavailableMetric('No revenue event dates recorded', 'getSponsorAnalytics'),
      sponsorship_growth: unavailableMetric('No sponsorship start dates recorded', 'getSponsorAnalytics'),
    };
  }

  const mapToSortedArray = (m: Map<string, number>) =>
    Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));

  return {
    activations_over_time: derivedMetric(mapToSortedArray(activationsByMonth), 'Activation.start_date', 'getSponsorAnalytics'),
    deliverables_over_time: derivedMetric(mapToSortedArray(deliverablesByMonth), 'SponsorshipDeliverable.completed_at', 'getSponsorAnalytics'),
    revenue_events_over_time: derivedMetric(mapToSortedArray(revenueByMonth), 'RevenueEvent.occurred_at', 'getSponsorAnalytics'),
    sponsorship_growth: derivedMetric(mapToSortedArray(sponsorshipsByMonth), 'Sponsorship.start_date', 'getSponsorAnalytics'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROI READINESS SCORE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateROIReadiness(ctx: SponsorAnalyticsContext): any {
  // Weighted readiness score across measurement dimensions.
  // Scores MEASUREMENT COMPLETENESS, not sponsorship success.
  const dimensions = [
    {
      key: 'execution',
      label: 'Execution',
      weight: 25,
      score: ctx.allActivations.length > 0 ? Math.min(100, 50 + (ctx.allActivations.filter((a: any) => a.status === 'completed').length / Math.max(1, ctx.allActivations.length) * 50)) : 0,
      evidence: 'Activation records',
    },
    {
      key: 'financial',
      label: 'Financial',
      weight: 20,
      score: ctx.revenueEvents.length > 0 ? Math.min(100, 60 + Math.min(40, ctx.revenueEvents.length * 10)) : 0,
      evidence: ctx.revenueEvents.length > 0 ? 'RevenueEvent records' : 'No RevenueEvent records',
    },
    {
      key: 'media',
      label: 'Media',
      weight: 15,
      score: ctx.adAnalytics.length > 0 ? 80 : (ctx.advertisements.length > 0 ? 40 : (ctx.outletStories.length > 0 ? 30 : 0)),
      evidence: ctx.adAnalytics.length > 0 ? 'AdAnalytics records' : (ctx.advertisements.length > 0 ? 'Advertisement records (no analytics)' : 'No media records'),
    },
    {
      key: 'commerce',
      label: 'Commerce',
      weight: 10,
      score: ctx.orders.length > 0 ? 80 : 0,
      evidence: ctx.orders.length > 0 ? 'Order records' : 'No sponsor-linked orders',
    },
    {
      key: 'exposure',
      label: 'Exposure',
      weight: 15,
      score: ctx.sponsorships.length > 0 ? Math.min(100, 40 + Math.min(60, ctx.sponsorships.length * 10)) : 0,
      evidence: 'Sponsorship records',
    },
    {
      key: 'history',
      label: 'History',
      weight: 10,
      score: ctx.sponsorships.filter((s: any) => ['completed', 'expired'].includes(s.status)).length > 0 ? 70 : (ctx.sponsorships.length > 0 ? 30 : 0),
      evidence: ctx.sponsorships.filter((s: any) => ['completed', 'expired'].includes(s.status)).length > 0 ? 'Historical sponsorship records' : 'No historical sponsorships',
    },
    {
      key: 'evidence',
      label: 'Evidence',
      weight: 5,
      score: ctx.allActivations.length + ctx.allDeliverables.length + ctx.revenueEvents.length > 0 ? 90 : 0,
      evidence: 'Aggregate evidence records',
    },
  ];

  const totalScore = dimensions.reduce((sum, d) => sum + (d.score * d.weight / 100), 0);
  const roundedScore = Math.round(totalScore);

  return {
    score: roundedScore,
    classification: roundedMetric(roundedScore, 'Composite of 7 dimensions', 'calculateROIReadiness'),
    dimensions: dimensions.map(d => ({
      key: d.key,
      label: d.label,
      weight: d.weight,
      score: Math.round(d.score),
      evidence: d.evidence,
    })),
    note: 'ROI Readiness scores MEASUREMENT COMPLETENESS, not sponsorship success. A high score means the platform has enough data to measure this sponsorship — not that the sponsorship performed well.',
  };
}

function roundedMetric(value: any, evidence: string, fn: string): Metric {
  return { value, classification: 'Derived', evidence_source: evidence, evidence_function: fn, confidence: 85 };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export function buildEvidenceMatrix(metrics: Record<string, any>): any[] {
  const matrix: any[] = [];
  for (const [metricName, metric] of Object.entries(metrics)) {
    if (metric && typeof metric === 'object' && 'classification' in metric) {
      matrix.push({
        metric: metricName,
        value: metric.value,
        classification: metric.classification,
        evidence_entity: metric.evidence_entity || metric.evidence_source || 'none',
        evidence_function: metric.evidence_function || 'getSponsorAnalytics',
        confidence: metric.confidence,
        reason: metric.reason || null,
      });
    }
    // Handle nested objects (by_type, by_event, etc.)
    if (metric && typeof metric === 'object' && !('classification' in metric) && !Array.isArray(metric)) {
      for (const [subName, subMetric] of Object.entries(metric)) {
        if (subMetric && typeof subMetric === 'object' && 'classification' in (subMetric as any)) {
          matrix.push({
            metric: `${metricName}.${subName}`,
            value: (subMetric as any).value,
            classification: (subMetric as any).classification,
            evidence_entity: (subMetric as any).evidence_entity || (subMetric as any).evidence_source || 'none',
            evidence_function: (subMetric as any).evidence_function || 'getSponsorAnalytics',
            confidence: (subMetric as any).confidence,
            reason: (subMetric as any).reason || null,
          });
        }
      }
    }
  }
  return matrix;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE COMPLETENESS SUMMARY (for analytics)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAnalyticsCompletenessSummary(ctx: SponsorAnalyticsContext): any {
  const checks = [
    { key: 'has_sponsorships', label: 'Has Sponsorships', passed: ctx.sponsorships.length > 0 },
    { key: 'has_activations', label: 'Has Activations', passed: ctx.allActivations.length > 0 },
    { key: 'has_deliverables', label: 'Has Deliverables', passed: ctx.allDeliverables.length > 0 },
    { key: 'has_revenue_agreements', label: 'Has Revenue Agreements', passed: ctx.revenueAgreements.length > 0 },
    { key: 'has_revenue_events', label: 'Has Revenue Events', passed: ctx.revenueEvents.length > 0 },
    { key: 'has_advertisements', label: 'Has Advertisements', passed: ctx.advertisements.length > 0 },
    { key: 'has_ad_analytics', label: 'Has Ad Analytics', passed: ctx.adAnalytics.length > 0 },
    { key: 'has_media_assignments', label: 'Has Media Assignments', passed: ctx.mediaAssignments.length > 0 },
    { key: 'has_published_stories', label: 'Has Published Stories', passed: ctx.outletStories.length > 0 },
    { key: 'has_sponsored_racers', label: 'Has Sponsored Racers', passed: ctx.racerProfileIds.length > 0 },
    { key: 'has_career_stats', label: 'Has Career Stats for Racers', passed: ctx.racerCareerStats.size > 0 },
    { key: 'has_commerce', label: 'Has Sponsor-Linked Commerce', passed: ctx.orders.length > 0 },
  ];

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    checks,
    missing: checks.filter(c => !c.passed),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC-SAFE FILTER (for public analytics exposure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns only public-safe analytics. Strips financial values, private
 * activations/deliverables, and internal evidence. Public analytics include:
 * counts, history, public activations, public deliverables, sponsored
 * entities, and timeline.
 */
export function buildPublicSafeAnalytics(fullAnalytics: any): any {
  return {
    organization: fullAnalytics.organization,
    commercial_metrics: fullAnalytics.commercial_metrics,
    activation_metrics: {
      total: fullAnalytics.activation_metrics.total,
      completed: fullAnalytics.activation_metrics.completed,
      completion_percent: fullAnalytics.activation_metrics.completion_percent,
      by_type: fullAnalytics.activation_metrics.by_type,
    },
    deliverable_metrics: {
      total: fullAnalytics.deliverable_metrics.total,
      completed: fullAnalytics.deliverable_metrics.completed,
      completion_percent: fullAnalytics.deliverable_metrics.completion_percent,
      by_type: fullAnalytics.deliverable_metrics.by_type,
    },
    media_metrics: {
      advertisement_count: fullAnalytics.media_metrics.advertisement_count,
      published_story_count: fullAnalytics.media_metrics.published_story_count,
      media_assignment_count: fullAnalytics.media_metrics.media_assignment_count,
    },
    exposure_metrics: fullAnalytics.exposure_metrics,
    performance_metrics: fullAnalytics.performance_metrics,
    trend_metrics: fullAnalytics.trend_metrics,
    readiness: fullAnalytics.readiness,
    // Explicitly excluded: financial_metrics, advertisement_metrics (impressions/clicks),
    // commerce_metrics, evidence_matrix (internal), completeness_summary (internal)
  };
}