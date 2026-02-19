import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { description } = body;

    if (!description) {
      return Response.json({ error: 'description is required' }, { status: 400 });
    }

    // Fetch existing tracks to match against
    const tracks = await base44.asServiceRole.entities.Track.list();
    const trackList = tracks.map(t => `- ${t.name} (${t.location_city || ''}${t.location_state ? ', ' + t.location_state : ''}, ${t.location_country || ''})`).join('\n');

    const prompt = `You are a motorsports expert assistant. A user has provided the following description or partial information about a racing event:

"${description}"

Your job is to generate a complete, accurate event entry for a motorsport event database.

Here are the tracks already in our system — prefer matching to one of these if applicable:
${trackList}

Based on the user's input and your knowledge of common motorsport calendars (NASCAR Cup Series, NASCAR Xfinity, NASCAR Truck Series, IndyCar, IMSA, Formula 1, NHRA, Off-Road Racing like Lucas Oil Off Road, Ultra4, etc.), generate:

1. event_name: A proper, full event name (e.g. "Daytona 500", "Chevrolet Detroit Grand Prix presented by Lear")
2. event_date: Best estimated start date in YYYY-MM-DD format (use current year 2026 as default if not specified)
3. end_date: End date in YYYY-MM-DD format if it's a multi-day event, otherwise same as event_date or null
4. series: The racing series name (e.g. "NASCAR Cup Series", "IndyCar Series", "Lucas Oil Off Road Racing Series")
5. season: The season year as a string (e.g. "2026")
6. round_number: Round number in the series if known, otherwise null
7. track_name: The exact track name — prefer one from the provided list if it matches. If not in the list, provide the best track name.
8. track_id: The ID of the matched track from the list below (null if no match found). Match by name.
9. track_matched: true if you found a matching track in our system, false if not
10. confidence: "high", "medium", or "low" — how confident you are in the generated details
11. notes: Any assumptions made or things the user should verify

Track IDs for reference:
${tracks.map(t => `${t.name}: ${t.id}`).join('\n')}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          event_name: { type: 'string' },
          event_date: { type: 'string' },
          end_date: { type: ['string', 'null'] },
          series: { type: 'string' },
          season: { type: 'string' },
          round_number: { type: ['number', 'null'] },
          track_name: { type: 'string' },
          track_id: { type: ['string', 'null'] },
          track_matched: { type: 'boolean' },
          confidence: { type: 'string' },
          notes: { type: 'string' },
        }
      }
    });

    return Response.json({ success: true, event: aiResponse });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});