import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateBaseSlug(firstName, lastName) {
  if (!firstName || !lastName) return null;
  return `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function getUniqueSlug(baseSlug, base44, excludeId) {
  // Check if base slug exists
  const existing = await base44.asServiceRole.entities.Driver.filter({ slug: baseSlug });
  const filtered = existing.filter(d => d.id !== excludeId);
  
  if (filtered.length === 0) {
    return baseSlug;
  }

  // Find next available numbered slug
  let counter = 1;
  let candidateSlug = `${baseSlug}-${counter}`;
  
  while (true) {
    const existingWithNumber = await base44.asServiceRole.entities.Driver.filter({ 
      slug: candidateSlug 
    });
    const filteredWithNumber = existingWithNumber.filter(d => d.id !== excludeId);
    
    if (filteredWithNumber.length === 0) {
      return candidateSlug;
    }
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
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
      const baseSlug = generateBaseSlug(data.first_name, data.last_name);
      if (baseSlug) {
        const uniqueSlug = await getUniqueSlug(baseSlug, base44, event.entity_id);
        await base44.asServiceRole.entities.Driver.update(event.entity_id, { slug: uniqueSlug });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});