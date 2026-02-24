import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allTeams = await base44.asServiceRole.entities.Team.list('-updated_date', 500);
    
    const incompleteTeams = allTeams.filter(team => 
      !team.logo_url || 
      !team.description_summary || 
      !team.headquarters_city || 
      !team.headquarters_state
    );

    if (incompleteTeams.length === 0) {
      return Response.json({ 
        message: 'All teams have complete information',
        total: allTeams.length,
        incomplete: 0
      });
    }

    const enriched = [];
    const failed = [];

    for (const team of incompleteTeams) {
      try {
        const prompt = `Find information about the racing team "${team.name}". Return the following in JSON format:
        - headquarters_city: The city where this team is based
        - headquarters_state: The state or region where this team is based
        - country: The country where this team is based
        - description_summary: A brief 2-3 sentence description of the team
        - website_url: Their official website if available
        - logo_url: A URL to their team logo (if you can find a direct image URL)
        
        Only include fields if you can find reliable information. Return empty strings for fields you cannot find.`;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              headquarters_city: { type: 'string' },
              headquarters_state: { type: 'string' },
              country: { type: 'string' },
              description_summary: { type: 'string' },
              website_url: { type: 'string' },
              logo_url: { type: 'string' }
            }
          }
        });

        const updateData = {};
        if (result.headquarters_city && !team.headquarters_city) updateData.headquarters_city = result.headquarters_city;
        if (result.headquarters_state && !team.headquarters_state) updateData.headquarters_state = result.headquarters_state;
        if (result.country && !team.country) updateData.country = result.country;
        if (result.description_summary && !team.description_summary) updateData.description_summary = result.description_summary;
        if (result.website_url && !team.website_url) updateData.website_url = result.website_url;
        if (result.logo_url && !team.logo_url) updateData.logo_url = result.logo_url;

        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.Team.update(team.id, updateData);
          enriched.push({ id: team.id, name: team.name, updated_fields: Object.keys(updateData) });
        }
      } catch (error) {
        failed.push({ id: team.id, name: team.name, error: error.message });
      }

      // Rate limiting - wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({
      message: 'Team enrichment complete',
      total_incomplete: incompleteTeams.length,
      enriched_count: enriched.length,
      failed_count: failed.length,
      enriched_teams: enriched,
      failed_teams: failed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});