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
    const body = await req.json();

    const { event, data } = body;

    // Only handle create events
    if (event.type !== 'create') {
      return Response.json({ skipped: true });
    }

    // Generate slug if not present
    if (!data.slug && data.first_name && data.last_name) {
      const slug = generateSlug(data.first_name, data.last_name);
      if (slug) {
        await base44.asServiceRole.entities.Driver.update(event.entity_id, { slug });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});