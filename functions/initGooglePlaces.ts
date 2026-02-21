import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        error: 'Google Maps API key not configured',
        scriptUrl: null 
      }, { status: 400 });
    }

    return Response.json({
      scriptUrl: `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`,
      success: true
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      scriptUrl: null 
    }, { status: 500 });
  }
});