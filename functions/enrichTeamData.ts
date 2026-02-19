import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const teams = await base44.asServiceRole.entities.Team.list();

    if (teams.length === 0) {
      return Response.json({ success: true, message: 'No teams found', updated: 0 });
    }

    const BATCH_SIZE = 5;
    let updated = 0;
    const allEnriched = [];

    const schema = {
      type: 'object',
      properties: {
        teams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              headquarters_city: { type: 'string' },
              headquarters_state: { type: ['string', 'null'] },
              country: { type: 'string' },
              primary_discipline: { type: 'string' },
              team_level: { type: 'string' },
              founded_year: { type: ['number', 'null'] },
              description_summary: { type: ['string', 'null'] },
            }
          }
        }
      }
    };

    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      const batchNames = batch.map(t => t.name);

      const prompt = `You are a motorsports data expert. Search the internet and look up accurate, real-world information for each of these racing teams. Focus especially on NASCAR and other major US racing series:

${batchNames.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}

For EACH team return:
- name: exact team name as listed
- headquarters_city: city where the team's shop/HQ is located
- headquarters_state: 2-letter US state code (e.g. "NC") or null
- country: full country name (e.g. "United States")
- primary_discipline: one of: "Off Road", "Snowmobile", "Asphalt Oval", "Road Racing", "Rallycross", "Drag Racing", "Mixed"
- team_level: one of: "Local", "Regional", "National", "International"
- founded_year: year founded as a number (null if unknown)
- description_summary: 1-2 sentence factual description of the team`;

      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: schema,
      });

      const enrichedBatch = aiResponse.teams || [];
      allEnriched.push(...enrichedBatch);

      for (const enriched of enrichedBatch) {
        const match = batch.find(t => t.name === enriched.name);
        if (!match) continue;

        await base44.asServiceRole.entities.Team.update(match.id, {
          headquarters_city: enriched.headquarters_city || match.headquarters_city,
          headquarters_state: enriched.headquarters_state ?? match.headquarters_state,
          country: enriched.country || match.country,
          primary_discipline: enriched.primary_discipline || match.primary_discipline,
          team_level: enriched.team_level || match.team_level,
          founded_year: enriched.founded_year ?? match.founded_year,
          description_summary: enriched.description_summary || match.description_summary,
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      message: `AI-enriched ${updated} of ${teams.length} teams`,
      updated,
      total: teams.length,
      enrichedData: allEnriched,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});