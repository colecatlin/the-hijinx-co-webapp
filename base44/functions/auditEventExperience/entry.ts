/**
 * auditEventExperience
 * Phase 13 — Read-only integrity audit for the public Event experience.
 * Validates all relationships, references, and public visibility rules.
 * Never repairs automatically — returns counts, internal IDs, and issue categories.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function resolveEvent(base44, slug, event_id) {
  if (slug) {
    let list = await base44.asServiceRole.entities.Event.filter({ slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    list = await base44.asServiceRole.entities.Event.filter({ canonical_slug: slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    return null;
  }
  if (event_id) return await base44.asServiceRole.entities.Event.get(event_id).catch(() => null);
  return null;
}

function isEventPublic(event) {
  if (!event) return false;
  if (event.is_archived) return false;
  if (event.publish_ready === false) return false;
  return ['Published', 'Live', 'Completed'].includes(event.status);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, event_id, allow_draft = false } = body;
    if (!slug && !event_id) return Response.json({ error: 'slug or event_id is required' }, { status: 400 });

    const event = await resolveEvent(base44, slug, event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const issues = [];
    let isComplete = true;

    // 1. Slug validation
    if (!event.slug && !event.canonical_slug) {
      issues.push({ category: 'slug', severity: 'warning', message: 'Event has no slug or canonical_slug for public routing', event_id: event.id });
    }

    // 2. Missing Series
    if (event.series_id) {
      const series = await base44.asServiceRole.entities.Series.get(event.series_id).catch(() => null);
      if (!series) {
        issues.push({ category: 'missing_series', severity: 'error', message: 'Series reference is broken', event_id: event.id, series_id: event.series_id });
        isComplete = false;
      }
    }

    // 3. Missing Track
    if (event.track_id) {
      const track = await base44.asServiceRole.entities.Track.get(event.track_id).catch(() => null);
      if (!track) {
        issues.push({ category: 'missing_track', severity: 'error', message: 'Track reference is broken', event_id: event.id, track_id: event.track_id });
        isComplete = false;
      }
    } else if (!event.location_note) {
      issues.push({ category: 'missing_track', severity: 'warning', message: 'Event has no track or location note', event_id: event.id });
    }

    // 4. Invalid season
    if (!event.season) {
      issues.push({ category: 'invalid_season', severity: 'warning', message: 'Event has no season year', event_id: event.id });
    }

    // 5. Broken EventClass relationships
    const eventClasses = await base44.asServiceRole.entities.EventClass.filter({ event_id: event.id }).catch(() => []);
    const eventClassIds = new Set(eventClasses.map(ec => ec.id));
    const brokenClasses = eventClasses.filter(ec => ec.event_id !== event.id);
    if (brokenClasses.length > 0) {
      issues.push({ category: 'broken_event_class', severity: 'error', message: `${brokenClasses.length} EventClass records have mismatched event_id`, event_id: event.id, class_ids: brokenClasses.map(c => c.id) });
      isComplete = false;
    }

    // 6. Broken Session relationships
    const sessions = await base44.asServiceRole.entities.Session.filter({ event_id: event.id }).catch(() => []);
    const brokenSessions = sessions.filter(s => s.event_id !== event.id);
    if (brokenSessions.length > 0) {
      issues.push({ category: 'broken_session', severity: 'error', message: `${brokenSessions.length} Session records have mismatched event_id`, event_id: event.id, session_ids: brokenSessions.map(s => s.id) });
      isComplete = false;
    }
    // Check sessions referencing non-existent EventClasses
    const orphanedClassSessions = sessions.filter(s => s.event_class_id && !eventClassIds.has(s.event_class_id));
    if (orphanedClassSessions.length > 0) {
      issues.push({ category: 'broken_session', severity: 'warning', message: `${orphanedClassSessions.length} sessions reference non-existent EventClass`, event_id: event.id, session_ids: orphanedClassSessions.map(s => s.id) });
    }

    // 7. Broken Entries
    const entries = await base44.asServiceRole.entities.Entry.filter({ event_id: event.id }).catch(() => []);
    const brokenEntries = entries.filter(e => e.event_id !== event.id);
    if (brokenEntries.length > 0) {
      issues.push({ category: 'broken_entry', severity: 'error', message: `${brokenEntries.length} Entry records have mismatched event_id`, event_id: event.id, entry_ids: brokenEntries.map(e => e.id) });
      isComplete = false;
    }

    // 8. Broken RacerProfile relationships
    const driverIds = [...new Set(entries.map(e => e.driver_id).filter(Boolean))];
    if (driverIds.length > 0) {
      const allRacerProfiles = await base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []);
      const rpByLegacy = new Map();
      allRacerProfiles.forEach(rp => { if (rp.legacy_driver_id) rpByLegacy.set(rp.legacy_driver_id, rp); });
      const missingRacerProfiles = driverIds.filter(did => !rpByLegacy.has(did));
      if (missingRacerProfiles.length > 0) {
        issues.push({ category: 'broken_racer_profile', severity: 'warning', message: `${missingRacerProfiles.length} entries have drivers without RacerProfile`, event_id: event.id, driver_ids: missingRacerProfiles });
      }
    }

    // 9. Broken Team references
    const teamIds = [...new Set(entries.map(e => e.team_id).filter(Boolean))];
    if (teamIds.length > 0) {
      const allTeams = await base44.asServiceRole.entities.Team.list().catch(() => []);
      const teamMap = new Map(allTeams.map(t => [t.id, t]));
      const missingTeams = teamIds.filter(tid => !teamMap.has(tid));
      if (missingTeams.length > 0) {
        issues.push({ category: 'broken_team_ref', severity: 'warning', message: `${missingTeams.length} entries reference non-existent Teams`, event_id: event.id, team_ids: missingTeams });
      }
    }

    // 10. Broken Vehicle references
    const vehicleIds = [...new Set(entries.map(e => e.vehicle_id).filter(Boolean))];
    if (vehicleIds.length > 0) {
      const allVehicles = await base44.asServiceRole.entities.Vehicle.list().catch(() => []);
      const vehicleMap = new Map(allVehicles.map(v => [v.id, v]));
      const missingVehicles = vehicleIds.filter(vid => !vehicleMap.has(vid));
      if (missingVehicles.length > 0) {
        issues.push({ category: 'broken_vehicle_ref', severity: 'warning', message: `${missingVehicles.length} entries reference non-existent Vehicles`, event_id: event.id, vehicle_ids: missingVehicles });
      }
    }

    // 11. Broken Results
    const results = await base44.asServiceRole.entities.Results.filter({ event_id: event.id }).catch(() => []);
    const brokenResults = results.filter(r => r.event_id !== event.id);
    if (brokenResults.length > 0) {
      issues.push({ category: 'broken_results', severity: 'error', message: `${brokenResults.length} Results records have mismatched event_id`, event_id: event.id, result_ids: brokenResults.map(r => r.id) });
      isComplete = false;
    }
    // Check results referencing non-existent sessions
    const sessionIds = new Set(sessions.map(s => s.id));
    const orphanedResults = results.filter(r => r.session_id && !sessionIds.has(r.session_id));
    if (orphanedResults.length > 0) {
      issues.push({ category: 'broken_results', severity: 'warning', message: `${orphanedResults.length} results reference non-existent sessions`, event_id: event.id, result_ids: orphanedResults.map(r => r.id) });
    }

    // 12. Broken Standings links
    if (event.series_id && event.season) {
      const standings = await base44.asServiceRole.entities.Standings.filter({ series_id: event.series_id, season_year: event.season }).catch(() => []);
      if (standings.length === 0) {
        issues.push({ category: 'broken_standings', severity: 'info', message: 'No standings calculated for this series/season', event_id: event.id, series_id: event.series_id, season: event.season });
      }
    }

    // 13. Broken media
    if (event.event_cover_image_url === null && event.event_logo_url === null && !event.event_media_gallery?.length) {
      issues.push({ category: 'broken_media', severity: 'info', message: 'Event has no cover image, logo, or media gallery', event_id: event.id });
    }

    // 14. Broken sponsor references
    if (entries.length > 0) {
      const entrySponsors = await base44.asServiceRole.entities.EntrySponsor.list('-created_date', 200).catch(() => []);
      const entryIds = new Set(entries.map(e => e.id));
      const eventSponsors = entrySponsors.filter(es => entryIds.has(es.entry_id));
      if (eventSponsors.length === 0) {
        issues.push({ category: 'broken_sponsor', severity: 'info', message: 'No sponsors associated with event entries', event_id: event.id });
      }
    }

    // 15. Broken ticket/broadcast URLs
    if (!event.ticket_url) issues.push({ category: 'missing_ticket_url', severity: 'info', message: 'No ticket URL set', event_id: event.id });
    if (!event.broadcast_url) issues.push({ category: 'missing_broadcast_url', severity: 'info', message: 'No broadcast URL set', event_id: event.id });

    // 16. Broken SEO
    if (!event.description && !event.event_notes) {
      issues.push({ category: 'broken_seo', severity: 'warning', message: 'No description or event notes for SEO', event_id: event.id });
    }

    // 17. Duplicate public Event identities
    if (event.slug || event.canonical_slug) {
      const slugVal = event.slug || event.canonical_slug;
      const duplicates = await base44.asServiceRole.entities.Event.filter({ slug: slugVal }).catch(() => []);
      const canonicalDups = await base44.asServiceRole.entities.Event.filter({ canonical_slug: slugVal }).catch(() => []);
      const allDups = [...duplicates, ...canonicalDups].filter(e => e.id !== event.id);
      if (allDups.length > 0) {
        issues.push({ category: 'duplicate_identity', severity: 'error', message: `${allDups.length} other events share this slug`, event_id: event.id, duplicate_ids: allDups.map(e => e.id) });
        isComplete = false;
      }
    }

    // 18. Hidden/draft Event exposure
    if (!isEventPublic(event) && !allow_draft) {
      issues.push({ category: 'draft_exposure', severity: 'error', message: `Event is not public (status: ${event.status}) but audit was requested`, event_id: event.id });
    }

    // Summary counts
    const counts = {};
    issues.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return Response.json({
      event_id: event.id,
      event_name: event.name,
      is_public: isEventPublic(event),
      is_complete: isComplete && errorCount === 0,
      total_issues: issues.length,
      error_count: errorCount,
      warning_count: warningCount,
      info_count: infoCount,
      counts,
      issues,
    });
  } catch (err) {
    console.error('[auditEventExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}