import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const generateUniqueNumericId = async (existingIds) => {
      let numericId;
      let isUnique = false;
      
      while (!isUnique) {
        numericId = String(Math.floor(Math.random() * 90000000) + 10000000);
        isUnique = !existingIds.has(numericId);
      }
      
      existingIds.add(numericId);
      return numericId;
    };

    // Get all drivers
    const drivers = await base44.entities.Driver.list();
    
    // Collect existing numeric IDs
    const existingIds = new Set();
    drivers.forEach(d => {
      if (d.numeric_id) {
        existingIds.add(d.numeric_id);
      }
    });

    // Update drivers that don't have numeric_id
    const driversToUpdate = drivers.filter(d => !d.numeric_id);
    let updated = 0;

    for (const driver of driversToUpdate) {
      const numericId = await generateUniqueNumericId(existingIds);
      await base44.entities.Driver.update(driver.id, { numeric_id: numericId });
      updated++;
    }

    return Response.json({
      success: true,
      message: `Updated ${updated} drivers with numeric IDs`,
      driversUpdated: updated,
      totalDrivers: drivers.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});