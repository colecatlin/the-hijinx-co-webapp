/**
 * getAiDiscoveryDiagnostics — Phase 17B.3
 *
 * Lightweight diagnostics for the Management → Search & AI Discovery page.
 * Returns entity counts, relationship coverage, and canonical configuration
 * in a single call. This is NOT the full answerability audit — that runs
 * on explicit demand via runAnswerabilityAudit.
 *
 * Read-only — no writes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  const base44 = createClientFromRequest(req);

  const MAX = 500;

  const [events, seriesList, tracks, racerProfiles, teams, results, standings, stories] = await Promise.all([
    base44.asServiceRole.entities.Event.list('-event_date', MAX).catch(() => []),
    base44.asServiceRole.entities.Series.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.Track.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.Team.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', MAX).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-created_date', MAX).catch(() => []),
  ]);

  // ── Entity counts with lifecycle breakdown ────────────────────────────────
  const entityCounts = {
    racer_profiles: {
      total: racerProfiles.length,
      live: racerProfiles.filter((r: any) => r.visibility === 'live' && !r.is_archived).length,
      draft: racerProfiles.filter((r: any) => r.visibility === 'draft').length,
      archived: racerProfiles.filter((r: any) => r.is_archived).length,
    },
    teams: {
      total: teams.length,
      active: teams.filter((t: any) => t.racing_status === 'Active' || t.operational_status === 'Active').length,
    },
    series: {
      total: seriesList.length,
      live: seriesList.filter((s: any) => s.visibility_status === 'live' && !s.is_archived).length,
      draft: seriesList.filter((s: any) => s.visibility_status === 'draft').length,
      archived: seriesList.filter((s: any) => s.is_archived).length,
    },
    tracks: {
      total: tracks.length,
      live: tracks.filter((t: any) => t.visibility_status === 'live' && !t.is_archived).length,
      draft: tracks.filter((t: any) => t.visibility_status === 'draft').length,
      archived: tracks.filter((t: any) => t.is_archived).length,
    },
    events: {
      total: events.length,
      published: events.filter((e: any) => e.published_flag && !e.is_archived).length,
      draft: events.filter((e: any) => !e.published_flag && !e.is_archived).length,
      archived: events.filter((e: any) => e.is_archived).length,
    },
    results: { total: results.length },
    standings: { total: standings.length },
    outlet_stories: {
      total: stories.length,
      published: stories.filter((s: any) => s.status === 'published').length,
      draft: stories.filter((s: any) => s.status === 'draft').length,
      archived: stories.filter((s: any) => s.status === 'archived').length,
    },
  };

  // ── Relationship coverage ──────────────────────────────────────────────────
  const eventIds = new Set(events.map((e: any) => e.id));
  const seriesIds = new Set(seriesList.map((s: any) => s.id));
  const trackIds = new Set(tracks.map((t: any) => t.id));
  const racerIds = new Set(racerProfiles.map((r: any) => r.id));

  const relationshipCoverage = {
    events_with_track: {
      complete: events.filter((e: any) => e.track_id && trackIds.has(e.track_id)).length,
      total: events.length,
    },
    events_with_series: {
      complete: events.filter((e: any) => e.series_id && seriesIds.has(e.series_id)).length,
      total: events.length,
    },
    results_with_racer: {
      complete: results.filter((r: any) => r.driver_id && racerIds.has(r.driver_id)).length,
      total: results.length,
    },
    results_with_event: {
      complete: results.filter((r: any) => r.event_id && eventIds.has(r.event_id)).length,
      total: results.length,
    },
    racers_with_team: {
      complete: racerProfiles.filter((r: any) => r.team_id || r.current_team_id).length,
      total: racerProfiles.length,
    },
    standings_with_racer: {
      complete: standings.filter((s: any) => s.driver_id && racerIds.has(s.driver_id)).length,
      total: standings.length,
    },
    standings_with_series: {
      complete: standings.filter((s: any) => s.series_id && seriesIds.has(s.series_id)).length,
      total: standings.length,
    },
    standings_with_season: {
      complete: standings.filter((s: any) => s.season_year).length,
      total: standings.length,
    },
  };

  // ── Canonical config from SeoSettings ──────────────────────────────────────
  let canonicalConfig: any = { configured_base_url: null, source: 'fallback' };
  try {
    const seoSettings = await base44.asServiceRole.entities.SeoSettings.filter({ is_active: true }).catch(() => []);
    const active = (seoSettings as any[])[0];
    if (active?.published?.site?.canonical_base_url) {
      canonicalConfig = {
        configured_base_url: active.published.site.canonical_base_url,
        source: 'SeoSettings (published)',
      };
    } else if (active?.draft?.site?.canonical_base_url) {
      canonicalConfig = {
        configured_base_url: active.draft.site.canonical_base_url,
        source: 'SeoSettings (draft — not published)',
      };
    }
  } catch {}

  const legacyDomainFound = !!canonicalConfig.configured_base_url?.includes('hijinxco.com');

  return Response.json({
    entity_counts: entityCounts,
    relationship_coverage: relationshipCoverage,
    canonical: {
      ...canonicalConfig,
      fallback: 'https://hijinx.com',
      legacy_domain_found: legacyDomainFound,
    },
    computed_at: new Date().toISOString(),
  });
}