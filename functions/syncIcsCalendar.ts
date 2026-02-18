import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// v2
function parseICS(icsText) {
  const events = [];
  const lines = icsText.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r\n|\n|\r/);
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx).split(';')[0].trim();
      const value = line.substring(colonIdx + 1).trim();
      current[key] = value;
    }
  }
  return events;
}

function parseICSDate(dtString) {
  if (!dtString) return null;
  // Format: 20260428T233000Z or 20260428
  const s = dtString.replace('Z', '');
  if (s.length === 8) {
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  }
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function extractSeriesName(summary) {
  // e.g. "eNASCAR Coca-Cola iRacing Qualifying Series - Race 11"
  // Extract everything before " - Race"
  const match = summary.match(/^(.+?)\s*-\s*Race\s*\d+/i);
  if (match) return match[1].trim();
  return summary.trim();
}

function extractRoundNumber(summary) {
  const match = summary.match(/Race\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { icsUrl, calendarName } = body;

    if (!icsUrl) {
      return Response.json({ error: 'icsUrl is required' }, { status: 400 });
    }

    // Fetch the ICS file
    const fetchUrl = icsUrl.replace(/^webcal:\/\//i, 'https://');
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch ICS: ${response.status}` }, { status: 400 });
    }
    const icsText = await response.text();

    // Parse events
    const icsEvents = parseICS(icsText);

    const stats = { tracks: 0, series: 0, events: 0, skipped: 0 };

    // Gather unique track names and series names
    const trackNames = [...new Set(icsEvents.map(e => e['LOCATION']).filter(Boolean))];
    const seriesNames = [...new Set(icsEvents.map(e => extractSeriesName(e['SUMMARY'] || '')).filter(Boolean))];

    // Fetch existing tracks and series
    const existingTracks = await base44.asServiceRole.entities.Track.list();
    const existingSeries = await base44.asServiceRole.entities.Series.list();
    const existingEvents = await base44.asServiceRole.entities.Event.list();

    const trackMap = {}; // name -> id
    const seriesMap = {}; // name -> id

    // Upsert tracks
    for (const trackName of trackNames) {
      const existing = existingTracks.find(t => t.name?.toLowerCase() === trackName.toLowerCase());
      if (existing) {
        trackMap[trackName] = existing.id;
      } else {
        const slug = slugify(trackName);
        const created = await base44.asServiceRole.entities.Track.create({
          name: trackName,
          slug,
          location_city: trackName,
          location_country: 'United States',
          track_type: 'Other',
          status: 'Active',
        });
        trackMap[trackName] = created.id;
        stats.tracks++;
      }
    }

    // Upsert series
    for (const seriesName of seriesNames) {
      const existing = existingSeries.find(s => s.name?.toLowerCase() === seriesName.toLowerCase());
      if (existing) {
        seriesMap[seriesName] = existing.id;
      } else {
        const slug = slugify(seriesName);
        const created = await base44.asServiceRole.entities.Series.create({
          name: seriesName,
          slug,
          status: 'Active',
          season: '2026',
        });
        seriesMap[seriesName] = created.id;
        stats.series++;
      }
    }

    // Upsert events
    for (const icsEvent of icsEvents) {
      const summary = icsEvent['SUMMARY'] || '';
      const location = icsEvent['LOCATION'] || '';
      const dtStart = icsEvent['DTSTART'] || '';
      const dtEnd = icsEvent['DTEND'] || '';
      const uid = icsEvent['UID'] || '';

      if (!summary || !dtStart) {
        stats.skipped++;
        continue;
      }

      const seriesName = extractSeriesName(summary);
      const roundNumber = extractRoundNumber(summary);
      const eventDate = parseICSDate(dtStart);
      const endDate = parseICSDate(dtEnd);
      const trackId = trackMap[location] || null;
      const seriesStr = seriesName;

      // Check if event already exists by UID match in name or by date+series combo
      const existing = existingEvents.find(e =>
        e.name === summary ||
        (e.event_date === eventDate && e.series === seriesStr && e.round_number === roundNumber)
      );

      if (existing) {
        stats.skipped++;
        continue;
      }

      await base44.asServiceRole.entities.Event.create({
        name: summary,
        track_id: trackId,
        series: seriesStr,
        season: '2026',
        event_date: eventDate,
        end_date: endDate !== eventDate ? endDate : null,
        status: new Date(eventDate) < new Date() ? 'completed' : 'upcoming',
        round_number: roundNumber,
      });
      stats.events++;
    }

    return Response.json({
      success: true,
      message: `Sync complete for: ${calendarName || icsUrl}`,
      stats,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});