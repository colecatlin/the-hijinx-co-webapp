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
      limit = 10,            // how many drivers to enrich per run (to avoid timeout)
      skip_if_has_dob = true, // skip drivers that already have real DOB
      driver_ids = null,      // optional: specific driver IDs to enrich
    } = body;

    const allDrivers = await base44.asServiceRole.entities.Driver.list();

    // Filter to drivers that need enrichment
    let toEnrich = allDrivers.filter(d => {
      if (driver_ids) return driver_ids.includes(d.id);
      if (skip_if_has_dob && d.date_of_birth && d.date_of_birth !== '2000-01-01') return false;
      return d.primary_discipline === 'Stock Car' || !d.primary_discipline;
    }).slice(0, limit);

    const log = [];
    const enriched = [];
    const failed = [];

    for (const driver of toEnrich) {
      const fullName = `${driver.first_name} ${driver.last_name}`;
      log.push(`\nEnriching: ${fullName}`);

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Look up detailed information about NASCAR driver ${fullName}.

Return accurate information about this specific driver:
- date_of_birth: ISO date string (YYYY-MM-DD), or null if unknown
- hometown_city: city they grew up in
- hometown_state: state/region they grew up in  
- hometown_country: country (usually "United States")
- twitter_handle: their Twitter/X handle without the @ symbol (e.g. "KyleLarsonRacin"), or null
- instagram_handle: their Instagram handle without @ (e.g. "kylelarsonracin"), or null
- primary_number: their primary car number as a string (e.g. "5")
- manufacturer: one of "Chevrolet", "Ford", "Toyota", or null
- bio: 2-3 sentence summary of their racing career

Only return data you are confident is accurate. Use null for anything uncertain.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              date_of_birth: { type: 'string' },
              hometown_city: { type: 'string' },
              hometown_state: { type: 'string' },
              hometown_country: { type: 'string' },
              twitter_handle: { type: 'string' },
              instagram_handle: { type: 'string' },
              primary_number: { type: 'string' },
              manufacturer: { type: 'string' },
              bio: { type: 'string' },
            }
          }
        });

        const updates = {};
        if (result.date_of_birth && result.date_of_birth !== '2000-01-01') updates.date_of_birth = result.date_of_birth;
        if (result.hometown_city && !driver.hometown_city) updates.hometown_city = result.hometown_city;
        if (result.hometown_state && !driver.hometown_state) updates.hometown_state = result.hometown_state;
        if (result.hometown_country && !driver.hometown_country) updates.hometown_country = result.hometown_country;
        if (result.primary_number && !driver.primary_number) updates.primary_number = result.primary_number;
        const validMfrs = ['Chevrolet', 'Ford', 'Toyota', 'Honda'];
        if (result.manufacturer && !driver.manufacturer && validMfrs.includes(result.manufacturer)) {
          updates.manufacturer = result.manufacturer;
        }

        log.push(`  Found: DOB=${result.date_of_birth}, City=${result.hometown_city}, #${result.primary_number}`);
        log.push(`  Updates: ${JSON.stringify(updates)}`);

        if (!dry_run && Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Driver.update(driver.id, updates);
        }

        enriched.push({ name: fullName, updates });

      } catch (e) {
        log.push(`  ERROR: ${e.message}`);
        failed.push(fullName);
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