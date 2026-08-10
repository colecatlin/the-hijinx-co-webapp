/**
 * sponsorExperienceHelpers.ts
 *
 * Phase 17E — Shared read-only helpers for the public Sponsor experience.
 * All reusable logic for the Sponsor profile lives here — never duplicated
 * between the experience engine, audit, or frontend.
 *
 * Organization is the canonical sponsor identity. This module computes
 * everything from authoritative data: Organization, OrganizationSettings,
 * Sponsorship, Activation, SponsorshipDeliverable, Advertisement,
 * MediaAssignment, OrganizationAsset, and target entities.
 *
 * No financial values are exposed. No commercial writes occur.
 */

import {
  buildSponsorshipsForOrganization,
  isSponsorshipPublicActive,
  isSponsorshipPublicHistorical,
} from './sponsorshipReadHelpers.ts';

// ─────────────────────────────────────────────────────────────────────────────
// VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Sponsor Organization is publicly visible when:
 *   - It is not archived
 *   - visibility_status === 'live'
 *   - type === 'Sponsor'
 */
export function isSponsorPublic(organization: any, settings?: any): boolean {
  if (!organization) return false;
  if (organization.is_archived) return false;
  if (organization.type !== 'Sponsor') return false;
  // visibility_status on Organization, or settings.visibility overlay
  const vis = organization.visibility_status || settings?.visibility || 'draft';
  return vis === 'live' || vis === 'public';
}

/**
 * An Activation is public when public_visibility === 'public' and not archived.
 */
export function isActivationPublic(a: any): boolean {
  if (!a) return false;
  if (a.is_archived) return false;
  return a.public_visibility === 'public';
}

/**
 * A Deliverable is public when public_visibility === 'public' and not archived.
 */
export function isDeliverablePublic(d: any): boolean {
  if (!d) return false;
  if (d.is_archived) return false;
  return d.public_visibility === 'public';
}

/**
 * An Advertisement is public when status === 'published' and within date range.
 */
