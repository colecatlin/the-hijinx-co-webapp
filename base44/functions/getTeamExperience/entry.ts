/**
 * getTeamExperience
 * Phase 11 — Read-only function that computes the complete public Team experience.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function resolveTeam(base44, slug, team_id) {
  if (slug) {
    const list = await base44.asServiceRole.entities.Team.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (team_id) {
    return await base44.asServiceRole.entities.Team.get(team_id).catch(() => null);
  }
  return null;
}

async function loadTeamContext(base44, team) {
  const teamId = team.id;
  const [
    entries, results, standings, driverPrograms, entrySponsors,
    allDrivers, allRacerProfiles, allVehicles, allSeries, allClasses,
    allEvents, allTracks, allSessions, allTeams, driverMedia, outletStories,
  ] = await Promise.all([
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverProgram.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.Session.list().catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.DriverMedia.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
  ]);
  const teamEntries = entries.filter(e => e.team_id === teamId);
  const entryIds = new Set(teamEntries.map(e => e.id));
  const teamResults = results.filter(r => (r.entry_id && entryIds.has(r.entry_id)) || r.team_id === teamId);
  const teamDriverPrograms = driverPrograms.filter(dp => dp.team_id === teamId);
  const teamDriverIds = new Set(teamDriverPrograms.map(dp => dp.driver_id));
  const teamStandings = standings.filter(s => teamDriverIds.has(s.driver_id));
  const teamEntrySponsors = entrySponsors.filter(es => entryIds.has(es.entry_id));
  const driverMap = new Map(); allDrivers.forEach(d => driverMap.set(d.id, d));
  const racerProfileMap = new Map(); allRacerProfiles.forEach(rp => { racerProfileMap.set(rp.id, rp); if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp); });
  const vehicleMap = new Map(); allVehicles.forEach(v => vehicleMap.set(v.id, v));
  const seriesMap = new Map(); allSeries.forEach(s => seriesMap.set(s.id, s));
  const classMap = new Map(); allClasses.forEach(c => classMap.set(c.id, c));
  const eventMap = new Map(); allEvents.forEach(e => eventMap.set(e.id, e));
  const trackMap = new Map(); allTracks.forEach(t => trackMap.set(t.id, t));
  const sessionMap = new Map(); allSessions.forEach(s => sessionMap.set(s.id, s));
  return { team, entries, teamEntries, teamResults, teamStandings, driverPrograms, teamDriverPrograms, entrySponsors: teamEntrySponsors, driverMedia, outletStories, allDrivers, allRacerProfiles, allVehicles, allSeries, allClasses, allEvents, allTracks, allSessions, allTeams, driverMap, racerProfileMap, vehicleMap, seriesMap, classMap, eventMap, trackMap, sessionMap };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, team_id, allow_draft = false } = body;
    if (!slug && !team_id) return Response.json({ error: "slug or team_id is required" }, { status: 400 });

    const team = await resolveTeam(base44, slug, team_id);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });
    if (team.visibility_status === "draft" && !allow_draft) return Response.json({ error: "Team not found" }, { status: 404 });
    if (team.is_archived) return Response.json({ error: "Team not found" }, { status: 404 });

    const ctx = await loadTeamContext(base44, team);
    const publicFields = buildPublicFields(team);
    const roster = buildRoster(ctx);
    const timeline = buildTimeline(ctx);
    const statistics = buildStatistics(ctx);
    const achievements = buildAchievements(ctx, statistics);
    const sponsors = buildSponsors(ctx);
    const media = buildMedia(ctx);
    const profileCompleteness = buildProfileCompleteness(team);
    const seo = buildSEO(team, statistics);

    return Response.json({ team: publicFields, roster, timeline, statistics, achievements, sponsors, media, profile_completeness: profileCompleteness, seo });
  } catch (err) {
    console.error("[getTeamExperience] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

function buildPublicFields(team) {
  return {
    id: team.id, name: team.name, slug: team.slug, tagline: team.tagline || null, bio: team.bio || null,
    description_summary: team.description_summary || null, logo_url: team.logo_url || null, hero_image_url: team.hero_image_url || null,
    headquarters_city: team.headquarters_city || null, headquarters_state: team.headquarters_state || null, country: team.country || null,
    racing_base_city: team.racing_base_city || null, racing_base_state: team.racing_base_state || null, racing_base_country: team.racing_base_country || null,
    primary_discipline: team.primary_discipline || null, team_level: team.team_level || null, racing_status: team.racing_status || null,
    founded_year: team.founded_year || null, manufacturer: team.manufacturer || null, manufacturer_logo_url: team.manufacturer_logo_url || null,
    website_url: team.website_url || null, instagram_url: team.instagram_url || null, facebook_url: team.facebook_url || null,
    tiktok_url: team.tiktok_url || null, x_url: team.x_url || null, youtube_url: team.youtube_url || null,
    visibility_status: team.visibility_status || "draft", owner_user_id: team.owner_user_id || null, claim_status: team.claim_status || "unclaimed",
    created_date: team.created_date || null,
  };
}

function buildRoster(ctx) {
  const { teamEntries, teamDriverPrograms, driverMap, racerProfileMap, eventMap, vehicleMap } = ctx;
  const currentDriverIds = new Set(); const pastDriverIds = new Set();
  const driverFirstSeen = {}; const driverLastSeen = {};
  teamDriverPrograms.forEach(dp => {
    const did = dp.driver_id; if (!did) return;
    if (!driverFirstSeen[did] || dp.created_date < driverFirstSeen[did]) driverFirstSeen[did] = dp.created_date;
    if (!driverLastSeen[did] || dp.created_date > driverLastSeen[did]) driverLastSeen[did] = dp.created_date;
    const isActive = dp.end_date ? new Date(dp.end_date) > new Date() : !dp.is_archived;
    if (isActive) currentDriverIds.add(did); else pastDriverIds.add(did);
  });
  teamEntries.forEach(e => {
    const did = e.driver_id; if (!did) return;
    const ev = eventMap.get(e.event_id); const eventDate = ev?.event_date;
    if (eventDate) {
      if (!driverFirstSeen[did] || eventDate < driverFirstSeen[did]) driverFirstSeen[did] = eventDate;
      if (!driverLastSeen[did] || eventDate > driverLastSeen[did]) driverLastSeen[did] = eventDate;
    }
    const evStatus = ev?.status;
    if (["Draft", "Published", "Live"].includes(evStatus)) currentDriverIds.add(did);
    else if (evStatus === "Completed") { if (!currentDriverIds.has(did)) pastDriverIds.add(did); }
  });
  pastDriverIds.forEach(did => { if (currentDriverIds.has(did)) pastDriverIds.delete(did); });
  const buildDriverInfo = (did) => {
    const driver = driverMap.get(did); const rp = racerProfileMap.get(did);
    return {
      driver_id: did, display_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"),
      slug: rp?.slug || driver?.canonical_slug || driver?.slug || null,
      profile_url: rp?.slug ? `/racers/${rp.slug}` : (driver?.canonical_slug || driver?.slug ? `/drivers/${driver.canonical_slug || driver.slug}` : null),
      profile_image_url: rp?.profile_image_url || driver?.profile_image_url || null,
      car_number: teamDriverPrograms.find(dp => dp.driver_id === did)?.car_number || null,
      first_seen: driverFirstSeen[did] || null, last_seen: driverLastSeen[did] || null,
    };
  };
  const vehicleIds = new Set();
  teamEntries.forEach(e => { if (e.vehicle_id) vehicleIds.add(e.vehicle_id); });
  const vehicles = Array.from(vehicleIds).map(vid => {
    const vehicle = vehicleMap.get(vid);
    const vehicleEntries = teamEntries.filter(e => e.vehicle_id === vid);
    return { vehicle_id: vid, name: vehicle?.name || vehicle?.nickname || "Unknown Vehicle", manufacturer: vehicle?.manufacturer || null, model: vehicle?.model || null, year: vehicle?.year || null, starts: vehicleEntries.length };
  }).sort((a, b) => b.starts - a.starts);
  return { current_drivers: Array.from(currentDriverIds).map(buildDriverInfo), past_drivers: Array.from(pastDriverIds).map(buildDriverInfo), vehicles, total_drivers: currentDriverIds.size + pastDriverIds.size, total_vehicles: vehicles.length };
}

function buildTimeline(ctx) {
  const { teamResults, teamDriverPrograms, eventMap, trackMap, seriesMap, outletStories, driverMap, racerProfileMap, team, teamStandings } = ctx;
  const events = [];
  teamResults.forEach(r => {
    const ev = eventMap.get(r.event_id); const track = ev ? trackMap.get(ev.track_id) : null; const series = ev ? seriesMap.get(ev.series_id) : null;
    const driver = driverMap.get(r.driver_id); const rp = racerProfileMap.get(r.driver_id);
    events.push({ type: "race_result", date: ev?.event_date || r.created_date, title: r.position === 1 ? `Win at ${ev?.name || "Event"}` : `P${r.position} at ${ev?.name || "Event"}`, description: `${r.position === 1 ? "Victory" : `Finished P${r.position}`} at ${ev?.name || "event"}${track ? ` at ${track.name}` : ""}${series ? ` · ${series.name}` : ""}${driver ? ` · ${(rp?.display_name || `${driver.first_name} ${driver.last_name}`)}` : ""}`, metadata: { event_id: r.event_id, track_name: track?.name, series_name: series?.name, position: r.position, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) }, priority: r.position === 1 ? 100 : r.position <= 3 ? 80 : 50 });
  });
  teamStandings.forEach(s => {
    if (s.position === 1) {
      const series = seriesMap.get(s.series_id); const driver = driverMap.get(s.driver_id); const rp = racerProfileMap.get(s.driver_id);
      events.push({ type: "championship", date: s.last_calculated || s.created_date, title: `Championship Win — ${series?.name || "Series"}`, description: `${series?.name || "Series"} championship${s.season_year ? ` ${s.season_year}` : ""}${driver ? ` · ${(rp?.display_name || `${driver.first_name} ${driver.last_name}`)}` : ""}`, metadata: { series_id: s.series_id, series_name: series?.name, season_year: s.season_year, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) }, priority: 120 });
    }
  });
  const driverAdditions = {};
  teamDriverPrograms.forEach(dp => { const did = dp.driver_id; if (!did) return; if (!driverAdditions[did] || dp.created_date < driverAdditions[did]) driverAdditions[did] = dp.created_date; });
  Object.entries(driverAdditions).forEach(([did, date]) => {
    const driver = driverMap.get(did); const rp = racerProfileMap.get(did);
    events.push({ type: "driver_addition", date, title: `${rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Driver")} joined`, description: `${rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Driver")} joined the team`, metadata: { driver_id: did, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : null) }, priority: 60 });
  });
  if (team.founded_year) events.push({ type: "founded", date: `${team.founded_year}-01-01`, title: "Team Founded", description: `${team.name} was founded in ${team.founded_year}`, metadata: { founded_year: team.founded_year }, priority: 90 });
  outletStories.forEach(story => {
    const teamMentioned = story.tags?.some(t => t.toLowerCase().includes(team.name.toLowerCase())) || story.title?.toLowerCase().includes(team.name.toLowerCase());
    if (teamMentioned && story.status === "published") events.push({ type: "media", date: story.published_date || story.created_date, title: story.title, description: story.subtitle || `Featured in ${story.title}`, metadata: { story_slug: story.slug, story_id: story.id }, priority: 40 });
  });
  events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return events.slice(0, 100);
}

function buildStatistics(ctx) {
  const { teamResults, teamStandings, teamEntries, seriesMap, classMap, trackMap, eventMap, driverMap, racerProfileMap, vehicleMap, team, teamEntries: allTeamEntries } = ctx;
  const validResults = teamResults.filter(r => r.position && r.position > 0);
  const positions = validResults.map(r => r.position);
  const career = {
    starts: validResults.length, wins: positions.filter(p => p === 1).length, podiums: positions.filter(p => p <= 3).length,
    top5: positions.filter(p => p <= 5).length, top10: positions.filter(p => p <= 10).length,
    dnf: teamResults.filter(r => r.status === "DNF").length, points: teamResults.reduce((sum, r) => sum + (r.points || 0), 0),
    championships: teamStandings.filter(s => s.position === 1).length,
    avg_finish: positions.length > 0 ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 100) / 100 : null,
    best_finish: positions.length > 0 ? Math.min(...positions) : null,
    drivers_count: new Set(teamResults.map(r => r.driver_id).filter(Boolean)).size,
    vehicles_count: new Set(teamEntries.map(e => e.vehicle_id).filter(Boolean)).size,
  };
  const bySeries = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const sid = r.series_id || ev?.series_id; if (!sid) return; if (!bySeries[sid]) bySeries[sid] = { series_id: sid, series_name: seriesMap.get(sid)?.name || "Unknown", starts: 0, wins: 0, podiums: 0, points: 0 }; bySeries[sid].starts++; if (r.position === 1) bySeries[sid].wins++; if (r.position <= 3) bySeries[sid].podiums++; bySeries[sid].points += r.points || 0; });
  const byClass = {}; validResults.forEach(r => { const cid = r.series_class_id; if (!cid) return; if (!byClass[cid]) byClass[cid] = { class_id: cid, class_name: classMap.get(cid)?.class_name || "Unknown", starts: 0, wins: 0, podiums: 0 }; byClass[cid].starts++; if (r.position === 1) byClass[cid].wins++; if (r.position <= 3) byClass[cid].podiums++; });
  const byTrack = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const tid = ev?.track_id; if (!tid) return; if (!byTrack[tid]) byTrack[tid] = { track_id: tid, track_name: trackMap.get(tid)?.name || "Unknown", starts: 0, wins: 0, podiums: 0, best_finish: null }; byTrack[tid].starts++; if (r.position === 1) byTrack[tid].wins++; if (r.position <= 3) byTrack[tid].podiums++; if (byTrack[tid].best_finish === null || r.position < byTrack[tid].best_finish) byTrack[tid].best_finish = r.position; });
  const byDriver = {}; validResults.forEach(r => { const did = r.driver_id; if (!did) return; const driver = driverMap.get(did); const rp = racerProfileMap.get(did); if (!byDriver[did]) byDriver[did] = { driver_id: did, driver_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"), starts: 0, wins: 0, podiums: 0, points: 0 }; byDriver[did].starts++; if (r.position === 1) byDriver[did].wins++; if (r.position <= 3) byDriver[did].podiums++; byDriver[did].points += r.points || 0; });
  const byManufacturer = {}; teamEntries.forEach(e => { const vehicle = vehicleMap.get(e.vehicle_id); const mfr = vehicle?.manufacturer || team.manufacturer; if (!mfr) return; if (!byManufacturer[mfr]) byManufacturer[mfr] = { manufacturer: mfr, starts: 0, wins: 0, podiums: 0 }; });
  validResults.forEach(r => { const teamEntry = allTeamEntries.find(e => e.id === r.entry_id); const vehicle = teamEntry ? vehicleMap.get(teamEntry.vehicle_id) : null; const mfr = vehicle?.manufacturer || team.manufacturer; if (!mfr || !byManufacturer[mfr]) return; byManufacturer[mfr].starts++; if (r.position === 1) byManufacturer[mfr].wins++; if (r.position <= 3) byManufacturer[mfr].podiums++; });
  const bySeason = {}; validResults.forEach(r => { const ev = eventMap.get(r.event_id); const season = ev?.season || (ev?.event_date ? new Date(ev.event_date).getFullYear().toString() : null); if (!season) return; if (!bySeason[season]) bySeason[season] = { season, starts: 0, wins: 0, podiums: 0, points: 0 }; bySeason[season].starts++; if (r.position === 1) bySeason[season].wins++; if (r.position <= 3) bySeason[season].podiums++; bySeason[season].points += r.points || 0; });
  return {
    career,
    by_series: Object.values(bySeries).sort((a, b) => b.starts - a.starts),
    by_class: Object.values(byClass).sort((a, b) => b.starts - a.starts),
    by_track: Object.values(byTrack).sort((a, b) => b.starts - a.starts),
    by_driver: Object.values(byDriver).sort((a, b) => b.starts - a.starts),
    by_manufacturer: Object.values(byManufacturer).sort((a, b) => b.starts - a.starts),
    by_season: Object.values(bySeason).sort((a, b) => b.season.localeCompare(a.season)),
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
  return achievements;
}

function buildSponsors(ctx) {
  const { entrySponsors } = ctx; const sponsors = {};
  entrySponsors.forEach(es => { const sid = es.sponsor_id || es.sponsor_name; if (!sid) return; const name = es.sponsor_name || es.sponsor_id; if (!sponsors[sid]) sponsors[sid] = { sponsor_id: sid, sponsor_name: name, logo_url: es.sponsor_logo_url || null, sponsor_url: es.sponsor_url || null, tier: es.tier || null, is_primary: es.is_primary || false, entries_count: 0 }; sponsors[sid].entries_count++; });
  return { current_sponsors: Object.values(sponsors).filter(s => s.entries_count > 0).sort((a, b) => b.entries_count - a.entries_count), historical_sponsors: [], total_sponsors: Object.keys(sponsors).length };
}

function buildMedia(ctx) {
  const { team, outletStories } = ctx;
  const teamStories = outletStories.filter(story => { if (story.status !== "published") return false; return story.tags?.some(t => t.toLowerCase().includes(team.name.toLowerCase())) || story.title?.toLowerCase().includes(team.name.toLowerCase()); }).slice(0, 20);
  return { outlet_stories: teamStories.map(s => ({ id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, primary_category: s.primary_category, published_date: s.published_date, cover_image_url: s.cover_image_url, author: s.author })), gallery_count: 0, gallery_urls: [] };
}

function buildProfileCompleteness(team) {
  const checks = [
    { id: "name", label: "Team Name", weight: 10, passed: !!team.name },
    { id: "slug", label: "URL Slug", weight: 10, passed: !!team.slug },
    { id: "logo", label: "Team Logo", weight: 10, passed: !!team.logo_url },
    { id: "hero_image", label: "Hero Image", weight: 8, passed: !!team.hero_image_url },
    { id: "bio", label: "Biography", weight: 8, passed: !!team.bio },
    { id: "tagline", label: "Tagline", weight: 5, passed: !!team.tagline },
    { id: "description", label: "Description", weight: 5, passed: !!team.description_summary },
    { id: "discipline", label: "Primary Discipline", weight: 5, passed: !!team.primary_discipline },
    { id: "team_level", label: "Team Level", weight: 5, passed: !!team.team_level },
    { id: "founded_year", label: "Founded Year", weight: 5, passed: !!team.founded_year },
    { id: "headquarters", label: "Headquarters Location", weight: 5, passed: !!(team.headquarters_city && team.headquarters_state) },
    { id: "country", label: "Country", weight: 5, passed: !!team.country },
    { id: "website", label: "Website", weight: 5, passed: !!team.website_url },
    { id: "social", label: "Social Links", weight: 5, passed: !!(team.instagram_url || team.facebook_url || team.x_url || team.youtube_url) },
    { id: "ownership", label: "Ownership Claimed", weight: 4, passed: team.claim_status === "claimed" },
  ];
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);
  const missing = checks.filter(c => !c.passed).map(c => c.label);
  return { score, checks, missing };
}

function buildSEO(team, stats) {
  const title = `${team.name} — Team Profile | HIJINX`;
  const description = team.bio || team.description_summary || `${team.name} racing team profile on HIJINX. ${stats.career.starts} starts, ${stats.career.wins} wins, ${stats.career.championships} championships.`;
  const image = team.hero_image_url || team.logo_url || null;
  const url = team.slug ? `/teams/${team.slug}` : null;
  const structuredData = { "@context": "https://schema.org", "@type": "SportsTeam", name: team.name, description };
  if (image) structuredData.image = image;
  if (url) structuredData.url = `https://hijinxco.com${url}`;
  if (team.founded_year) structuredData.foundingDate = `${team.founded_year}-01-01`;
  if (team.headquarters_city || team.country) structuredData.homeLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: team.headquarters_city || null, addressRegion: team.headquarters_state || null, addressCountry: team.country || null } };
  if (team.website_url) structuredData.sameAs = [team.website_url, team.instagram_url, team.facebook_url, team.x_url, team.youtube_url].filter(Boolean);
  if (team.primary_discipline) structuredData.sport = team.primary_discipline;
  return { title, description, image, url, og_type: "profile", twitter_card: "summary_large_image", og_title: title, og_description: description, og_image: image, twitter_title: title, twitter_description: description, twitter_image: image, structured_data: structuredData };
}