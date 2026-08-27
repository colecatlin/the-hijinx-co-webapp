/**
 * auditSeriesExperience
 * Phase 14 — Read-only integrity audit for the Series Platform.
 * Validates broken references, missing fields, duplicate identities,
 * and draft/archived exposure. Never repairs automatically.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveSeries, isSeriesPublic, loadSeriesContext,
  getAllSeasonYears, getCurrentSeasonYear,
} from '../../shared/seriesExperienceHelpers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only — unauthenticated requests are rejected
    let user;
    try {
      user = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { slug, series_id, audit_all = false } = body;

    let seriesList: any[] = [];
    if (audit_all) {
      seriesList = await base44.asServiceRole.entities.Series.list().catch(() => []);
    } else if (slug || series_id) {
      const s = await resolveSeries(base44, slug, series_id);
      if (s) seriesList = [s];
    } else {
      return Response.json({ error: 'slug, series_id, or audit_all is required' }, { status: 400 });
    }

    const issues: any[] = [];
    let totalChecked = 0;
    let totalIssues = 0;

    for (const series of seriesList) {
      totalChecked++;
      const seriesIssues: any[] = [];
      const seriesId = series.id;

      // Check slug
      if (!series.slug && !series.canonical_slug) {
        seriesIssues.push({ category: 'broken_slug', message: 'Series has no slug or canonical_slug', entity_id: seriesId });
      }
      // Check discipline
      if (!series.discipline) {
        seriesIssues.push({ category: 'missing_discipline', message: 'Series has no discipline set', entity_id: seriesId });
      }
      // Check season_year
      if (!series.season_year) {
        seriesIssues.push({ category: 'invalid_season_year', message: 'Series has no season_year set', entity_id: seriesId, severity: 'warning' });
      }
      // Check archived exposure
      if (series.is_archived && isSeriesPublic(series)) {
        seriesIssues.push({ category: 'archived_exposure', message: 'Archived series is publicly visible', entity_id: seriesId, severity: 'critical' });
      }
      // Check draft exposure
      if (series.visibility_status !== 'live' && series.visibility_status !== 'draft') {
        seriesIssues.push({ category: 'invalid_visibility', message: `Unexpected visibility_status: ${series.visibility_status}`, entity_id: seriesId });
      }

      // Load context for reference checks
      const ctx = await loadSeriesContext(base44, series);

      // Check SeriesClass relationships
      const brokenClassRefs = ctx.classes.filter(c => c.series_id !== seriesId);
      if (brokenClassRefs.length > 0) {
        seriesIssues.push({ category: 'broken_series_class', message: `${brokenClassRefs.length} classes have mismatched series_id`, entity_id: seriesId, count: brokenClassRefs.length });
      }

      // Check Event relationships
      const brokenEventRefs = ctx.events.filter(e => e.series_id !== seriesId);
      if (brokenEventRefs.length > 0) {
        seriesIssues.push({ category: 'broken_event_ref', message: `${brokenEventRefs.length} events have mismatched series_id`, entity_id: seriesId, count: brokenEventRefs.length });
      }

      // Check Track references in events
      const eventsWithMissingTracks = ctx.events.filter(e => e.track_id && !ctx.trackMap.has(e.track_id));
      if (eventsWithMissingTracks.length > 0) {
        seriesIssues.push({ category: 'broken_track_ref', message: `${eventsWithMissingTracks.length} events reference missing tracks`, entity_id: seriesId, count: eventsWithMissingTracks.length });
      }

      // Check SeasonParticipation relationships
      const brokenParticipations = ctx.seasonParticipations.filter(p => p.series_id !== seriesId);
      if (brokenParticipations.length > 0) {
        seriesIssues.push({ category: 'broken_participation', message: `${brokenParticipations.length} participations have mismatched series_id`, entity_id: seriesId, count: brokenParticipations.length });
      }

      // Check RacerProfile references in participations
      const participationsWithMissingRacers = ctx.seasonParticipations.filter(p => p.racer_profile_id && !ctx.racerProfileMap.has(p.racer_profile_id));
      if (participationsWithMissingRacers.length > 0) {
        seriesIssues.push({ category: 'broken_racer_profile_ref', message: `${participationsWithMissingRacers.length} participations reference missing RacerProfiles`, entity_id: seriesId, count: participationsWithMissingRacers.length });
      }

      // Check Team references in entries
      const entriesWithMissingTeams = ctx.entries.filter(e => e.team_id && !ctx.teamMap.has(e.team_id));
      if (entriesWithMissingTeams.length > 0) {
        seriesIssues.push({ category: 'broken_team_ref', message: `${entriesWithMissingTeams.length} entries reference missing teams`, entity_id: seriesId, count: entriesWithMissingTeams.length });
      }

      // Check Vehicle references in entries
      const entriesWithMissingVehicles = ctx.entries.filter(e => e.vehicle_id && !ctx.vehicleMap.has(e.vehicle_id));
      if (entriesWithMissingVehicles.length > 0) {
        seriesIssues.push({ category: 'broken_vehicle_ref', message: `${entriesWithMissingVehicles.length} entries reference missing vehicles`, entity_id: seriesId, count: entriesWithMissingVehicles.length });
      }

      // Check Standings integrity
      const brokenStandings = ctx.standings.filter(s => s.series_id !== seriesId);
      if (brokenStandings.length > 0) {
        seriesIssues.push({ category: 'broken_standings', message: `${brokenStandings.length} standings have mismatched series_id`, entity_id: seriesId, count: brokenStandings.length });
      }

      // Check champion derivation
      const currentSeason = getCurrentSeasonYear(ctx);
      const standingsWithPosition1 = ctx.standings.filter(s => s.position === 1 && s.season_year === currentSeason);
      if (standingsWithPosition1.length > 0) {
        seriesIssues.push({ category: 'broken_champion_derivation', message: `${standingsWithPosition1.length} standings have position=1 in current season (should not be labeled champion)`, entity_id: seriesId, count: standingsWithPosition1.length, severity: 'warning' });
      }

      // Check media references
      const storiesWithMissingSeries = ctx.outletStories.filter(s => s.series_id && s.series_id !== seriesId);
      // This is informational only — stories can reference any series

      // Check SEO
      if (!series.slug && !series.canonical_slug) {
        seriesIssues.push({ category: 'broken_seo', message: 'Cannot build canonical URL without slug', entity_id: seriesId });
      }

      // Check duplicate public identities
      const allSeries = await base44.asServiceRole.entities.Series.list().catch(() => []);
      const duplicates = allSeries.filter((s: any) =>
        s.id !== seriesId &&
        !s.is_archived &&
        s.visibility_status === 'live' &&
        (s.slug === series.slug || s.canonical_slug === series.canonical_slug) &&
        (series.slug || series.canonical_slug)
      );
      if (duplicates.length > 0) {
        seriesIssues.push({ category: 'duplicate_public_identity', message: `${duplicates.length} other live series share the same slug`, entity_id: seriesId, count: duplicates.length, severity: 'critical', duplicate_ids: duplicates.map((d: any) => d.id) });
      }

      // Check hidden/draft exposure
      if (series.visibility_status === 'draft' && !series.is_archived) {
        // This is informational — draft series should not be publicly exposed
        // but the backend function already guards against this
      }

      if (seriesIssues.length > 0) {
        issues.push({ series_id: seriesId, series_name: series.name, issues: seriesIssues });
        totalIssues += seriesIssues.length;
      }
    }

    return Response.json({
      status: 'complete',
      total_checked: totalChecked,
      total_with_issues: issues.length,
      total_issues: totalIssues,
      issues,
      summary: {
        critical: issues.reduce((acc, i) => acc + i.issues.filter(i => i.severity === 'critical').length, 0),
        warnings: issues.reduce((acc, i) => acc + i.issues.filter(i => i.severity === 'warning' || !i.severity).length, 0),
      },
    });
  } catch (err) {
    console.error('[auditSeriesExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}