import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all drivers and build a normalized name -> id map
    const allDrivers = await base44.asServiceRole.entities.Driver.list();
    const driverMap = {};
    for (const d of allDrivers) {
      const key = `${d.first_name} ${d.last_name}`.toLowerCase().trim();
      driverMap[key] = d.id;
    }

    // Fetch all standings with no driver_id
    const standings = await base44.asServiceRole.entities.DriverStanding.list();
    const unlinked = standings.filter(s => !s.driver_id && s.driver_name);

    let linked = 0;
    let unmatched = [];

    for (const standing of unlinked) {
      const key = standing.driver_name.toLowerCase().trim();
      const driverId = driverMap[key];
      if (driverId) {
        await base44.asServiceRole.entities.DriverStanding.update(standing.id, { driver_id: driverId });
        linked++;
      } else {
        unmatched.push(standing.driver_name);
      }
    }

    return Response.json({ success: true, linked, unmatched, total_unlinked: unlinked.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});