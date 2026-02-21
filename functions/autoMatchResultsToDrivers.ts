import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all drivers
    const drivers = await base44.entities.Driver.list();

    let updatedCount = 0;

    // For each driver, check if there are any results with matching name but no driver_id
    for (const driver of drivers) {
      if (!driver.first_name || !driver.last_name) continue;

      // Find all results matching this driver's name
      const matchingResults = await base44.entities.Results.filter({});
      
      for (const result of matchingResults) {
        // Check if result matches driver by name but doesn't have driver_id set
        const nameMatches = 
          result.driver_first_name?.toLowerCase() === driver.first_name.toLowerCase() &&
          result.driver_last_name?.toLowerCase() === driver.last_name.toLowerCase();

        if (nameMatches && !result.driver_id) {
          // Link this result to the driver
          await base44.entities.Results.update(result.id, { driver_id: driver.id });
          updatedCount++;
        }
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