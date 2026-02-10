import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list();
    let updated = 0;

    for (const driver of drivers) {
      // Skip if slug already exists
      if (driver.slug) continue;
      
      // Skip if numeric_id is missing
      if (!driver.numeric_id) continue;

      const slugBase = `${driver.first_name} ${driver.last_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const slug = `${slugBase}-${driver.numeric_id}`;

      await base44.asServiceRole.entities.Driver.update(driver.id, { slug });
      updated++;
    }

    return Response.json({
      success: true,
      updated,
      message: `Successfully generated slugs for ${updated} drivers`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});