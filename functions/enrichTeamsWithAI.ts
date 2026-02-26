import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all teams
    const teams = await base44.asServiceRole.entities.Team.list();
    
    if (!teams || teams.length === 0) {
      return Response.json({ message: 'No teams found' });
    }

    const enrichedTeams = [];
    const skippedTeams = [];

    for (const team of teams) {
      // Skip if team has description and was founded
      if (team.description_summary && team.founded_year) {
        skippedTeams.push(team.id);
        continue;
      }

      try {
        // Generate description and details using AI
        const prompt = `Generate detailed information for a motorsports team with the following details:
Team Name: ${team.name}
Location: ${[team.headquarters_city, team.headquarters_state, team.country].filter(Boolean).join(', ')}
Discipline: ${team.primary_discipline || 'Unknown'}
Status: ${team.status || 'Active'}
Team Level: ${team.team_level || 'Unknown'}

Please provide:
1. A compelling 2-3 sentence team description highlighting their racing focus and achievements
2. If missing, suggest a reasonable founding year (use null if uncertain)
3. Key information about their operations and reputation

Format as JSON with: { "description": "...", "founded_year": number or null }`;

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              founded_year: { type: ['number', 'null'] }
            }
          }
        });

        const updates = {
          description_summary: aiResponse.description || team.description_summary
        };

        // Only update founded_year if missing and AI provided one
        if (!team.founded_year && aiResponse.founded_year) {
          updates.founded_year = aiResponse.founded_year;
        }

        // Update the team
        await base44.asServiceRole.entities.Team.update(team.id, updates);
        enrichedTeams.push({ id: team.id, name: team.name, updated: true });

      } catch (error) {
        enrichedTeams.push({ id: team.id, name: team.name, updated: false, error: error.message });
      }
    }

    return Response.json({
      message: 'Team enrichment complete',
      enriched: enrichedTeams.length,
      skipped: skippedTeams.length,
      total: teams.length,
      details: enrichedTeams
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});