import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// NASCAR tracks from all three major series
const NASCAR_TRACKS = [
  // Cup Series
  "Daytona International Speedway",
  "Atlanta Motor Speedway",
  "Las Vegas Motor Speedway",
  "Phoenix Raceway",
  "Auto Club Speedway",
  "COTA (Circuit of the Americas)",
  "Richmond Raceway",
  "Martinsville Speedway",
  "Talladega Superspeedway",
  "Dover Motor Speedway",
  "Darlington Raceway",
  "Charlotte Motor Speedway",
  "Sonoma Raceway",
  "Nashville Superspeedway",
  "Road America",
  "Pocono Raceway",
  "Indianapolis Motor Speedway",
  "Michigan International Speedway",
  "Watkins Glen International",
  "Bristol Motor Speedway",
  "New Hampshire Motor Speedway",
  "North Wilkesboro Speedway",
  "Kansas Speedway",
  "Texas Motor Speedway",
  "Homestead-Miami Speedway",
  "Iowa Speedway",
  "Chicago Street Course",
  // Xfinity & Truck additions
  "Portland International Raceway",
  "Mid-Ohio Sports Car Course",
  "World Wide Technology Raceway",
  "Knoxville Raceway",
  "Lucas Oil Indianapolis Raceway Park",
  "Orange County Speedway",
  "Bowman Gray Stadium",
  "Berlin Raceway",
  "South Boston Speedway",
  "Winchester Speedway",
  "Five Flags Speedway",
  "Hickory Motor Speedway",
  "Eldora Speedway",
  "Colorado National Speedway",
  "Mosport International Raceway",
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { dry_run = false, custom_tracks = null } = body;

    const tracksToSync = custom_tracks || NASCAR_TRACKS;

    // Fetch all existing tracks once
    const existingTracks = await base44.asServiceRole.entities.Track.list();
    const existingNames = new Set(existingTracks.map(t => t.name.toLowerCase().trim()));

    const log = [];
    const created = [];
    const skipped = [];
    const failed = [];

    for (const trackName of tracksToSync) {
      const normalizedName = trackName.toLowerCase().trim();

      if (existingNames.has(normalizedName)) {
        log.push(`SKIP: "${trackName}" already exists`);
        skipped.push(trackName);
        continue;
      }

      log.push(`FETCHING: "${trackName}"`);

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up detailed and accurate information about the racing track: "${trackName}".

Return the following fields:
- city: city where the track is located
- state: US state or region (abbreviation OK, e.g. "FL", "NC")
- country: country (usually "United States")
- track_length: length in miles as a decimal number (e.g. 2.5)
- surface_type: one of exactly: "Asphalt", "Concrete", "Dirt", "Clay", "Mixed"
- banking: banking description or degrees at the turns (e.g. "31 degrees", "banked turns")
- track_type: one of exactly: "Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"
- website_url: official website URL if known
- description: 2-3 sentence description of this track's history and notable characteristics

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

        const validSurfaces = ["Asphalt", "Concrete", "Dirt", "Clay", "Mixed"];
        const validTypes = ["Oval", "Road Course", "Street Circuit", "Short Track", "Speedway", "Off-Road", "Dirt Track", "Other"];

        const trackData = {
          name: trackName,
          slug: slugify(trackName),
          location_city: result.city || 'Unknown',
          location_state: result.state || null,
          location_country: result.country || 'United States',
          status: 'Active',
        };

        if (result.track_length) trackData.length = result.track_length;
        if (result.surface_type && validSurfaces.includes(result.surface_type)) trackData.surface_type = result.surface_type;
        if (result.banking) trackData.banking = result.banking;
        if (result.track_type && validTypes.includes(result.track_type)) trackData.track_type = result.track_type;
        if (result.website_url) trackData.website_url = result.website_url;
        if (result.description) trackData.description = result.description;

        log.push(`  → ${result.city}, ${result.state} | ${result.track_length}mi | ${result.track_type}`);

        if (!dry_run) {
          await base44.asServiceRole.entities.Track.create(trackData);
          existingNames.add(normalizedName); // prevent duplicates in same run
        }

        created.push(trackName);

      } catch (e) {
        log.push(`  ERROR: ${e.message}`);
        failed.push(trackName);
      }
    }

    return Response.json({
      success: true,
      dry_run,
      total_checked: tracksToSync.length,
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
      failed_names: failed,
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});