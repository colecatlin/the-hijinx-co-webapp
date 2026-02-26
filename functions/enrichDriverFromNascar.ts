import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { slugify, normalizeManufacturer } from './helpers/stringUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { driver_id, first_name, last_name, dry_run = true } = body;

    if (!first_name || !last_name) {
      return Response.json({ error: 'first_name and last_name are required' }, { status: 400 });
    }

    const slug = slugify(`${first_name} ${last_name}`);
    const nascarUrl = `https://www.nascar.com/drivers/${slug}/`;

    const schema = {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        date_of_birth: { type: 'string', description: 'ISO date format YYYY-MM-DD' },
        hometown_city: { type: 'string' },
        hometown_state: { type: 'string', description: '2-letter state abbreviation' },
        hometown_country: { type: 'string', description: 'Full country name' },
        primary_number: { type: 'string' },
        team_name: { type: 'string' },
        manufacturer: { type: 'string' },
        series: { type: ['string', 'null'] },
        bio: { type: ['string', 'null'], description: 'Short bio or description' },
        social_instagram: { type: ['string', 'null'] },
        social_x: { type: ['string', 'null'] },
        website_url: { type: ['string', 'null'] },
        raw_url_used: { type: 'string' },
      }
    };

    const prompt = `Fetch the NASCAR driver profile page at: ${nascarUrl}

Extract all available information about this driver including:
- Full name (first and last)
- Date of birth (YYYY-MM-DD format)
- Hometown (city, state, country)
- Car number
- Team name
- Manufacturer (Toyota, Ford, Chevrolet)
- Primary series they compete in
- Short bio or description if available
- Social media handles (Instagram, X/Twitter)
- Personal or team website

Also confirm the raw URL you fetched so we can verify it matched.

Return null for any fields not found on the page.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
    });

    // If dry_run, just return what we found without writing to DB
    if (dry_run) {
      return Response.json({
        success: true,
        dry_run: true,
        nascar_url: nascarUrl,
        extracted: aiResponse,
        message: 'Dry run — no data was written. Pass dry_run: false to update the driver record.',
      });
    }

    // Find the driver record
    let driverId = driver_id;
    if (!driverId) {
      const drivers = await base44.asServiceRole.entities.Driver.list();
      const found = drivers.find(d =>
        d.first_name?.toLowerCase() === first_name.toLowerCase() &&
        d.last_name?.toLowerCase() === last_name.toLowerCase()
      );
      if (!found) {
        return Response.json({ error: `Driver "${first_name} ${last_name}" not found in database` }, { status: 404 });
      }
      driverId = found.id;
    }

    // Build update payload — only update fields that have values from NASCAR
    const updatePayload = {};
    if (aiResponse.date_of_birth && aiResponse.date_of_birth !== '2000-01-01') updatePayload.date_of_birth = aiResponse.date_of_birth;
    if (aiResponse.hometown_city) updatePayload.hometown_city = aiResponse.hometown_city;
    if (aiResponse.hometown_state) updatePayload.hometown_state = aiResponse.hometown_state;
    if (aiResponse.hometown_country) updatePayload.hometown_country = aiResponse.hometown_country;
    if (aiResponse.primary_number) updatePayload.primary_number = aiResponse.primary_number;

    // Normalize manufacturer to valid enum value
    if (aiResponse.manufacturer) {
      updatePayload.manufacturer = normalizeManufacturer(aiResponse.manufacturer);
    }

    // Try to match team_name to an existing Team record
    if (aiResponse.team_name) {
      const teams = await base44.asServiceRole.entities.Team.list();
      const matchedTeam = teams.find(t =>
        t.name?.toLowerCase().includes(aiResponse.team_name.toLowerCase()) ||
        aiResponse.team_name.toLowerCase().includes(t.name?.toLowerCase())
      );
      if (matchedTeam) updatePayload.team_id = matchedTeam.id;
    }

    await base44.asServiceRole.entities.Driver.update(driverId, updatePayload);

    // Update DriverMedia if social data found
    if (aiResponse.social_instagram || aiResponse.social_x || aiResponse.website_url) {
      const mediaRecords = await base44.asServiceRole.entities.DriverMedia.filter({ driver_id: driverId });
      const mediaPayload = {};
      if (aiResponse.social_instagram) mediaPayload.social_instagram = aiResponse.social_instagram;
      if (aiResponse.social_x) mediaPayload.social_x = aiResponse.social_x;
      if (aiResponse.website_url) mediaPayload.website_url = aiResponse.website_url;

      if (mediaRecords.length > 0) {
        await base44.asServiceRole.entities.DriverMedia.update(mediaRecords[0].id, mediaPayload);
      } else {
        await base44.asServiceRole.entities.DriverMedia.create({ driver_id: driverId, ...mediaPayload });
      }
    }

    return Response.json({
      success: true,
      dry_run: false,
      driver_id: driverId,
      nascar_url: nascarUrl,
      extracted: aiResponse,
      updated_fields: updatePayload,
      team_matched: updatePayload.team_id ? aiResponse.team_name : null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});