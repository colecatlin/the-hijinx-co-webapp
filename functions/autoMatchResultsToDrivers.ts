import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all drivers and results once
    const drivers = await base44.entities.Driver.list();
    const allResults = await base44.entities.Results.list();

    let updatedCount = 0;

    // For each result without driver_id, try to match to a driver by name
    for (const result of allResults) {
      if (result.driver_id) continue; // Skip if already linked
      if (!result.driver_first_name || !result.driver_last_name) continue;

      // Find matching driver
      const matchingDriver = drivers.find(d => 
        d.first_name?.toLowerCase() === result.driver_first_name.toLowerCase() &&
        d.last_name?.toLowerCase() === result.driver_last_name.toLowerCase()
      );

      if (matchingDriver) {
        await base44.entities.Results.update(result.id, { driver_id: matchingDriver.id });
        updatedCount++;
      }
    }

    return Response.json({ 
      success: true,
      updatedCount,
      message: `Successfully linked ${updatedCount} results to drivers`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});