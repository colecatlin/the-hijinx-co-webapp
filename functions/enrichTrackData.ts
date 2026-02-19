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

    const trackNames = tracks.map(t => t.name);

    const prompt = `You are a motorsports data expert with access to the internet. Look up accurate, real-world information for each of the following racing tracks/venues and return complete data for all of them.

Track names to research:
${trackNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

For each track, provide:
- name: exact track name as given in the list above
- location_city: the actual city/town where the track is physically located (NOT the track name itself)
- location_state: 2-letter US state abbreviation (e.g. "FL", "CA"), or regional code for international (e.g. "CDMX" for Mexico City), or null if unknown
- location_country: full country name (e.g. "United States", "Mexico", "Canada")
- track_type: one of exactly: "Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"
- surface_type: one of exactly: "Asphalt", "Concrete", "Dirt", "Clay", "Mixed"
- length: track length in miles as a decimal number (null if genuinely unknown)
- description: 1-2 sentence factual description of the track including its history and significance

Return ALL tracks in the response, even ones you already know well.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
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
      }
    });

    const enrichedTracks = aiResponse.tracks || [];
    let updated = 0;

    for (const enriched of enrichedTracks) {
      const match = tracks.find(t => t.name === enriched.name);
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

    return Response.json({
      success: true,
      message: `AI-enriched ${updated} of ${tracks.length} tracks`,
      updated,
      total: tracks.length,
      enrichedData: enrichedTracks,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});