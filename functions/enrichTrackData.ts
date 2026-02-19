import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tracks = await base44.asServiceRole.entities.Track.list();

    // Find tracks that need enrichment (missing city/state or city === name)
    const tracksToEnrich = tracks.filter(t => {
      return !t.location_state || t.location_city === t.name || !t.location_city || !t.surface_type || !t.length;
    });

    if (tracksToEnrich.length === 0) {
      return Response.json({ success: true, message: 'All tracks already have complete data', updated: 0 });
    }

    // Build a list of track names for AI lookup
    const trackNames = tracksToEnrich.map(t => t.name);

    const prompt = `You are a motorsports data expert. For each of the following racing tracks/venues, provide accurate factual data.

Track names:
${trackNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

For each track, provide:
- name: exact track name as given
- location_city: the actual city where the track is located (NOT the track name)
- location_state: 2-letter US state code, or full name for international locations (e.g., "Mexico City" area = "CDMX"), or null if not in US
- location_country: country name (e.g., "United States", "Mexico", "Canada")
- track_type: one of "Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"
- surface_type: one of "Asphalt", "Concrete", "Dirt", "Clay", "Mixed"
- length: track length in miles as a number (null if unknown)
- description: 1-2 sentence description of the track

Notes:
- "EchoPark Speedway" is the former Atlanta Motor Speedway reconfigured as a superspeedway in Hampton, GA
- "San Diego Street Course" is a street circuit in San Diego, CA
- "Circuit of The Americas" (COTA) is in Austin, TX
- "Autódromo Hermanos Rodríguez" is in Mexico City, Mexico
- "Michigan Speedway" is in Brooklyn, MI (2.0 mile oval)
- Use accurate real-world data for all tracks`;

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
      const match = tracksToEnrich.find(t => t.name === enriched.name);
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
      message: `Enriched ${updated} tracks with AI data`,
      updated,
      tracksProcessed: trackNames,
      enrichedData: enrichedTracks,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});