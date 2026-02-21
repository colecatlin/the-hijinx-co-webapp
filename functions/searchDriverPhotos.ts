import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { firstName, lastName } = await req.json();

    if (!firstName || !lastName) {
      return Response.json({ error: 'First name and last name required' }, { status: 400 });
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for professional photos of a racing driver named ${firstName} ${lastName}. Find 3-5 high quality images of this driver. Return a JSON object with an array of image URLs and descriptions.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});