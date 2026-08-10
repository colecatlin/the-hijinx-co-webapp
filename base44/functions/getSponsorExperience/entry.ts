/**
 * getSponsorExperience
 * Phase 17E — Read-only function that computes the complete public Sponsor
 * experience. Returns one structured payload containing all data needed for
 * the definitive public Sponsor profile.
 *
 * Read-only — never creates or modifies Sponsor/Organization state.
 * No financial values are exposed. No commercial writes occur.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  isSponsorPublic,
  loadSponsorContext,
  buildPublicSponsorFields,
  buildSponsorTimeline,
  buildSponsorStatistics,
  buildSponsorCommercialSummary,
  buildSponsorMediaSummary,
  buildSponsorActivationSummary,
  buildSponsorCompleteness,
  buildSponsorSEO,
  buildSponsorStructuredData,
  buildSponsorSharingMetadata,
} from '../../shared/sponsorExperienceHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, organization_id, allow_draft = false } = body;

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

    // Must be a Sponsor type
    if (organization.type !== 'Sponsor') {
      return Response.json({ error: 'Organization is not a sponsor type' }, { status: 404 });
    }

    // Visibility check
    if (!isSponsorPublic(organization) && !allow_draft) {
      return Response.json({ error: 'Sponsor not found' }, { status: 404 });
    }

    // Load complete context
    const ctx = await loadSponsorContext(base44, organization);

    // Build composite payload
    const publicFields = buildPublicSponsorFields(organization, ctx.settings);
    const statistics = buildSponsorStatistics(ctx);
    const timeline = buildSponsorTimeline(ctx);
    const commercialSummary = buildSponsorCommercialSummary(ctx);
    const mediaSummary = buildSponsorMediaSummary(ctx);
    const activationSummary = buildSponsorActivationSummary(ctx);
    const completeness = buildSponsorCompleteness(organization, ctx.settings, ctx);
    const seo = buildSponsorSEO(organization, ctx.settings, statistics);
    const structuredData = buildSponsorStructuredData(organization, ctx.settings);
    const sharing = buildSponsorSharingMetadata(organization, seo);

    // Resolve target entity summaries for sponsorships
    const sponsoredRacers = resolveTargetSummaries(ctx, 'RacerProfile');
    const sponsoredTeams = resolveTargetSummaries(ctx, 'Team');
    const sponsoredVehicles = resolveTargetSummaries(ctx, 'Vehicle');
    const sponsoredSeries = resolveTargetSummaries(ctx, 'Series');
    const sponsoredEvents = resolveTargetSummaries(ctx, 'Event');
    const sponsoredTracks = resolveTargetSummaries(ctx, 'Track');
    const sponsoredMedia = resolveTargetSummaries(ctx, 'MediaAsset');

    return Response.json({
      organization: publicFields,
      settings: ctx.settings ? {
        verification_status: ctx.settings.verification_status,
        visibility: ctx.settings.visibility,
        tagline: ctx.settings.tagline || null,
      } : null,
      assets: ctx.assets.filter((a: any) => a.is_public !== false).map((a: any) => ({
        id: a.id,
        asset_type: a.asset_type,
        name: a.name,
        description: a.description || null,
        image_url: a.image_url || null,
        status: a.status,
      })),
      sponsorships: {
        active: ctx.sponsorships.filter((s: any) => s.status === 'active'),
        historical: ctx.sponsorships.filter((s: any) => ['completed', 'expired'].includes(s.status)),
        all: ctx.sponsorships,
      },
      sponsored_racers: sponsoredRacers,
      sponsored_teams: sponsoredTeams,
      sponsored_vehicles: sponsoredVehicles,
      sponsored_series: sponsoredSeries,
      sponsored_events: sponsoredEvents,
      sponsored_tracks: sponsoredTracks,
      sponsored_media: sponsoredMedia,
      activations: activationSummary,
      timeline,
      statistics,
      commercial_summary: commercialSummary,
      media_summary: mediaSummary,
      completeness,
      seo,
      structured_data: structuredData,
      sharing,
      aliases: ctx.aliases.map((a: any) => ({
        alias_name: a.alias_name,
        alias_type: a.alias_type,
      })),
    });
  } catch (err) {
    console.error('[getSponsorExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function resolveTargetSummaries(ctx: any, targetType: string): any[] {
  const seen = new Map<string, any>();
  ctx.sponsorships.forEach((s: any) => {
    if (s.target_entity_type !== targetType) return;
    if (!s.target_entity_id) return;
    if (seen.has(s.target_entity_id)) return;
    const entity = ctx.targetEntities.get(`${targetType}:${s.target_entity_id}`);
    if (!entity) return;
    seen.set(s.target_entity_id, buildTargetSummary(entity, targetType, s));
  });
  return Array.from(seen.values());
}

function buildTargetSummary(entity: any, targetType: string, sponsorship: any): any {
  const base: any = {
    id: entity.id,
    sponsorship_id: sponsorship.sponsorship_id,
    relationship_type: sponsorship.relationship_type,
    tier: sponsorship.tier,
    campaign_name: sponsorship.campaign_name,
    status: sponsorship.status,
    start_date: sponsorship.start_date,
    end_date: sponsorship.end_date,
    season_year: sponsorship.season_year,
  };

  switch (targetType) {
    case 'RacerProfile':
      return {
        ...base,
        display_name: entity.display_name,
        slug: entity.slug || entity.canonical_slug || null,
        hometown_city: entity.hometown_city || null,
        hometown_state: entity.hometown_state || null,
        profile_image_url: entity.profile_image_url || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/racers/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'Team':
      return {
        ...base,
        name: entity.name,
        slug: entity.slug || entity.canonical_slug || null,
        logo_url: entity.logo_url || null,
        primary_discipline: entity.primary_discipline || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/teams/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'Vehicle':
      return {
        ...base,
        nickname: entity.nickname,
        slug: entity.slug || entity.canonical_slug || null,
        manufacturer: entity.manufacturer || null,
        model: entity.model || null,
        profile_image_url: entity.profile_image_url || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/vehicles/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'Series':
      return {
        ...base,
        name: entity.name,
        slug: entity.slug || entity.canonical_slug || null,
        logo_url: entity.logo_url || null,
        discipline: entity.discipline || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/series/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'Event':
      return {
        ...base,
        name: entity.name,
        slug: entity.slug || entity.canonical_slug || null,
        event_date: entity.event_date || null,
        event_logo_url: entity.event_logo_url || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/events/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'Track':
      return {
        ...base,
        name: entity.name,
        slug: entity.slug || entity.canonical_slug || null,
        logo_url: entity.logo_url || null,
        location_city: entity.location_city || null,
        location_country: entity.location_country || null,
        profile_url: (entity.slug || entity.canonical_slug) ? `/tracks/${entity.slug || entity.canonical_slug}` : null,
      };
    case 'MediaAsset':
      return {
        ...base,
        title: entity.title,
        asset_type: entity.asset_type || null,
        file_url: entity.file_url || null,
        profile_url: `/media/${entity.id}`,
      };
    default:
      return { ...base, name: entity.name || entity.title || 'Unknown' };
  }
}