/**
 * getVehicleExperience
 * Phase 12 — Read-only function that computes the complete public Vehicle experience.
 * Mirrors getTeamExperience architecture. Everything generated from operational data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildSponsorshipsForTarget, normalizeEntrySponsorLegacy } from '../../shared/sponsorshipReadHelpers.ts';

async function resolveVehicle(base44, slug, vehicle_id) {
  if (slug) {
    const list = await base44.asServiceRole.entities.Vehicle.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (vehicle_id) {
    return await base44.asServiceRole.entities.Vehicle.get(vehicle_id).catch(() => null);
  }
  return null;
}

async function loadVehicleContext(base44, vehicle) {
  const vehicleId = vehicle.id;
  const [
    entries, results, standings, driverPrograms, entrySponsors,
    allDrivers, allRacerProfiles, allTeams, allSeries, allClasses,
    allEvents, allTracks, allSessions, driverMedia, outletStories,
  ] = await Promise.all([
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverProgram.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.Session.list().catch(() => []),
    base44.asServiceRole.entities.DriverMedia.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
  ]);

  const vehicleEntries = entries.filter(e => e.vehicle_id === vehicleId);
  const entryIds = new Set(vehicleEntries.map(e => e.id));
  const vehicleResults = results.filter(r => (r.entry_id && entryIds.has(r.entry_id)) || r.vehicle_id === vehicleId);
  const vehicleDriverIds = new Set(vehicleEntries.map(e => e.driver_id).filter(Boolean));
  const vehicleTeamIds = new Set(vehicleEntries.map(e => e.team_id).filter(Boolean));
  const vehicleStandings = standings.filter(s => vehicleDriverIds.has(s.driver_id));
  const vehicleEntrySponsors = entrySponsors.filter(es => entryIds.has(es.entry_id));

  const driverMap = new Map(); allDrivers.forEach(d => driverMap.set(d.id, d));
  const racerProfileMap = new Map(); allRacerProfiles.forEach(rp => { racerProfileMap.set(rp.id, rp); if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp); });
  const teamMap = new Map(); allTeams.forEach(t => teamMap.set(t.id, t));
  const seriesMap = new Map(); allSeries.forEach(s => seriesMap.set(s.id, s));
  const classMap = new Map(); allClasses.forEach(c => classMap.set(c.id, c));
  const eventMap = new Map(); allEvents.forEach(e => eventMap.set(e.id, e));
  const trackMap = new Map(); allTracks.forEach(t => trackMap.set(t.id, t));

  return {
    vehicle, entries, vehicleEntries, vehicleResults, vehicleStandings,
    driverPrograms, entrySponsors: vehicleEntrySponsors, driverMedia, outletStories,
    allDrivers, allRacerProfiles, allTeams, allSeries, allClasses, allEvents, allTracks,
    driverMap, racerProfileMap, teamMap, seriesMap, classMap, eventMap, trackMap,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, vehicle_id, allow_draft = false } = body;
    if (!slug && !vehicle_id) return Response.json({ error: "slug or vehicle_id is required" }, { status: 400 });

    const vehicle = await resolveVehicle(base44, slug, vehicle_id);
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    if (vehicle.visibility_status === "draft" && !allow_draft) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    if (vehicle.is_archived) return Response.json({ error: "Vehicle not found" }, { status: 404 });

    const ctx = await loadVehicleContext(base44, vehicle);
    const publicFields = buildPublicFields(vehicle);
    const history = buildHistory(ctx);
    const chassis = buildChassisHistory(vehicle, ctx);
    const engine = buildEngineHistory(vehicle, ctx);
    const timeline = buildTimeline(ctx, vehicle);
    const statistics = buildStatistics(ctx);
    const achievements = buildAchievements(ctx, statistics);
    const sponsors = buildSponsors(ctx);
    const media = buildMedia(ctx, vehicle);
    const profileCompleteness = buildProfileCompleteness(vehicle);
    const seo = buildSEO(vehicle, statistics, ctx);

    // Phase 17B: Unified sponsorship read (modern Sponsorship + legacy EntrySponsor fallback)
    const legacyEntrySponsors = ctx.entrySponsors.map(es => normalizeEntrySponsorLegacy(es));
    const sponsorshipResult = await buildSponsorshipsForTarget(base44, 'Vehicle', vehicle.id, {
      legacySponsors: legacyEntrySponsors,
    });

    return Response.json({
      vehicle: publicFields, history, chassis, engine, timeline,
      statistics, achievements, sponsors, media,
      sponsorships: sponsorshipResult.sponsorships,
      sponsorship_counts: { modern: sponsorshipResult.modern_count, legacy: sponsorshipResult.legacy_count, deduped: sponsorshipResult.deduped_count },
      profile_completeness: profileCompleteness, seo,
    });
  } catch (err) {
    console.error("[getVehicleExperience] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

function buildPublicFields(vehicle) {
  return {
    id: vehicle.id, nickname: vehicle.nickname || null, slug: vehicle.slug || null,
    vehicle_type: vehicle.vehicle_type || null, manufacturer: vehicle.manufacturer || null,
    model: vehicle.model || null, year: vehicle.year || null, build_year: vehicle.build_year || null,
    vin_last4: vehicle.vin_last4 || null, number_default: vehicle.number_default || null,
    primary_color: vehicle.primary_color || null, bio: vehicle.bio || null, tagline: vehicle.tagline || null,
    profile_image_url: vehicle.profile_image_url || null, hero_image_url: vehicle.hero_image_url || null,
    racing_status: vehicle.racing_status || "Active", visibility_status: vehicle.visibility_status || "draft",
    primary_discipline: vehicle.primary_discipline || null, retired_year: vehicle.retired_year || null,
    website_url: vehicle.website_url || null, instagram_url: vehicle.instagram_url || null,
    facebook_url: vehicle.facebook_url || null, tiktok_url: vehicle.tiktok_url || null,
    x_url: vehicle.x_url || null, youtube_url: vehicle.youtube_url || null,
    owner_driver_id: vehicle.owner_driver_id || null, owner_team_id: vehicle.owner_team_id || null,
    owner_user_id: vehicle.owner_user_id || null, claim_status: vehicle.claim_status || "unclaimed",
    created_date: vehicle.created_date || null,
  };
}

function buildHistory(ctx) {
  const { vehicleEntries, vehicleResults, vehicleStandings, driverMap, racerProfileMap, teamMap, seriesMap, classMap, eventMap, trackMap } = ctx;

  // Driver history — track first/last seen per driver
  const driverHistory = {};
  vehicleEntries.forEach(e => {
    const did = e.driver_id; if (!did) return;
    const driver = driverMap.get(did); const rp = racerProfileMap.get(did);
    const ev = eventMap.get(e.event_id); const eventDate = ev?.event_date;
    if (!driverHistory[did]) driverHistory[did] = {
      driver_id: did, display_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"),
      slug: rp?.slug || driver?.canonical_slug || driver?.slug || null,
      profile_url: rp?.slug ? `/racers/${rp.slug}` : (driver?.canonical_slug || driver?.slug ? `/drivers/${driver.canonical_slug || driver.slug}` : null),
      first_seen: null, last_seen: null, entries: 0, wins: 0, podiums: 0,
    };
    driverHistory[did].entries++;
    if (eventDate) {
      if (!driverHistory[did].first_seen || eventDate < driverHistory[did].first_seen) driverHistory[did].first_seen = eventDate;
      if (!driverHistory[did].last_seen || eventDate > driverHistory[did].last_seen) driverHistory[did].last_seen = eventDate;
    }
  });
  vehicleResults.forEach(r => {
    const did = r.driver_id; if (!did || !driverHistory[did]) return;
    if (r.position === 1) driverHistory[did].wins++;
    if (r.position <= 3) driverHistory[did].podiums++;
  });
  const drivers = Object.values(driverHistory).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

  // Team history
  const teamHistory = {};
  vehicleEntries.forEach(e => {
    const tid = e.team_id; if (!tid) return;
    const team = teamMap.get(tid); const ev = eventMap.get(e.event_id); const eventDate = ev?.event_date;
    if (!teamHistory[tid]) teamHistory[tid] = {
      team_id: tid, team_name: team?.name || "Unknown", slug: team?.slug || null,
      profile_url: team?.slug ? `/teams/${team.slug}` : (tid ? `/TeamProfile?id=${tid}` : null),
      logo_url: team?.logo_url || null, first_seen: null, last_seen: null, entries: 0,
    };
    teamHistory[tid].entries++;
    if (eventDate) {
      if (!teamHistory[tid].first_seen || eventDate < teamHistory[tid].first_seen) teamHistory[tid].first_seen = eventDate;
      if (!teamHistory[tid].last_seen || eventDate > teamHistory[tid].last_seen) teamHistory[tid].last_seen = eventDate;
    }
  });
  const teams = Object.values(teamHistory).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

  // Series history
  const seriesHistory = {};
  vehicleResults.forEach(r => {
    const ev = eventMap.get(r.event_id); const sid = r.series_id || ev?.series_id; if (!sid) return;
    const series = seriesMap.get(sid);
    if (!seriesHistory[sid]) seriesHistory[sid] = { series_id: sid, series_name: series?.name || "Unknown", slug: series?.slug || null, starts: 0, wins: 0, podiums: 0, first_seen: null, last_seen: null };
    seriesHistory[sid].starts++;
    if (r.position === 1) seriesHistory[sid].wins++;
    if (r.position <= 3) seriesHistory[sid].podiums++;
    const eventDate = ev?.event_date;
    if (eventDate) {
      if (!seriesHistory[sid].first_seen || eventDate < seriesHistory[sid].first_seen) seriesHistory[sid].first_seen = eventDate;
      if (!seriesHistory[sid].last_seen || eventDate > seriesHistory[sid].last_seen) seriesHistory[sid].last_seen = eventDate;
    }
  });
  const series = Object.values(seriesHistory).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

  // Class history
  const classHistory = {};
  vehicleResults.forEach(r => {
    const cid = r.series_class_id; if (!cid) return;
    const cls = classMap.get(cid);
    if (!classHistory[cid]) classHistory[cid] = { class_id: cid, class_name: cls?.class_name || "Unknown", starts: 0, wins: 0, podiums: 0 };
    classHistory[cid].starts++;
    if (r.position === 1) classHistory[cid].wins++;
    if (r.position <= 3) classHistory[cid].podiums++;
  });
  const classes = Object.values(classHistory).sort((a, b) => b.starts - a.starts);

  // Season history
  const seasonHistory = {};
  vehicleResults.forEach(r => {
    const ev = eventMap.get(r.event_id); const season = ev?.season || (ev?.event_date ? new Date(ev.event_date).getFullYear().toString() : null);
    if (!season) return;
    if (!seasonHistory[season]) seasonHistory[season] = { season, starts: 0, wins: 0, podiums: 0, points: 0 };
    seasonHistory[season].starts++;
    if (r.position === 1) seasonHistory[season].wins++;
    if (r.position <= 3) seasonHistory[season].podiums++;
    seasonHistory[season].points += r.points || 0;
  });
  const seasons = Object.values(seasonHistory).sort((a, b) => b.season.localeCompare(a.season));

  // Championship history
  const championships = vehicleStandings
    .filter(s => s.position === 1)
    .map(s => {
      const series = seriesMap.get(s.series_id); const driver = driverMap.get(s.driver_id); const rp = racerProfileMap.get(s.driver_id);
      return {
        series_id: s.series_id, series_name: series?.name || "Unknown", season_year: s.season_year,
        driver_id: s.driver_id, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null),
        points_total: s.points_total, class_id: s.series_class_id,
      };
    });

  // Ownership history (current owner from fields + derived from entries)
  const ownership = {
    current_driver_id: ctx.vehicle.owner_driver_id || null,
    current_team_id: ctx.vehicle.owner_team_id || null,
    current_driver_name: ctx.vehicle.owner_driver_id ? (racerProfileMap.get(ctx.vehicle.owner_driver_id)?.display_name || (driverMap.get(ctx.vehicle.owner_driver_id) ? `${driverMap.get(ctx.vehicle.owner_driver_id).first_name} ${driverMap.get(ctx.vehicle.owner_driver_id).last_name}` : null)) : null,
    current_team_name: ctx.vehicle.owner_team_id ? (teamMap.get(ctx.vehicle.owner_team_id)?.name || null) : null,
  };

  return { drivers, teams, series, classes, seasons, championships, ownership, total_drivers: drivers.length, total_teams: teams.length, total_series: series.length, total_championships: championships.length };
}

function buildChassisHistory(vehicle, ctx) {
  return {
    chassis_id: vehicle.chassis_id || null,
    build_year: vehicle.chassis_build_year || vehicle.build_year || null,
    builder: vehicle.chassis_builder || null,
    model: vehicle.chassis_model || null,
    notes: vehicle.chassis_notes || null,
    championships: ctx.vehicleStandings.filter(s => s.position === 1).length,
    starts: ctx.vehicleResults.filter(r => r.position && r.position > 0).length,
    timeline: ctx.vehicleResults
      .filter(r => r.position === 1)
      .map(r => {
        const ev = ctx.eventMap.get(r.event_id);
        return { date: ev?.event_date, event_name: ev?.name, track_name: ctx.trackMap.get(ev?.track_id)?.name, series_name: ctx.seriesMap.get(r.series_id || ev?.series_id)?.name };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  };
}

function buildEngineHistory(vehicle, ctx) {
  return {
    platform: vehicle.engine_platform || null,
    manufacturer: vehicle.engine_manufacturer || null,
    displacement: vehicle.engine_displacement || null,
    configuration: vehicle.engine_configuration || null,
    builder: vehicle.engine_builder || null,
    notes: vehicle.engine_notes || null,
    season_usage: Object.values(
      ctx.vehicleResults.reduce((acc, r) => {
        const ev = ctx.eventMap.get(r.event_id);
        const season = ev?.season || (ev?.event_date ? new Date(ev.event_date).getFullYear().toString() : null);
        if (!season) return acc;
        if (!acc[season]) acc[season] = { season, starts: 0, wins: 0, best_finish: null };
        acc[season].starts++;
        if (r.position === 1) acc[season].wins++;
        if (r.position && (acc[season].best_finish === null || r.position < acc[season].best_finish)) acc[season].best_finish = r.position;
        return acc;
      }, {})
    ).sort((a, b) => b.season.localeCompare(a.season)),
  };
}

function buildTimeline(ctx, vehicle) {
  const { vehicleResults, vehicleStandings, vehicleEntries, eventMap, trackMap, seriesMap, driverMap, racerProfileMap, teamMap, outletStories } = ctx;
  const events = [];

  vehicleResults.forEach(r => {
    const ev = eventMap.get(r.event_id); const track = ev ? trackMap.get(ev.track_id) : null; const series = ev ? seriesMap.get(ev.series_id) : null;
    const driver = driverMap.get(r.driver_id); const rp = racerProfileMap.get(r.driver_id);
    events.push({
      type: "race_result", date: ev?.event_date || r.created_date,
      title: r.position === 1 ? `Win at ${ev?.name || "Event"}` : `P${r.position} at ${ev?.name || "Event"}`,
      description: `${r.position === 1 ? "Victory" : `Finished P${r.position}`} at ${ev?.name || "event"}${track ? ` at ${track.name}` : ""}${series ? ` · ${series.name}` : ""}${driver ? ` · ${(rp?.display_name || `${driver.first_name} ${driver.last_name}`)}` : ""}`,
      metadata: { event_id: r.event_id, track_name: track?.name, series_name: series?.name, position: r.position, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) },
      priority: r.position === 1 ? 100 : r.position <= 3 ? 80 : 50,
    });
  });

  vehicleStandings.forEach(s => {
    if (s.position === 1) {
      const series = seriesMap.get(s.series_id); const driver = driverMap.get(s.driver_id); const rp = racerProfileMap.get(s.driver_id);
      events.push({
        type: "championship", date: s.last_calculated || s.created_date,
        title: `Championship Win — ${series?.name || "Series"}`,
        description: `${series?.name || "Series"} championship${s.season_year ? ` ${s.season_year}` : ""}${driver ? ` · ${(rp?.display_name || `${driver.first_name} ${driver.last_name}`)}` : ""}`,
        metadata: { series_id: s.series_id, series_name: series?.name, season_year: s.season_year, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) },
        priority: 120,
      });
    }
  });

  // Driver changes — detect when a new driver first drives this vehicle
  const driverFirstSeen = {};
  vehicleEntries.forEach(e => {
    const did = e.driver_id; if (!did) return;
    const ev = eventMap.get(e.event_id); const eventDate = ev?.event_date;
    if (!driverFirstSeen[did] || (eventDate && eventDate < driverFirstSeen[did])) driverFirstSeen[did] = eventDate || e.created_date;
  });
  Object.entries(driverFirstSeen).forEach(([did, date]) => {
    const driver = driverMap.get(did); const rp = racerProfileMap.get(did);
    events.push({
      type: "driver_change", date,
      title: `${rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Driver")} took the wheel`,
      description: `${rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Driver")} began driving this vehicle`,
      metadata: { driver_id: did, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) },
      priority: 60,
    });
  });

  // Team changes
  const teamFirstSeen = {};
  vehicleEntries.forEach(e => {
    const tid = e.team_id; if (!tid) return;
    const ev = eventMap.get(e.event_id); const eventDate = ev?.event_date;
    if (!teamFirstSeen[tid] || (eventDate && eventDate < teamFirstSeen[tid])) teamFirstSeen[tid] = eventDate || e.created_date;
  });
  Object.entries(teamFirstSeen).forEach(([tid, date]) => {
    const team = teamMap.get(tid);
    events.push({
      type: "team_change", date,
      title: `Joined ${team?.name || "Team"}`,
      description: `Vehicle began running under ${team?.name || "team"}`,
      metadata: { team_id: tid, team_name: team?.name },
      priority: 55,
    });
  });

  if (vehicle.build_year) events.push({ type: "built", date: `${vehicle.build_year}-01-01`, title: "Vehicle Built", description: `${vehicle.nickname || "Vehicle"} was built in ${vehicle.build_year}${vehicle.chassis_builder ? ` by ${vehicle.chassis_builder}` : ""}`, metadata: { build_year: vehicle.build_year, chassis_builder: vehicle.chassis_builder }, priority: 90 });
  if (vehicle.retired_year) events.push({ type: "retired", date: `${vehicle.retired_year}-01-01`, title: "Retired", description: `Retired from active competition in ${vehicle.retired_year}`, metadata: { retired_year: vehicle.retired_year }, priority: 85 });

  // Media mentions
  const vehicleName = vehicle.nickname || `${vehicle.manufacturer || ""} ${vehicle.model || ""}`.trim();
  if (vehicleName) {
    outletStories.forEach(story => {
      const mentioned = story.tags?.some(t => t.toLowerCase().includes(vehicleName.toLowerCase())) || story.title?.toLowerCase().includes(vehicleName.toLowerCase());
      if (mentioned && story.status === "published") events.push({ type: "media", date: story.published_date || story.created_date, title: story.title, description: story.subtitle || `Featured in ${story.title}`, metadata: { story_slug: story.slug, story_id: story.id }, priority: 40 });
    });
  }

  events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return events.slice(0, 100);
}

function buildStatistics(ctx) {
  const { vehicleResults, vehicleStandings, vehicleEntries, seriesMap, classMap, trackMap, eventMap, driverMap, racerProfileMap, teamMap } = ctx;
  const validResults = vehicleResults.filter(r => r.position && r.position > 0);
  const positions = validResults.map(r => r.position);

  const career = {
    starts: validResults.length, wins: positions.filter(p => p === 1).length,
    podiums: positions.filter(p => p <= 3).length, top5: positions.filter(p => p <= 5).length,
    top10: positions.filter(p => p <= 10).length,
    dnf: vehicleResults.filter(r => r.status === "DNF").length,
    points: vehicleResults.reduce((sum, r) => sum + (r.points || 0), 0),
    championships: vehicleStandings.filter(s => s.position === 1).length,
    avg_finish: positions.length > 0 ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 100) / 100 : null,
    best_finish: positions.length > 0 ? Math.min(...positions) : null,
    drivers_count: new Set(vehicleResults.map(r => r.driver_id).filter(Boolean)).size,
    teams_count: new Set(vehicleEntries.map(e => e.team_id).filter(Boolean)).size,
  };

  const bySeries = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const sid = r.series_id || ev?.series_id; if (!sid) return; if (!bySeries[sid]) bySeries[sid] = { series_id: sid, series_name: seriesMap.get(sid)?.name || "Unknown", starts: 0, wins: 0, podiums: 0, points: 0 }; bySeries[sid].starts++; if (r.position === 1) bySeries[sid].wins++; if (r.position <= 3) bySeries[sid].podiums++; bySeries[sid].points += r.points || 0; });
  const byClass = {}; validResults.forEach(r => { const cid = r.series_class_id; if (!cid) return; if (!byClass[cid]) byClass[cid] = { class_id: cid, class_name: classMap.get(cid)?.class_name || "Unknown", starts: 0, wins: 0, podiums: 0 }; byClass[cid].starts++; if (r.position === 1) byClass[cid].wins++; if (r.position <= 3) byClass[cid].podiums++; });
  const byTrack = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const tid = ev?.track_id; if (!tid) return; if (!byTrack[tid]) byTrack[tid] = { track_id: tid, track_name: trackMap.get(tid)?.name || "Unknown", starts: 0, wins: 0, podiums: 0, best_finish: null }; byTrack[tid].starts++; if (r.position === 1) byTrack[tid].wins++; if (r.position <= 3) byTrack[tid].podiums++; if (byTrack[tid].best_finish === null || r.position < byTrack[tid].best_finish) byTrack[tid].best_finish = r.position; });
  const byDriver = {}; validResults.forEach(r => { const did = r.driver_id; if (!did) return; const driver = driverMap.get(did); const rp = racerProfileMap.get(did); if (!byDriver[did]) byDriver[did] = { driver_id: did, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"), starts: 0, wins: 0, podiums: 0, points: 0 }; byDriver[did].starts++; if (r.position === 1) byDriver[did].wins++; if (r.position <= 3) byDriver[did].podiums++; byDriver[did].points += r.points || 0; });
  const byTeam = {}; vehicleEntries.forEach(e => { const tid = e.team_id; if (!tid) return; const team = teamMap.get(tid); if (!byTeam[tid]) byTeam[tid] = { team_id: tid, team_name: team?.name || "Unknown", starts: 0, wins: 0, podiums: 0 }; }); validResults.forEach(r => { const entry = vehicleEntries.find(e => e.id === r.entry_id); const tid = entry?.team_id; if (!tid || !byTeam[tid]) return; byTeam[tid].starts++; if (r.position === 1) byTeam[tid].wins++; if (r.position <= 3) byTeam[tid].podiums++; });
  const byManufacturer = {}; validResults.forEach(r => { const mfr = ctx.vehicle.manufacturer; if (!mfr) return; if (!byManufacturer[mfr]) byManufacturer[mfr] = { manufacturer: mfr, starts: 0, wins: 0, podiums: 0 }; byManufacturer[mfr].starts++; if (r.position === 1) byManufacturer[mfr].wins++; if (r.position <= 3) byManufacturer[mfr].podiums++; });
  const bySeason = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const season = ev?.season || (ev?.event_date ? new Date(ev.event_date).getFullYear().toString() : null); if (!season) return; if (!bySeason[season]) bySeason[season] = { season, starts: 0, wins: 0, podiums: 0, points: 0 }; bySeason[season].starts++; if (r.position === 1) bySeason[season].wins++; if (r.position <= 3) bySeason[season].podiums++; bySeason[season].points += r.points || 0; });

  return {
    career,
    by_series: Object.values(bySeries).sort((a, b) => b.starts - a.starts),
    by_class: Object.values(byClass).sort((a, b) => b.starts - a.starts),
    by_track: Object.values(byTrack).sort((a, b) => b.starts - a.starts),
    by_driver: Object.values(byDriver).sort((a, b) => b.starts - a.starts),
    by_team: Object.values(byTeam).sort((a, b) => b.starts - a.starts),
    by_manufacturer: Object.values(byManufacturer).sort((a, b) => b.starts - a.starts),
    by_season: Object.values(bySeason).sort((a, b) => b.season.localeCompare(b.season)),
  };
}

function buildAchievements(ctx, stats) {
  const career = stats.career; const achievements = [];
  if (career.starts >= 1) achievements.push({ id: "first_start", title: "First Start", description: "First race entry", icon: "Flag", unlocked: true, category: "milestone" });
  if (career.wins >= 1) achievements.push({ id: "first_win", title: "First Win", description: "First victory", icon: "Trophy", unlocked: true, category: "milestone" });
  if (career.podiums >= 1) achievements.push({ id: "first_podium", title: "First Podium", description: "First podium finish", icon: "Award", unlocked: true, category: "milestone" });
  if (career.championships >= 1) achievements.push({ id: "first_championship", title: "First Championship", description: "First championship title", icon: "Crown", unlocked: true, category: "milestone" });
  [10, 25, 50, 100, 200, 500].forEach(target => { achievements.push({ id: `starts_${target}`, title: `${target} Starts`, description: `${target} race starts`, icon: "Flag", unlocked: career.starts >= target, category: "starts", progress: career.starts, target }); });
  [5, 10, 25, 50, 100].forEach(target => { achievements.push({ id: `wins_${target}`, title: `${target} Wins`, description: `${target} victories`, icon: "Trophy", unlocked: career.wins >= target, category: "wins", progress: career.wins, target }); });
  [10, 25, 50, 100].forEach(target => { achievements.push({ id: `podiums_${target}`, title: `${target} Podiums`, description: `${target} podium finishes`, icon: "Award", unlocked: career.podiums >= target, category: "podiums", progress: career.podiums, target }); });
  stats.by_series.forEach(s => { if (s.wins >= 5) achievements.push({ id: `series_dominator_${s.series_id}`, title: `${s.series_name} Dominator`, description: `5+ wins in ${s.series_name}`, icon: "Trophy", unlocked: true, category: "series" }); });
  stats.by_track.forEach(t => { if (t.wins >= 3) achievements.push({ id: `track_master_${t.track_id}`, title: `${t.track_name} Master`, description: `3+ wins at ${t.track_name}`, icon: "MapPin", unlocked: true, category: "track" }); });
  stats.by_driver.forEach(d => { if (d.wins >= 5) achievements.push({ id: `driver_pair_${d.driver_id}`, title: `Winning Pair: ${d.driver_name}`, description: `5+ wins with ${d.driver_name}`, icon: "Users", unlocked: true, category: "driver" }); });
  return achievements;
}

function buildSponsors(ctx) {
  const { entrySponsors } = ctx; const sponsors = {};
  entrySponsors.forEach(es => {
    const sid = es.sponsor_id || es.sponsor_name; if (!sid) return;
    const name = es.sponsor_name || es.sponsor_id;
    if (!sponsors[sid]) sponsors[sid] = { sponsor_id: sid, sponsor_name: name, logo_url: es.sponsor_logo_url || null, sponsor_url: es.sponsor_url || null, tier: es.tier || null, is_primary: es.is_primary || false, entries_count: 0 };
    sponsors[sid].entries_count++;
  });
  return { current_sponsors: Object.values(sponsors).sort((a, b) => b.entries_count - a.entries_count), total_sponsors: Object.keys(sponsors).length };
}

function buildMedia(ctx, vehicle) {
  const { outletStories } = ctx;
  const vehicleName = vehicle.nickname || `${vehicle.manufacturer || ""} ${vehicle.model || ""}`.trim();
  const teamStories = vehicleName ? outletStories.filter(story => {
    if (story.status !== "published") return false;
    return story.tags?.some(t => t.toLowerCase().includes(vehicleName.toLowerCase())) || story.title?.toLowerCase().includes(vehicleName.toLowerCase());
  }).slice(0, 20) : [];
  return { outlet_stories: teamStories.map(s => ({ id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, primary_category: s.primary_category, published_date: s.published_date, cover_image_url: s.cover_image_url, author: s.author })), gallery_count: 0, gallery_urls: [] };
}

function buildProfileCompleteness(vehicle) {
  const checks = [
    { id: "nickname", label: "Vehicle Name", weight: 10, passed: !!vehicle.nickname },
    { id: "slug", label: "URL Slug", weight: 10, passed: !!vehicle.slug },
    { id: "manufacturer", label: "Manufacturer", weight: 8, passed: !!vehicle.manufacturer },
    { id: "model", label: "Model", weight: 8, passed: !!vehicle.model },
    { id: "year", label: "Year", weight: 5, passed: !!vehicle.year },
    { id: "image", label: "Profile Image", weight: 8, passed: !!vehicle.profile_image_url },
    { id: "hero_image", label: "Hero Image", weight: 5, passed: !!vehicle.hero_image_url },
    { id: "bio", label: "Biography", weight: 5, passed: !!vehicle.bio },
    { id: "tagline", label: "Tagline", weight: 5, passed: !!vehicle.tagline },
    { id: "vehicle_type", label: "Vehicle Type", weight: 5, passed: !!vehicle.vehicle_type },
    { id: "discipline", label: "Discipline", weight: 5, passed: !!vehicle.primary_discipline },
    { id: "chassis_id", label: "Chassis ID", weight: 5, passed: !!vehicle.chassis_id },
    { id: "chassis_builder", label: "Chassis Builder", weight: 5, passed: !!vehicle.chassis_builder },
    { id: "engine_platform", label: "Engine Platform", weight: 5, passed: !!vehicle.engine_platform },
    { id: "number", label: "Car Number", weight: 4, passed: !!vehicle.number_default },
    { id: "ownership", label: "Ownership Claimed", weight: 6, passed: vehicle.claim_status === "claimed" },
  ];
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);
  const missing = checks.filter(c => !c.passed).map(c => c.label);
  return { score, checks, missing };
}

function buildSEO(vehicle, stats, ctx) {
  const name = vehicle.nickname || `${vehicle.manufacturer || ""} ${vehicle.model || ""}`.trim() || "Vehicle";
  const title = `${name} — Vehicle Profile | HIJINX`;
  const description = vehicle.bio || `${name} racing vehicle profile. ${stats.career.starts} starts, ${stats.career.wins} wins, ${stats.career.championships} championships.`;
  const image = vehicle.hero_image_url || vehicle.profile_image_url || null;
  const url = vehicle.slug ? `/vehicles/${vehicle.slug}` : null;
  const structuredData = {
    "@context": "https://schema.org", "@type": "Vehicle",
    name, description, vehicleConfiguration: vehicle.vehicle_type || null,
    vehicleModelDate: vehicle.year ? String(vehicle.year) : null,
    vehicleModel: vehicle.model || null, brand: vehicle.manufacturer || null,
  };
  if (image) structuredData.image = image;
  if (url) structuredData.url = `https://hijinxco.com${url}`;
  if (vehicle.vin_last4) structuredData.vehicleIdentificationNumber = `****${vehicle.vin_last4}`;
  if (vehicle.primary_color) structuredData.color = vehicle.primary_color;
  if (vehicle.website_url) structuredData.url = vehicle.website_url;
  const currentDriver = ctx.vehicle.owner_driver_id ? (ctx.racerProfileMap.get(ctx.vehicle.owner_driver_id)?.display_name || (ctx.driverMap.get(ctx.vehicle.owner_driver_id) ? `${ctx.driverMap.get(ctx.vehicle.owner_driver_id).first_name} ${ctx.driverMap.get(ctx.vehicle.owner_driver_id).last_name}` : null)) : null;
  const currentTeam = ctx.vehicle.owner_team_id ? (ctx.teamMap.get(ctx.vehicle.owner_team_id)?.name || null) : null;
  return {
    title, description, image, url, og_type: "profile", twitter_card: "summary_large_image",
    og_title: title, og_description: description, og_image: image,
    twitter_title: title, twitter_description: description, twitter_image: image,
    structured_data: structuredData,
    rich_preview: { name, image, current_driver: currentDriver, current_team: currentTeam, wins: stats.career.wins, championships: stats.career.championships, manufacturer: vehicle.manufacturer, series: ctx.vehicleResults.length > 0 ? ctx.seriesMap.get(ctx.vehicleResults[0]?.series_id)?.name : null },
  };
}