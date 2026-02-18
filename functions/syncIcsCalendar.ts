import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
  const s = dtString.replace('Z', '').split('T')[0];
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function extractSeriesName(summary) {
  const match = summary.match(/^(.+?)\s*-\s*Race\s*\d+/i);
  return match ? match[1].trim() : summary.trim();
}

function extractRoundNumber(summary) {
  const match = summary.match(/Race\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const icsUrl = body.icsUrl;
    const calendarName = body.calendarName || icsUrl;

    if (!icsUrl) {
      return Response.json({ error: 'icsUrl is required' }, { status: 400 });
    }

    const fetchUrl = icsUrl.replace(/^webcal:\/\//i, 'https://');
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch ICS: ${response.status}` }, { status: 400 });
    }
    const icsText = await response.text();
    const icsEvents = parseICS(icsText);

    const stats = { tracks: 0, series: 0, events: 0, skipped: 0 };

    const trackNames = [...new Set(icsEvents.map(e => e['LOCATION']).filter(Boolean))];
    const seriesNames = [...new Set(icsEvents.map(e => extractSeriesName(e['SUMMARY'] || '')).filter(Boolean))];

    const existingTracks = await base44.asServiceRole.entities.Track.list();
    const existingSeries = await base44.asServiceRole.entities.Series.list();
    const existingEvents = await base44.asServiceRole.entities.Event.list();

    const trackMap = {};
    const seriesMap = {};

    for (const trackName of trackNames) {
      const existing = existingTracks.find(t => t.name?.toLowerCase() === trackName.toLowerCase());
      if (existing) {
        trackMap[trackName] = existing.id;
      } else {
        const created = await base44.asServiceRole.entities.Track.create({
          name: trackName,
          slug: slugify(trackName),
          location_city: trackName,
          location_country: 'United States',
          track_type: 'Other',
          status: 'Active',
        });
        trackMap[trackName] = created.id;
        stats.tracks++;
      }
    }

    for (const seriesName of seriesNames) {
      const existing = existingSeries.find(s => s.name?.toLowerCase() === seriesName.toLowerCase());
      if (existing) {
        seriesMap[seriesName] = existing.id;
      } else {
        const created = await base44.asServiceRole.entities.Series.create({
          name: seriesName,
          slug: slugify(seriesName),
          discipline: 'Stock Car',
          region: 'United States',
          status: 'Active',
          season_year: '2026',
        });
        seriesMap[seriesName] = created.id;
        stats.series++;
      }
    }

    for (const icsEvent of icsEvents) {
      const summary = icsEvent['SUMMARY'] || '';
      const location = icsEvent['LOCATION'] || '';
      const dtStart = icsEvent['DTSTART'] || '';
      const dtEnd = icsEvent['DTEND'] || '';

      if (!summary || !dtStart) { stats.skipped++; continue; }

      const seriesName = extractSeriesName(summary);
      const roundNumber = extractRoundNumber(summary);
      const eventDate = parseICSDate(dtStart);
      const endDate = parseICSDate(dtEnd);
      const trackId = trackMap[location] || null;

      const alreadyExists = existingEvents.find(e =>
        e.name === summary ||
        (e.event_date === eventDate && e.series === seriesName && e.round_number === roundNumber)
      );

      if (alreadyExists) { stats.skipped++; continue; }

      await base44.asServiceRole.entities.Event.create({
        name: summary,
        track_id: trackId,
        series: seriesName,
        season: '2026',
        event_date: eventDate,
        end_date: (endDate && endDate !== eventDate) ? endDate : undefined,
        status: new Date(eventDate) < new Date() ? 'completed' : 'upcoming',
        round_number: roundNumber,
      });
      stats.events++;
    }

    return Response.json({
      success: true,
      message: `Sync complete for: ${calendarName}`,
      stats,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});