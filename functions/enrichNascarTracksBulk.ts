import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      dry_run = false,
      limit = 5,
      track_ids = null,
    } = body;

    const allTracks = await base44.asServiceRole.entities.Track.list();

    // Filter tracks that need enrichment (missing city or length)
    let toEnrich = allTracks.filter(t => {
      if (track_ids) return track_ids.includes(t.id);
      return !t.city || !t.track_length;
    }).slice(0, limit);

    const log = [];
    const enriched = [];
    const failed = [];

    for (const track of toEnrich) {
      log.push(`\nEnriching: ${track.name}`);

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up detailed information about the NASCAR race track: "${track.name}".

Return accurate information about this specific track:
- city: city where the track is located
- state: state/region where the track is located
- country: country (usually "United States")
- track_length: length in miles as a decimal number (e.g. 2.5 for Daytona, 1.0 for Bristol)
- surface_type: one of "Asphalt", "Concrete", "Dirt", or "Mixed"
- banking_degrees: banking angle in degrees at the turns (e.g. 31 for Talladega)
- seating_capacity: approximate seating capacity as a number (e.g. 101500)
- year_opened: year the track opened (e.g. 1959)
- track_type: one of "Superspeedway", "Intermediate", "Short Track", "Road Course", "Street Course", "Dirt Track"
- website_url: official website URL
- description: 2-3 sentence description of this track's history and characteristics

Only return data you are confident is accurate. Use null for anything uncertain.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
              track_length: { type: 'number' },
              surface_type: { type: 'string' },
              banking_degrees: { type: 'number' },
              seating_capacity: { type: 'number' },
              year_opened: { type: 'number' },
              track_type: { type: 'string' },
              website_url: { type: 'string' },
              description: { type: 'string' },
            }
          }
        });

        // Map track_type to valid enum values
        const typeMap = {
          'Superspeedway': 'Speedway', 'Intermediate': 'Oval', 'Short Track': 'Short Track',
          'Road Course': 'Road Course', 'Street Course': 'Street Circuit', 'Dirt Track': 'Dirt Track',
        };
        const updates = {};
        if (result.city) updates.location_city = result.city;
        if (result.state) updates.location_state = result.state;
        if (result.country) updates.location_country = result.country;
        if (result.track_length && !track.length) updates.length = result.track_length;
        if (result.surface_type && !track.surface_type) updates.surface_type = result.surface_type;
        if (result.banking_degrees && !track.banking) updates.banking = result.banking_degrees?.toString();
        if (result.track_type && !track.track_type) updates.track_type = typeMap[result.track_type] || 'Other';
        if (result.website_url && !track.website_url) updates.website_url = result.website_url;
        if (result.description && !track.description) updates.description = result.description;

        log.push(`  Found: ${result.city}, ${result.state} | ${result.track_length}mi ${result.track_type}`);
        log.push(`  Updates: ${Object.keys(updates).join(', ')}`);

        if (!dry_run && Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Track.update(track.id, updates);
        }

        enriched.push({ name: track.name, updates });

      } catch (e) {
        log.push(`  ERROR: ${e.message}`);
        failed.push(track.name);
      }
    }

    return Response.json({
      success: true,
      dry_run,
      processed: toEnrich.length,
      enriched: enriched.length,
      failed: failed.length,
      failed_names: failed,
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});