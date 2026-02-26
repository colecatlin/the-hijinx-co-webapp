import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list();
    const driversNeedingSlug = drivers.filter(d => !d.slug);

    if (driversNeedingSlug.length === 0) {
      return Response.json({ message: 'All drivers have slugs', updated: 0 });
    }

    const allSlugs = drivers.map(d => d.slug).filter(Boolean);
    const updates = [];

    for (const driver of driversNeedingSlug) {
      const baseName = `${driver.first_name}-${driver.last_name}`.toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseName;
      let counter = 1;

      // Find unique slug
      while (allSlugs.includes(slug) || updates.some(u => u.slug === slug)) {
        slug = `${baseName}-${counter}`;
        counter++;
      }

      updates.push({ id: driver.id, slug });
      allSlugs.push(slug);
    }

    // Batch update
    for (const update of updates) {
      await base44.asServiceRole.entities.Driver.update(update.id, { slug: update.slug });
    }

    return Response.json({
      message: `Generated slugs for ${updates.length} drivers`,
      updated: updates.length,
      samples: updates.slice(0, 5).map(u => ({ id: u.id, slug: u.slug }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});