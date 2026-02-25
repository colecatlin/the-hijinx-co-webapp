import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        success: false, 
        message: 'GOOGLE_MAPS_API_KEY not set',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // Test the API key with a simple geocoding request
    const testUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    testUrl.searchParams.set('address', 'New York');
    testUrl.searchParams.set('key', apiKey);

    const response = await fetch(testUrl.toString());
    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return Response.json({ 
        success: true, 
        message: 'Google Maps API key is valid and working',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    } else {
      return Response.json({ 
        success: false, 
        message: `API error: ${data.status}`,
        details: data.error_message || 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
  } catch (error) {
    return Response.json({ 
      success: false, 
      message: 'Failed to test Google Maps API key',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});