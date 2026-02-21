import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all drivers and results
    const drivers = await base44.entities.Driver.list();
    const results = await base44.entities.Results.list();

    let updatedCount = 0;
    const updates = [];

    // For each result without a driver_id or with empty driver_id
    for (const result of results) {
      if (!result.driver_id && result.driver_first_name && result.driver_last_name) {
        // Try to find matching driver
        const matchingDriver = drivers.find(d => 
          d.first_name?.toLowerCase() === result.driver_first_name?.toLowerCase() &&
          d.last_name?.toLowerCase() === result.driver_last_name?.toLowerCase()
        );

        if (matchingDriver) {
          updates.push({
            id: result.id,
            driver_id: matchingDriver.id
          });
          updatedCount++;
        }
      }
    }

    // Batch update all matched results
    for (const update of updates) {
      await base44.entities.Results.update(update.id, { driver_id: update.driver_id });
    }

    return Response.json({ 
      success: true,
      updatedCount,
      message: `Successfully matched ${updatedCount} results to drivers`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});