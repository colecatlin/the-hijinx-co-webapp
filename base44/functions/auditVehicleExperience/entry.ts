/**
 * auditVehicleExperience
 * Phase 12 — Read-only integrity audit for the public Vehicle experience.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function resolveVehicle(base44, slug, vehicle_id) {
  if (slug) {
    const list = await base44.asServiceRole.entities.Vehicle.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (vehicle_id) return await base44.asServiceRole.entities.Vehicle.get(vehicle_id).catch(() => null);
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, vehicle_id } = body;
    if (!slug && !vehicle_id) return Response.json({ error: "slug or vehicle_id is required" }, { status: 400 });

    const vehicle = await resolveVehicle(base44, slug, vehicle_id);
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

    const [entries, results, standings, allDrivers, allTeams, allEvents] = await Promise.all([
      base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Driver.list().catch(() => []),
      base44.asServiceRole.entities.Team.list().catch(() => []),
      base44.asServiceRole.entities.Event.list().catch(() => []),
    ]);

    const vehicleId = vehicle.id;
    const vehicleEntries = entries.filter(e => e.vehicle_id === vehicleId);
    const entryIds = new Set(vehicleEntries.map(e => e.id));
    const vehicleResults = results.filter(r => (r.entry_id && entryIds.has(r.entry_id)) || r.vehicle_id === vehicleId);
    const driverMap = new Map(); allDrivers.forEach(d => driverMap.set(d.id, d));
    const teamMap = new Map(); allTeams.forEach(t => teamMap.set(t.id, t));
    const eventMap = new Map(); allEvents.forEach(e => eventMap.set(e.id, e));

    const findings = [];

    if (!vehicle.nickname && !vehicle.model) findings.push({ category: "identity", severity: "high", message: "No nickname or model — vehicle has no display name" });
    if (!vehicle.slug) findings.push({ category: "seo", severity: "high", message: "Slug missing — public URL will not work" });
    if (!vehicle.profile_image_url) findings.push({ category: "image", severity: "low", message: "Profile image missing" });
    if (!vehicle.hero_image_url) findings.push({ category: "image", severity: "low", message: "Hero image missing" });
    if (!vehicle.manufacturer) findings.push({ category: "specs", severity: "medium", message: "Manufacturer missing" });
    if (!vehicle.vehicle_type) findings.push({ category: "specs", severity: "medium", message: "Vehicle type missing" });
    if (!vehicle.chassis_id) findings.push({ category: "chassis", severity: "low", message: "Chassis ID missing — chassis history will be limited" });
    if (!vehicle.chassis_builder) findings.push({ category: "chassis", severity: "low", message: "Chassis builder missing" });
    if (!vehicle.engine_platform) findings.push({ category: "engine", severity: "low", message: "Engine platform missing — engine history will be limited" });
    if (vehicle.claim_status === "claimed" && !vehicle.owner_user_id) findings.push({ category: "ownership", severity: "high", message: "Claim status is 'claimed' but owner_user_id is null" });
    if (vehicle.owner_user_id && vehicle.claim_status !== "claimed") findings.push({ category: "ownership", severity: "medium", message: `owner_user_id is set but claim_status is '${vehicle.claim_status}'` });
    if (vehicle.owner_driver_id && !driverMap.get(vehicle.owner_driver_id)) findings.push({ category: "references", severity: "medium", message: "owner_driver_id references a missing driver" });
    if (vehicle.owner_team_id && !teamMap.get(vehicle.owner_team_id)) findings.push({ category: "references", severity: "medium", message: "owner_team_id references a missing team" });

    const brokenEntryRefs = vehicleEntries.filter(e => !eventMap.get(e.event_id));
    if (brokenEntryRefs.length > 0) findings.push({ category: "entries", severity: "high", message: `${brokenEntryRefs.length} entries reference missing events` });
    const brokenResultRefs = vehicleResults.filter(r => !eventMap.get(r.event_id));
    if (brokenResultRefs.length > 0) findings.push({ category: "results", severity: "high", message: `${brokenResultRefs.length} results reference missing events` });
    const brokenDriverRefs = vehicleEntries.filter(e => e.driver_id && !driverMap.get(e.driver_id));
    if (brokenDriverRefs.length > 0) findings.push({ category: "drivers", severity: "medium", message: `${brokenDriverRefs.length} entries reference missing drivers` });
    const brokenTeamRefs = vehicleEntries.filter(e => e.team_id && !teamMap.get(e.team_id));
    if (brokenTeamRefs.length > 0) findings.push({ category: "teams", severity: "medium", message: `${brokenTeamRefs.length} entries reference missing teams` });

    if (!vehicle.bio) findings.push({ category: "content", severity: "medium", message: "No biography" });
    if (vehicle.visibility_status === "draft") findings.push({ category: "visibility", severity: "medium", message: "Profile visibility is draft" });
    if (vehicleEntries.length === 0) findings.push({ category: "history", severity: "medium", message: "No entries — history will be empty" });
    if (vehicleResults.length === 0) findings.push({ category: "statistics", severity: "low", message: "No results — statistics will be empty" });
    if (!vehicle.profile_image_url && !vehicle.hero_image_url) findings.push({ category: "sharing", severity: "medium", message: "No images for social sharing" });

    const critical = findings.filter(f => f.severity === "critical").length;
    const high = findings.filter(f => f.severity === "high").length;
    const medium = findings.filter(f => f.severity === "medium").length;
    const low = findings.filter(f => f.severity === "low").length;
    const status = critical > 0 ? "critical" : high > 0 ? "issues" : medium > 0 || low > 0 ? "warnings" : "healthy";

    return Response.json({ vehicle_id: vehicle.id, vehicle_name: vehicle.nickname || `${vehicle.manufacturer || ""} ${vehicle.model || ""}`.trim(), status, summary: { critical, high, medium, low, total: findings.length }, findings });
  } catch (err) {
    console.error("[auditVehicleExperience] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}