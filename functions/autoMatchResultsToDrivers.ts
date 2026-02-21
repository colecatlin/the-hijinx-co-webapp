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
    const allResults = await base44.entities.Results.list();

    let updatedCount = 0;
    const updates = [];

    // For each result, check if it needs driver_id linked
    for (const result of allResults) {
      if (result.driver_id) continue; // Already has driver_id
      
      // Try to match by name from various fields
      const resultFirstName = (result.driver_first_name || result.first_name || '').toLowerCase().trim();
      const resultLastName = (result.driver_last_name || result.last_name || '').toLowerCase().trim();
      
      if (!resultFirstName || !resultLastName) continue;

      // Find matching driver (case-insensitive match)
      const matchingDriver = drivers.find(d => 
        d.first_name?.toLowerCase().trim() === resultFirstName &&
        d.last_name?.toLowerCase().trim() === resultLastName
      );

      if (matchingDriver) {
        updates.push({
          id: result.id,
          driver_id: matchingDriver.id
        });
        updatedCount++;
      }
    }

    // Batch update all matches
    for (const update of updates) {
      await base44.entities.Results.update(update.id, { driver_id: update.driver_id });
    }

    return Response.json({ 
      success: true,
      updatedCount,
      message: `Successfully linked ${updatedCount} results to drivers`,
      details: updates
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});