import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Maps NASCAR API track_type values to our entity enum
const TRACK_TYPE_MAP = {
  'Superspeedway': 'Speedway',
  'Intermediate': 'Oval',
  'Short Track': 'Short Track',
  'Road Course': 'Road Course',
  'Street Course': 'Street Circuit',
  'Dirt Track': 'Dirt Track',
  'Oval': 'Oval',
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const {
      series_ids = [1, 2, 3],
      season_year = 2026,
      dry_run = false,
    } = body;

    const log = [];
    const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };

    // Fetch all existing tracks once
    const existingTracks = await base44.asServiceRole.entities.Track.list();
    const trackByName = {};
    for (const t of existingTracks) {
      trackByName[t.name.toLowerCase().trim()] = t;
    }

    // Collect unique tracks across all series
    const tracksMap = new Map(); // track_id -> track data from API

    for (const seriesId of series_ids) {
      const url = `https://cf.nascar.com/cacher/${season_year}/${seriesId}/schedule-feed.json`;
      log.push(`Fetching schedule for series ${seriesId}: ${url}`);

      const res = await fetch(url);
      if (!res.ok) {
        log.push(`  ERROR fetching series ${seriesId}: HTTP ${res.status}`);
        continue;
      }

      const schedule = await res.json();

      for (const entry of schedule) {
        if (!entry.track_id || !entry.track_name) continue;
        if (tracksMap.has(entry.track_id)) continue;

        tracksMap.set(entry.track_id, {
          track_id: entry.track_id,
          track_name: (entry.track_name || '').trim(),
          city: entry.city || null,
          state: entry.state || null,
          track_length: entry.track_length || null,
          track_type: entry.track_type || null,
          surface: entry.surface || null,
        });
      }
    }

    log.push(`Found ${tracksMap.size} unique tracks across all series`);

    // For each track, enrich with AI if needed and create/update
    for (const [, apiTrack] of tracksMap) {
      const tName = apiTrack.track_name;
      if (!tName) continue;

      const tKey = tName.toLowerCase().trim();
      const existing = trackByName[tKey];

      // Build what we know from the API
      const apiData = {};
      if (apiTrack.city) apiData.location_city = apiTrack.city;
      if (apiTrack.state) apiData.location_state = apiTrack.state;
      if (apiTrack.track_length) apiData.length = parseFloat(apiTrack.track_length);
      if (apiTrack.track_type) {
        const mappedType = TRACK_TYPE_MAP[apiTrack.track_type];
        if (mappedType) apiData.track_type = mappedType;
      }
      if (apiTrack.surface) {
        const validSurfaces = ["Asphalt", "Concrete", "Dirt", "Clay", "Mixed"];
        const surfaceCapitalized = apiTrack.surface.charAt(0).toUpperCase() + apiTrack.surface.slice(1).toLowerCase();
        if (validSurfaces.includes(surfaceCapitalized)) apiData.surface_type = surfaceCapitalized;
      }

      // If API data is sparse, enrich with AI
      const needsEnrichment = !apiData.location_city || !apiData.length || !apiData.track_type;
      if (needsEnrichment) {
        try {
          log.push(`  Enriching "${tName}" via AI (sparse API data)`);
          const enriched = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Look up accurate details about the racing track: "${tName}".

Return:
- city: city where the track is located
- state: US state abbreviation (e.g. "FL", "NC", "TN")
- country: country (usually "United States")
- track_length: length in miles as a decimal (e.g. 2.5)
- surface_type: one of exactly: "Asphalt", "Concrete", "Dirt", "Clay", "Mixed"
- banking: banking description (e.g. "31 degrees in turns")
- track_type: one of exactly: "Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Dirt Track", "Other"
- website_url: official website URL
- description: 2-3 sentences about the track's history and characteristics

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
                banking: { type: 'string' },
                track_type: { type: 'string' },
                website_url: { type: 'string' },
                description: { type: 'string' },
              }
            }
          });

          if (enriched.city && !apiData.location_city) apiData.location_city = enriched.city;
          if (enriched.state && !apiData.location_state) apiData.location_state = enriched.state;
          if (enriched.country) apiData.location_country = enriched.country;
          if (enriched.track_length && !apiData.length) apiData.length = enriched.track_length;
          if (enriched.surface_type && !apiData.surface_type) apiData.surface_type = enriched.surface_type;
          if (enriched.banking) apiData.banking = enriched.banking;
          if (enriched.track_type && !apiData.track_type) {
            const validTypes = ["Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"];
            if (validTypes.includes(enriched.track_type)) apiData.track_type = enriched.track_type;
          }
          if (enriched.website_url) apiData.website_url = enriched.website_url;
          if (enriched.description) apiData.description = enriched.description;

        } catch (e) {
          log.push(`  AI enrichment failed for "${tName}": ${e.message}`);
        }
      }

      if (!apiData.location_country) apiData.location_country = 'United States';

      if (existing) {
        // Update only fields that are missing or empty
        const updates = {};
        if (apiData.location_city && !existing.location_city) updates.location_city = apiData.location_city;
        if (apiData.location_state && !existing.location_state) updates.location_state = apiData.location_state;
        if (apiData.location_country && !existing.location_country) updates.location_country = apiData.location_country;
        if (apiData.length && !existing.length) updates.length = apiData.length;
        if (apiData.track_type && !existing.track_type) updates.track_type = apiData.track_type;
        if (apiData.surface_type && !existing.surface_type) updates.surface_type = apiData.surface_type;
        if (apiData.banking && !existing.banking) updates.banking = apiData.banking;
        if (apiData.website_url && !existing.website_url) updates.website_url = apiData.website_url;
        if (apiData.description && !existing.description) updates.description = apiData.description;

        if (Object.keys(updates).length > 0) {
          log.push(`  UPDATE "${tName}": ${Object.keys(updates).join(', ')}`);
          if (!dry_run) {
            await base44.asServiceRole.entities.Track.update(existing.id, updates);
          }
          stats.updated++;
        } else {
          log.push(`  SKIP "${tName}" (already complete)`);
          stats.skipped++;
        }
      } else {
        // Create new track
        const newTrack = {
          name: tName,
          slug: slugify(tName),
          status: 'Active',
          location_country: 'United States',
          ...apiData,
        };

        log.push(`  CREATE "${tName}" — ${apiData.location_city || '?'}, ${apiData.location_state || '?'} | ${apiData.length || '?'}mi | ${apiData.track_type || '?'}`);
        if (!dry_run) {
          const created = await base44.asServiceRole.entities.Track.create(newTrack);
          trackByName[tKey] = created;
        }
        stats.created++;
      }
    }

    return Response.json({
      success: true,
      dry_run,
      season: season_year,
      total_tracks_found: tracksMap.size,
      stats,
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});