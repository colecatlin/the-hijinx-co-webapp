import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { driverId, driverName, stats, results, programs } = await req.json();

    const prompt = `You are an expert motorsports analyst. Generate concise AI insights for a racing driver.

Driver: ${driverName}

Recent Performance:
${JSON.stringify(stats, null, 2)}

Race Results (last 5):
${JSON.stringify(results.slice(0, 5), null, 2)}

Current Programs:
${JSON.stringify(programs, null, 2)}

Provide insights in this exact JSON format:
{
  "performanceSummary": "1-2 sentence summary of driver's current performance level and trends",
  "strengths": ["key strength 1", "key strength 2", "key strength 3"],
  "developmentAreas": ["area 1", "area 2"],
  "careerPath": "2-3 sentence suggestion for next step in driver's career",
  "nextOpportunity": "Specific recommendation for next team/series/class",
  "socialSnippet": "Short engaging tweet-style snippet (max 140 chars) about driver's achievement or upcoming race"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          performanceSummary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          developmentAreas: { type: "array", items: { type: "string" } },
          careerPath: { type: "string" },
          nextOpportunity: { type: "string" },
          socialSnippet: { type: "string" }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});