import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const NASCAR_API_KEY = Deno.env.get('NASCAR_API_KEY');
const NASCAR_API_BASE = 'https://api.nascar.com/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all NASCAR data in parallel
    const [eventsRes, standingsRes, driversRes, manufacturerRes, tracksRes, statsRes] = await Promise.all([
      fetch(`${NASCAR_API_BASE}/series/1/events?apikey=${NASCAR_API_KEY}`),
      fetch(`${NASCAR_API_BASE}/series/1/standings?apikey=${NASCAR_API_KEY}`),
      fetch(`${NASCAR_API_BASE}/series/1/drivers?apikey=${NASCAR_API_KEY}`),
      fetch(`${NASCAR_API_BASE}/series/1/manufacturers/standings?apikey=${NASCAR_API_KEY}`),
      fetch(`${NASCAR_API_BASE}/tracks?apikey=${NASCAR_API_KEY}`),
      fetch(`${NASCAR_API_BASE}/series/1/stats?apikey=${NASCAR_API_KEY}`)
    ]);

    const events = await eventsRes.json();
    const standings = await standingsRes.json();
    const drivers = await driversRes.json();
    const manufacturerStandings = await manufacturerRes.json();
    const tracks = await tracksRes.json();
    const stats = await statsRes.json();

    return Response.json({
      success: true,
      data: {
        events: events,
        standings: standings,
        drivers: drivers,
        manufacturerStandings: manufacturerStandings,
        tracks: tracks,
        stats: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});