export function isAdvertisementPublic(ad: any): boolean {
  if (!ad) return false;
  if (ad.status === 'archived') return false;
  if (ad.status !== 'published') return false;
  const now = Date.now();
  if (ad.start_date && new Date(ad.start_date).getTime() > now) return false;
  if (ad.end_date && new Date(ad.end_date).getTime() < now) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT LOADING
// ─────────────────────────────────────────────────────────────────────────────

export interface SponsorContext {
  organization: any;
  settings: any | null;
  assets: any[];
  sponsorships: any[];      // PublicSponsorship[] (reverse relationship)
  activations: any[];       // raw Activation records (public only)
  deliverables: any[];      // raw SponsorshipDeliverable records (public only)
  advertisements: any[];     // Advertisement records linked to sponsorships
  mediaAssignments: any[];   // MediaAssignment records linked to sponsorships
  outletStories: any[];      // OutletStory records mentioning the sponsor
  aliases: any[];            // EntityAlias records for this Organization
  targetEntities: Map<string, any>;  // resolved target entities by "type:id"
  sponsorshipIds: Set<string>;       // modern sponsorship IDs
}

/**
 * Load the complete sponsor context in a minimal number of queries.
 * Avoids N+1 by batch-loading target entities.
 */
export async function loadSponsorContext(base44: any, organization: any): Promise<SponsorContext> {
  const orgId = organization.id;

  // Parallel independent loads
  const [settingsList, assets, aliases, sponsorshipResult] = await Promise.all([
    base44.asServiceRole.entities.OrganizationSettings.filter({
      settings_key: `Sponsor:${orgId}`,
    }).catch(() => []),
    base44.asServiceRole.entities.OrganizationAsset.filter({
      entity_type: 'Sponsor',
      entity_id: orgId,
    }).catch(() => []),
    base44.asServiceRole.entities.EntityAlias.filter({
      entity_type: 'Organization',
      entity_id: orgId,
      active: true,
    }).catch(() => []),
    buildSponsorshipsForOrganization(base44, orgId),
  ]);

  const settings = (settingsList && settingsList[0]) || null;
  const publicAssets = (assets as any[]).filter((a: any) => a.is_public !== false);
  const sponsorships = sponsorshipResult.all;
  const sponsorshipIds = new Set<string>(
    sponsorships.filter((s: any) => s.sponsorship_id).map((s: any) => s.sponsorship_id)
  );

  // Load activations + deliverables for these sponsorships
  const sidArray = Array.from(sponsorshipIds);
  const [allActivations, allDeliverables, allAds, allAssignments] = await Promise.all([
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
    sidArray.length > 0
      ? base44.asServiceRole.entities.Advertisement.filter({
          linked_sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
    sidArray.length > 0
      ? base44.asServiceRole.entities.MediaAssignment.filter({
          linked_sponsorship_id: { $in: sidArray },
        }).catch(() => [])
      : [],
  ]);

  const publicActivations = (allActivations as any[]).filter(isActivationPublic);
  const publicDeliverables = (allDeliverables as any[]).filter(isDeliverablePublic);
  const publicAds = (allAds as any[]).filter(isAdvertisementPublic);
  const publicAssignments = (allAssignments as any[]).filter((a: any) =>
    a.status === 'completed' || a.status === 'approved' || a.status === 'submitted'
  );

  // Batch-load target entities (group by type)
  const targetIdsByType = new Map<string, Set<string>>();
  sponsorships.forEach((s: any) => {
    if (!s.target_entity_type || !s.target_entity_id) return;
    if (s.target_entity_type === 'Platform') return; // sentinel, no entity to load
    if (!targetIdsByType.has(s.target_entity_type)) {
      targetIdsByType.set(s.target_entity_type, new Set());
    }
    targetIdsByType.get(s.target_entity_type)!.add(s.target_entity_id);
  });

  const targetEntities = new Map<string, any>();
  const entityNameMap: Record<string, string> = {
    RacerProfile: 'RacerProfile',
    Team: 'Team',
    Vehicle: 'Vehicle',
    Series: 'Series',
    Event: 'Event',
    Track: 'Track',
    MediaAsset: 'MediaAsset',
  };

  await Promise.all(
    Array.from(targetIdsByType.entries()).map(async ([type, ids]) => {
      const entityName = entityNameMap[type];
      if (!entityName) return;
      const idArray = Array.from(ids);
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({
          id: { $in: idArray },
        });
        (records as any[]).forEach((r: any) => {
          targetEntities.set(`${type}:${r.id}`, r);
        });
      } catch {
        // Entity type may not be accessible — skip silently
      }
    })
  );

  // Load outlet stories mentioning the sponsor (by tags or author)
  let outletStories: any[] = [];
  try {
    const orgNameLower = (organization.name || '').toLowerCase();
    if (orgNameLower) {
      const allStories = await base44.asServiceRole.entities.OutletStory.filter({
        status: 'published',
      }, '-published_date', 100);
      outletStories = (allStories as any[]).filter((s: any) =>
        s.tags?.some((t: string) => t.toLowerCase().includes(orgNameLower)) ||
        (s.title || '').toLowerCase().includes(orgNameLower)
      ).slice(0, 20);
    }
  } catch {
    // Skip if inaccessible
  }

  return {
    organization,
    settings,
    assets: publicAssets,
    sponsorships,
    activations: publicActivations,
    deliverables: publicDeliverables,
    advertisements: publicAds,
    mediaAssignments: publicAssignments,
    outletStories,
    aliases: aliases as any[],
    targetEntities,
    sponsorshipIds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC FIELDS
// ─────────────────────────────────────────────────────────────────────────────

export function buildPublicSponsorFields(org: any, settings: any): any {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug || org.canonical_slug || null,
    type: org.type,
    description: org.description || null,
    tagline: settings?.tagline || org.tagline || null,
    website_url: settings?.website_url || org.website_url || null,
    logo_url: org.logo_url || null,
    banner_url: settings?.banner_url || org.banner_url || null,
    primary_color: settings?.primary_color || org.primary_color || null,
    secondary_color: settings?.secondary_color || org.secondary_color || null,
    industry: org.industry || null,
    location_city: org.location_city || null,
    location_state: org.location_state || null,
    location_country: org.location_country || null,
    contact_email: settings?.contact_email || org.contact_email || null,
    contact_phone: settings?.contact_phone || org.contact_phone || null,
    social_instagram: settings?.social_instagram || null,
    social_x: settings?.social_x || null,
    social_facebook: settings?.social_facebook || null,
    social_youtube: settings?.social_youtube || null,
    social_linkedin: settings?.social_linkedin || null,
    social_tiktok: settings?.social_tiktok || null,
    verification_status: settings?.verification_status || 'unverified',
    visibility_status: org.visibility_status || 'draft',
    operational_status: org.operational_status || 'Active',
    normalized_name: org.normalized_name || null,
    canonical_slug: org.canonical_slug || null,
    created_date: org.created_date || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorTimeline(ctx: SponsorContext): any[] {
  const events: any[] = [];

  // Organization creation
  if (ctx.organization.created_date) {
    events.push({
      type: 'creation',
      date: ctx.organization.created_date,
      title: `${ctx.organization.name} joined the platform`,
      description: 'Sponsor profile established on HIJINX',
      priority: 100,
    });
  }

  // Sponsorship starts and completions
  ctx.sponsorships.forEach((s: any) => {
    if (s.start_date) {
      events.push({
        type: 'sponsorship_start',
        date: s.start_date,
        title: `Partnership began: ${s.target_entity_type}`,
        description: s.campaign_name || `${s.relationship_type || 'Sponsorship'} of ${s.target_entity_type}`,
        metadata: { sponsorship_id: s.sponsorship_id, target_type: s.target_entity_type },
        priority: 80,
      });
    }
    if (s.end_date && s.status === 'completed') {
      events.push({
        type: 'sponsorship_completion',
        date: s.end_date,
        title: `Partnership completed: ${s.target_entity_type}`,
        description: s.campaign_name || `${s.relationship_type || 'Sponsorship'} concluded`,
        metadata: { sponsorship_id: s.sponsorship_id, target_type: s.target_entity_type },
        priority: 70,
      });
    }
  });

  // Public activations
  ctx.activations.forEach((a: any) => {
    if (a.start_date) {
      events.push({
        type: 'activation',
        date: a.start_date,
        title: a.title,
        description: a.description || `${a.activation_type} activation`,
        metadata: { activation_id: a.id, activation_type: a.activation_type },
        priority: 60,
      });
    }
    if (a.status === 'completed' && a.end_date) {
      events.push({
        type: 'activation_completed',
        date: a.end_date,
        title: `Completed: ${a.title}`,
        description: a.description || `${a.activation_type} activation completed`,
        metadata: { activation_id: a.id },
        priority: 65,
      });
    }
  });

  // Public deliverables completed
  ctx.deliverables.forEach((d: any) => {
    if (d.completed_at) {
      events.push({
        type: 'deliverable_completed',
        date: d.completed_at,
        title: `Delivered: ${d.title}`,
        description: d.description || `${d.deliverable_type} completed`,
        metadata: { deliverable_id: d.id, deliverable_type: d.deliverable_type },
        priority: 55,
      });
    }
  });

  // Published advertisements
  ctx.advertisements.forEach((ad: any) => {
    if (ad.start_date || ad.created_date) {
      events.push({
        type: 'advertisement',
        date: ad.start_date || ad.created_date,
        title: ad.title,
        description: ad.tagline || 'Advertisement published',
        metadata: { advertisement_id: ad.id },
        priority: 40,
      });
    }
  });

  // Published stories
  ctx.outletStories.forEach((story: any) => {
    events.push({
      type: 'media',
      date: story.published_date || story.created_date,
      title: story.title,
      description: story.subtitle || 'Story published',
      metadata: { story_slug: story.slug, story_id: story.id },
      priority: 35,
    });
  });

  // Sort chronologically (most recent first), do not fabricate dates
  events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events.slice(0, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorStatistics(ctx: SponsorContext): any {
  const activeSponsorships = ctx.sponsorships.filter((s: any) => s.status === 'active');
  const historicalSponsorships = ctx.sponsorships.filter((s: any) =>
    ['completed', 'expired'].includes(s.status)
  );

  // Count target entities by type (current = active sponsorships)
  const currentByType = new Map<string, Set<string>>();
  activeSponsorships.forEach((s: any) => {
    if (!s.target_entity_type) return;
    if (!currentByType.has(s.target_entity_type)) {
      currentByType.set(s.target_entity_type, new Set());
    }
    if (s.target_entity_id) {
      currentByType.get(s.target_entity_type)!.add(s.target_entity_id);
    }
  });

  const completedActivations = ctx.activations.filter((a: any) => a.status === 'completed');
  const completedDeliverables = ctx.deliverables.filter((d: any) => d.status === 'completed');

  return {
    active_sponsorships: activeSponsorships.length,
    historical_sponsorships: historicalSponsorships.length,
    total_sponsorships: ctx.sponsorships.length,
    current_racers: (currentByType.get('RacerProfile') || new Set()).size,
    current_teams: (currentByType.get('Team') || new Set()).size,
    current_vehicles: (currentByType.get('Vehicle') || new Set()).size,
    current_series: (currentByType.get('Series') || new Set()).size,
    current_events: (currentByType.get('Event') || new Set()).size,
    current_tracks: (currentByType.get('Track') || new Set()).size,
    current_media: (currentByType.get('MediaAsset') || new Set()).size,
    total_activations: ctx.activations.length,
    completed_activations: completedActivations.length,
    activation_completion_percent: ctx.activations.length > 0
      ? Math.round((completedActivations.length / ctx.activations.length) * 100)
      : 0,
    total_deliverables: ctx.deliverables.length,
    deliverables_completed: completedDeliverables.length,
    public_media_count: ctx.outletStories.length,
    advertisement_count: ctx.advertisements.length,
    asset_count: ctx.assets.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL SUMMARY (no financial values)
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorCommercialSummary(ctx: SponsorContext): any {
  const industries = new Set<string>();
  const categories = new Set<string>();
  const relationshipTypes = new Set<string>();
  const tiers = new Set<string>();
  const campaigns: any[] = [];

  ctx.sponsorships.forEach((s: any) => {
    if (s.category) categories.add(s.category);
    if (s.relationship_type) relationshipTypes.add(s.relationship_type);
    if (s.tier) tiers.add(s.tier);
    if (s.campaign_name) {
      campaigns.push({
        name: s.campaign_name,
        status: s.status,
        target_type: s.target_entity_type,
        season_year: s.season_year,
      });
    }
  });

  if (ctx.organization.industry) industries.add(ctx.organization.industry);

  const primaryRelationship = ctx.sponsorships
    .filter((s: any) => s.status === 'active')
    .reduce((max: any, s: any) => {
      const priority = s.tier === 'Title' ? 5 : s.tier === 'Presenting' ? 4 : s.tier === 'Primary' ? 3 : 2;
      return priority > (max?.priority || 0) ? { ...s, priority } : max;
    }, null);

  return {
    industries: Array.from(industries),
    categories: Array.from(categories),
    relationship_types: Array.from(relationshipTypes),
    tiers: Array.from(tiers),
    primary_relationship: primaryRelationship
      ? {
          target_entity_type: primaryRelationship.target_entity_type,
          relationship_type: primaryRelationship.relationship_type,
          tier: primaryRelationship.tier,
          campaign_name: primaryRelationship.campaign_name,
        }
      : null,
    current_campaigns: campaigns.filter((c) => c.status === 'active'),
    historical_campaigns: campaigns.filter((c) => c.status !== 'active'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorMediaSummary(ctx: SponsorContext): any {
  return {
    media_assignments: ctx.mediaAssignments.map((a: any) => ({
      id: a.id,
      assignment_title: a.assignment_title,
      assignment_type: a.assignment_type,
      status: a.status,
      due_date: a.due_date,
    })),
    advertisements: ctx.advertisements.map((ad: any) => ({
      id: ad.id,
      title: ad.title,
      tagline: ad.tagline,
      cover_image_url: ad.cover_image_url,
      call_to_action_text: ad.call_to_action_text,
      call_to_action_url: ad.call_to_action_url,
    })),
    outlet_stories: ctx.outletStories.map((s: any) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      subtitle: s.subtitle,
      primary_category: s.primary_category,
      published_date: s.published_date,
      cover_image_url: s.cover_image_url,
      author: s.author,
    })),
    story_count: ctx.outletStories.length,
    assignment_count: ctx.mediaAssignments.length,
    advertisement_count: ctx.advertisements.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorActivationSummary(ctx: SponsorContext): any {
  const byType = new Map<string, number>();
  ctx.activations.forEach((a: any) => {
    byType.set(a.activation_type, (byType.get(a.activation_type) || 0) + 1);
  });

  return {
    current_activations: ctx.activations
      .filter((a: any) => ['planned', 'approved', 'active'].includes(a.status))
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        activation_type: a.activation_type,
        status: a.status,
        start_date: a.start_date,
        end_date: a.end_date,
        location: a.location || null,
        linked_event_id: a.linked_event_id || null,
        linked_track_id: a.linked_track_id || null,
        description: a.description || null,
        estimated_reach: a.estimated_reach || null,
        actual_reach: a.actual_reach || null,
      })),
    completed_activations: ctx.activations
      .filter((a: any) => a.status === 'completed')
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        activation_type: a.activation_type,
        start_date: a.start_date,
        end_date: a.end_date,
        location: a.location || null,
        description: a.description || null,
      })),
    public_deliverables: ctx.deliverables.map((d: any) => ({
      id: d.id,
      title: d.title,
      deliverable_type: d.deliverable_type,
      status: d.status,
      due_date: d.due_date,
      completed_at: d.completed_at,
      quantity_required: d.quantity_required,
      quantity_completed: d.quantity_completed,
      linked_event_id: d.linked_event_id || null,
      linked_media_id: d.linked_media_id || null,
      description: d.description || null,
    })),
    activations_by_type: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorCompleteness(org: any, settings: any, ctx: SponsorContext): any {
  const checks = [
    { key: 'logo', label: 'Logo', passed: Boolean(org.logo_url) },
    { key: 'banner', label: 'Banner', passed: Boolean(settings?.banner_url || org.banner_url) },
    { key: 'description', label: 'Description', passed: Boolean(org.description) },
    { key: 'website', label: 'Website', passed: Boolean(settings?.website_url || org.website_url) },
    { key: 'socials', label: 'Social Links', passed: Boolean(
      settings?.social_instagram || settings?.social_x || settings?.social_facebook ||
      settings?.social_youtube || settings?.social_linkedin || settings?.social_tiktok
    )},
    { key: 'location', label: 'Location', passed: Boolean(org.location_city || org.location_country) },
    { key: 'settings', label: 'Organization Settings', passed: Boolean(settings) },
    { key: 'active_sponsorship', label: 'Active Sponsorship', passed: ctx.sponsorships.some((s: any) => s.status === 'active') },
    { key: 'public_assets', label: 'Public Assets', passed: ctx.assets.length > 0 },
    { key: 'industry', label: 'Industry', passed: Boolean(org.industry) },
    { key: 'tagline', label: 'Tagline', passed: Boolean(settings?.tagline || org.tagline) },
    { key: 'slug', label: 'Slug', passed: Boolean(org.slug || org.canonical_slug) },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const missing = checks.filter((c) => !c.passed);

  const recommendations: string[] = [];
  if (!checks.find((c) => c.key === 'logo')?.passed) recommendations.push('Add a logo to improve brand recognition.');
  if (!checks.find((c) => c.key === 'banner')?.passed) recommendations.push('Add a banner image for a stronger profile header.');
  if (!checks.find((c) => c.key === 'description')?.passed) recommendations.push('Write a description to tell your brand story.');
  if (!checks.find((c) => c.key === 'active_sponsorship')?.passed) recommendations.push('Create an active sponsorship to appear on partner profiles.');
  if (!checks.find((c) => c.key === 'industry')?.passed) recommendations.push('Set an industry classification for better discoverability.');

  return { score, checks, missing, recommendations };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorSEO(org: any, settings: any, statistics: any): any {
  const name = org.name || 'Sponsor';
  const title = `${name} — Sponsor Profile | HIJINX`;
  const description = org.description || settings?.tagline ||
    `${name}${org.industry ? ` — ${org.industry}` : ''}. ${statistics.active_sponsorships} active partnerships on HIJINX.`;
  const image = settings?.banner_url || org.logo_url || null;
  const slug = org.slug || org.canonical_slug;
  const url = slug ? `/organization/Sponsor/${slug}` : `/organization/Sponsor/${org.id}`;

  return {
    title,
    description,
    image,
    url,
    og_type: 'organization',
    twitter_card: 'summary_large_image',
    og_title: title,
    og_description: description,
    og_image: image,
    twitter_title: title,
    twitter_description: description,
    twitter_image: image,
    keywords: [
      name,
      org.industry,
      'motorsports sponsor',
      'racing sponsorship',
      'HIJINX',
    ].filter(Boolean).join(', '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED DATA (Schema.org)
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorStructuredData(org: any, settings: any): any {
  const data: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    description: org.description || undefined,
  };

  if (org.logo_url) data.logo = org.logo_url;
  if (settings?.website_url || org.website_url) data.url = settings?.website_url || org.website_url;
  if (settings?.contact_email || org.contact_email) data.email = settings?.contact_email || org.contact_email;
  if (settings?.contact_phone || org.contact_phone) data.telephone = settings?.contact_phone || org.contact_phone;
  if (org.location_city || org.location_country) {
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: org.location_city || undefined,
      addressRegion: org.location_state || undefined,
      addressCountry: org.location_country || undefined,
    };
  }
  const sameAs = [
    settings?.social_instagram ? `https://instagram.com/${settings.social_instagram.replace('@', '')}` : null,
    settings?.social_x ? `https://x.com/${settings.social_x.replace('@', '')}` : null,
    settings?.social_facebook,
    settings?.social_youtube,
    settings?.social_linkedin,
    settings?.social_tiktok,
  ].filter(Boolean);
  if (sameAs.length > 0) data.sameAs = sameAs;

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARING METADATA
// ─────────────────────────────────────────────────────────────────────────────

export function buildSponsorSharingMetadata(org: any, seo: any): any {
  return {
    share_url: seo.url,
    share_title: seo.title,
    share_description: seo.description,
    share_image: seo.image,
    copy_link_label: 'Copy Sponsor Link',
  };
}