import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tracks = await base44.asServiceRole.entities.Track.list();

    if (tracks.length === 0) {
      return Response.json({ success: true, message: 'No tracks found', updated: 0 });
    }

    const BATCH_SIZE = 5;
    let updated = 0;
    const allEnriched = [];

    const schema = {
      type: 'object',
      properties: {
        tracks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              location_city: { type: 'string' },
              location_state: { type: ['string', 'null'] },
              location_country: { type: 'string' },
              track_type: { type: 'string' },
              surface_type: { type: ['string', 'null'] },
              length: { type: ['number', 'null'] },
              description: { type: ['string', 'null'] },
            }
          }
        }
      }
    };

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      const batchNames = batch.map(t => t.name);

      const prompt = `You are a motorsports data expert. Search the internet and look up accurate, real-world information for each of these racing tracks/venues:

${batchNames.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}

For EACH track return:
- name: exact track name as listed
- location_city: actual city/town where the track is physically located (NOT the track name)
- location_state: 2-letter US state code (e.g. "FL"), regional code for international, or null
- location_country: full country name (e.g. "United States", "Mexico")
- track_type: one of: "Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"
- surface_type: one of: "Asphalt", "Concrete", "Dirt", "Clay", "Mixed"
- length: length in miles as a number (null if unknown)
- description: 1-2 sentence factual description`;

      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: schema,
      });

      const enrichedBatch = aiResponse.tracks || [];
      allEnriched.push(...enrichedBatch);

      for (const enriched of enrichedBatch) {
        const match = batch.find(t => t.name === enriched.name);
        if (!match) continue;

        await base44.asServiceRole.entities.Track.update(match.id, {
          location_city: enriched.location_city || match.location_city,
          location_state: enriched.location_state ?? match.location_state,
          location_country: enriched.location_country || match.location_country || 'United States',
          track_type: enriched.track_type || match.track_type,
          surface_type: enriched.surface_type || match.surface_type,
          length: enriched.length ?? match.length,
          description: enriched.description || match.description,
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      message: `AI-enriched ${updated} of ${tracks.length} tracks`,
      updated,
      total: tracks.length,
      enrichedData: allEnriched,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});