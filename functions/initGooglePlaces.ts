import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      return Response.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }

    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;

    return Response.json({ scriptUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});