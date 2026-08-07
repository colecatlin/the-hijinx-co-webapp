/**
 * auditTeamExperience
 * Phase 11 — Read-only integrity audit for the public Team experience.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function resolveTeam(base44, slug, team_id) {
  if (slug) {
    const list = await base44.asServiceRole.entities.Team.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (team_id) return await base44.asServiceRole.entities.Team.get(team_id).catch(() => null);
  return null;
}

async function loadTeamContext(base44, team) {
  const teamId = team.id;
  const [entries, results, standings, driverPrograms, entrySponsors, allDrivers, allVehicles, allEvents, allTracks] = await Promise.all([
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverProgram.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
  ]);
  const teamEntries = entries.filter(e => e.team_id === teamId);
  const entryIds = new Set(teamEntries.map(e => e.id));
  const teamResults = results.filter(r => (r.entry_id && entryIds.has(r.entry_id)) || r.team_id === teamId);
  const teamDriverPrograms = driverPrograms.filter(dp => dp.team_id === teamId);
  const teamDriverIds = new Set(teamDriverPrograms.map(dp => dp.driver_id));
  const teamStandings = standings.filter(s => teamDriverIds.has(s.driver_id));
  const driverMap = new Map(); allDrivers.forEach(d => driverMap.set(d.id, d));
  const vehicleMap = new Map(); allVehicles.forEach(v => vehicleMap.set(v.id, v));
  const eventMap = new Map(); allEvents.forEach(e => eventMap.set(e.id, e));
  return { teamEntries, teamResults, teamStandings, teamDriverPrograms, driverMap, vehicleMap, eventMap };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, team_id } = body;
    if (!slug && !team_id) return Response.json({ error: "slug or team_id is required" }, { status: 400 });

    const team = await resolveTeam(base44, slug, team_id);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

    const ctx = await loadTeamContext(base44, team);
    const findings = [];

    if (!team.logo_url) findings.push({ category: "logo", severity: "low", message: "Team logo missing" });
    if (!team.hero_image_url) findings.push({ category: "hero_image", severity: "low", message: "Hero image missing" });
    if (team.claim_status === "claimed" && !team.owner_user_id) findings.push({ category: "ownership", severity: "high", message: "Claim status is 'claimed' but owner_user_id is null" });
    if (team.owner_user_id && team.claim_status !== "claimed") findings.push({ category: "ownership", severity: "medium", message: `owner_user_id is set but claim_status is '${team.claim_status}'` });
    if (ctx.teamDriverPrograms.length === 0 && ctx.teamEntries.length === 0) findings.push({ category: "roster", severity: "medium", message: "No driver programs or entries — roster will be empty" });
    const brokenEntryRefs = ctx.teamEntries.filter(e => !ctx.eventMap.get(e.event_id));
    if (brokenEntryRefs.length > 0) findings.push({ category: "entries", severity: "high", message: `${brokenEntryRefs.length} entries reference missing events` });
    const brokenResultRefs = ctx.teamResults.filter(r => !ctx.eventMap.get(r.event_id));
    if (brokenResultRefs.length > 0) findings.push({ category: "results", severity: "high", message: `${brokenResultRefs.length} results reference missing events` });
    const brokenDriverRefs = ctx.teamEntries.filter(e => e.driver_id && !ctx.driverMap.get(e.driver_id));
    if (brokenDriverRefs.length > 0) findings.push({ category: "drivers", severity: "medium", message: `${brokenDriverRefs.length} entries reference missing drivers` });
    if (!team.slug) findings.push({ category: "seo", severity: "high", message: "Slug missing — public URL will not work" });
    if (!team.name) findings.push({ category: "seo", severity: "high", message: "Team name missing" });
    if (!team.bio && !team.description_summary) findings.push({ category: "seo", severity: "medium", message: "No bio or description" });
    if (!team.logo_url && !team.hero_image_url) findings.push({ category: "sharing", severity: "medium", message: "No images for social sharing" });
    if (team.visibility_status === "draft") findings.push({ category: "visibility", severity: "medium", message: "Profile visibility is draft" });

    const critical = findings.filter(f => f.severity === "critical").length;
    const high = findings.filter(f => f.severity === "high").length;
    const medium = findings.filter(f => f.severity === "medium").length;
    const low = findings.filter(f => f.severity === "low").length;
    const status = critical > 0 ? "critical" : high > 0 ? "issues" : medium > 0 || low > 0 ? "warnings" : "healthy";

    return Response.json({ team_id: team.id, team_name: team.name, status, summary: { critical, high, medium, low, total: findings.length }, findings });
  } catch (err) {
    console.error("[auditTeamExperience] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}