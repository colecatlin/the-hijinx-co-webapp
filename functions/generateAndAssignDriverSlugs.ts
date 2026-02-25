import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateSlug(firstName, lastName) {
  if (!firstName || !lastName) return null;
  return `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all drivers
    const drivers = await base44.asServiceRole.entities.Driver.list();
    
    // Filter drivers without slugs
    const driversNeedingSlug = drivers.filter(d => !d.slug);
    
    if (driversNeedingSlug.length === 0) {
      return Response.json({ message: 'All drivers already have slugs', updated: 0 });
    }

    // Update each driver with a generated slug
    const updates = [];
    for (const driver of driversNeedingSlug) {
      const slug = generateSlug(driver.first_name, driver.last_name);
      if (slug) {
        updates.push(
          base44.asServiceRole.entities.Driver.update(driver.id, { slug })
        );
      }
    }

    await Promise.all(updates);

    return Response.json({ 
      message: 'Slugs generated successfully', 
      updated: updates.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});