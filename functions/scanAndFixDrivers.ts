
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all drivers
    const allDrivers = await base44.asServiceRole.entities.Driver.list('-updated_date', 1000);

    // Find drivers missing profile_status
    const missingStatus = allDrivers.filter(d => !d.profile_status);

    // Find duplicates by first_name + last_name
    const nameMap = {};
    const duplicates = [];

    for (const driver of allDrivers) {
      const key = `${driver.first_name}||${driver.last_name}`;
      if (!nameMap[key]) {
        nameMap[key] = [];
      }
      nameMap[key].push(driver);
    }

    // Identify duplicate groups (keeping most recent)
    for (const key in nameMap) {
      if (nameMap[key].length > 1) {
        const group = nameMap[key].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
        duplicates.push({
          name: key,
          keep: group[0],
          delete: group.slice(1)
        });
      }
    }

    // Fix missing profile_status (set to 'draft')
    for (const driver of missingStatus) {
      await base44.asServiceRole.entities.Driver.update(driver.id, { profile_status: 'draft' });
    }

    // Delete duplicates (keep most recently updated)
    let deletedCount = 0;
    for (const dup of duplicates) {
      for (const driverToDelete of dup.delete) {
        await base44.asServiceRole.entities.Driver.delete(driverToDelete.id);
        deletedCount++;
      }
    }

    return Response.json({
      status: 'success',
      summary: {
        totalDrivers: allDrivers.length,
        missingStatusFixed: missingStatus.length,
        duplicateGroupsFound: duplicates.length,
        duplicatesDeleted: deletedCount,
        duplicateDetails: duplicates.map(d => ({
          name: d.name,
          kept: { id: d.keep.id, updatedDate: d.keep.updated_date },
          deleted: d.delete.map(dr => ({ id: dr.id, updatedDate: dr.updated_date }))
        }))
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});