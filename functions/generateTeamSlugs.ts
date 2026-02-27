import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getUniqueSlug(baseSlug, existingSlugs) {
  let slug = baseSlug;
  let counter = 1;
  const original = baseSlug;

  while (existingSlugs.includes(slug)) {
    slug = `${original}-${counter}`;
    counter++;
  }

  return slug;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all teams
    const allTeams = await base44.asServiceRole.entities.Team.list();
    
    // Get teams without slugs
    const teamsWithoutSlugs = allTeams.filter(team => !team.slug || team.slug.trim() === '');
    
    if (teamsWithoutSlugs.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'All teams already have slugs',
        updated: 0 
      });
    }

    // Get existing slugs
    const existingSlugs = allTeams
      .filter(team => team.slug && team.slug.trim() !== '')
      .map(team => team.slug);

    // Generate and update slugs
    const updated = [];
    for (const team of teamsWithoutSlugs) {
      const baseSlug = generateSlug(team.name);
      const uniqueSlug = getUniqueSlug(baseSlug, existingSlugs);
      
      await base44.asServiceRole.entities.Team.update(team.id, { slug: uniqueSlug });
      existingSlugs.push(uniqueSlug);
      
      updated.push({
        id: team.id,
        name: team.name,
        slug: uniqueSlug
      });
    }

    return Response.json({
      success: true,
      message: `Generated ${updated.length} team slugs`,
      updated: updated.length,
      teams: updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});