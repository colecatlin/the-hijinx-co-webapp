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

// Extract just the event name without series prefix (e.g., "NASCAR Cup Series - Las Vegas" -> "Las Vegas")
function extractEventName(summary, seriesName) {
  if (!summary) return '';
  let name = summary.trim();
  // Remove series name prefix if present (case-insensitive)
  const seriesPattern = new RegExp(`^${seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–]\\s*`, 'i');
  return name.replace(seriesPattern, '').trim();
}

function extractRoundNumber(summary) {
  const match = summary.match(/Race\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Extract just the track name from a location string like "NASCAR Cup Series @ Daytona International Speedway"
function extractTrackName(location) {
  if (!location) return null;
  const atIdx = location.indexOf(' @ ');
  if (atIdx !== -1) return location.substring(atIdx + 3).trim();
  return location.trim();
}

// Known NASCAR track data: name -> { city, state, track_type, surface_type, length }
const TRACK_DATA = {
  'Daytona International Speedway':       { city: 'Daytona Beach',     state: 'FL', type: 'Speedway',    surface: 'Asphalt',   length: 2.5 },
  'Atlanta Motor Speedway':               { city: 'Hampton',           state: 'GA', type: 'Speedway',    surface: 'Asphalt',   length: 1.54 },
  'Las Vegas Motor Speedway':             { city: 'Las Vegas',         state: 'NV', type: 'Speedway',    surface: 'Asphalt',   length: 1.5 },
  'Circuit of the Americas':              { city: 'Austin',            state: 'TX', type: 'Road Course', surface: 'Asphalt',   length: 3.41 },
  'Bristol Motor Speedway':               { city: 'Bristol',           state: 'TN', type: 'Short Track', surface: 'Concrete',  length: 0.533 },
  'Martinsville Speedway':                { city: 'Ridgeway',          state: 'VA', type: 'Short Track', surface: 'Asphalt',   length: 0.526 },
  'Talladega Superspeedway':              { city: 'Talladega',         state: 'AL', type: 'Speedway',    surface: 'Asphalt',   length: 2.66 },
  'Dover Motor Speedway':                 { city: 'Dover',             state: 'DE', type: 'Short Track', surface: 'Concrete',  length: 1.0 },
  'Kansas Speedway':                      { city: 'Kansas City',       state: 'KS', type: 'Speedway',    surface: 'Asphalt',   length: 1.5 },
  'Charlotte Motor Speedway':             { city: 'Concord',           state: 'NC', type: 'Speedway',    surface: 'Asphalt',   length: 1.5 },
  'Sonoma Raceway':                       { city: 'Sonoma',            state: 'CA', type: 'Road Course', surface: 'Asphalt',   length: 1.99 },
  'Nashville Superspeedway':              { city: 'Lebanon',           state: 'TN', type: 'Speedway',    surface: 'Concrete',  length: 1.33 },
  'New Hampshire Motor Speedway':         { city: 'Loudon',            state: 'NH', type: 'Short Track', surface: 'Asphalt',   length: 1.058 },
  'Pocono Raceway':                       { city: 'Long Pond',         state: 'PA', type: 'Speedway',    surface: 'Asphalt',   length: 2.5 },
  'Michigan International Speedway':      { city: 'Brooklyn',          state: 'MI', type: 'Speedway',    surface: 'Asphalt',   length: 2.0 },
  'Richmond Raceway':                     { city: 'Richmond',          state: 'VA', type: 'Short Track', surface: 'Asphalt',   length: 0.75 },
  'Watkins Glen International':           { city: 'Watkins Glen',      state: 'NY', type: 'Road Course', surface: 'Asphalt',   length: 2.45 },
  'Indianapolis Motor Speedway':          { city: 'Indianapolis',      state: 'IN', type: 'Speedway',    surface: 'Asphalt',   length: 2.5 },
  'Lucas Oil Indianapolis Raceway Park':  { city: 'Indianapolis',      state: 'IN', type: 'Short Track', surface: 'Asphalt',   length: 0.686 },
  'Lucas Oil Indianapolis Raceway Par':   { city: 'Indianapolis',      state: 'IN', type: 'Short Track', surface: 'Asphalt',   length: 0.686 },
  'World Wide Technology Raceway':        { city: 'Madison',           state: 'IL', type: 'Short Track', surface: 'Asphalt',   length: 1.25 },
  'North Wilkesboro Speedway':            { city: 'North Wilkesboro',  state: 'NC', type: 'Short Track', surface: 'Asphalt',   length: 0.625 },
  'Phoenix Raceway':                      { city: 'Avondale',          state: 'AZ', type: 'Short Track', surface: 'Asphalt',   length: 1.0 },
  'Homestead-Miami Speedway':             { city: 'Homestead',         state: 'FL', type: 'Speedway',    surface: 'Asphalt',   length: 1.5 },
  'Auto Club Speedway':                   { city: 'Fontana',           state: 'CA', type: 'Speedway',    surface: 'Asphalt',   length: 2.0 },
  'Rockingham Speedway':                  { city: 'Rockingham',        state: 'NC', type: 'Speedway',    surface: 'Asphalt',   length: 1.017 },
  'Bowman Gray Stadium':                  { city: 'Winston-Salem',     state: 'NC', type: 'Short Track', surface: 'Asphalt',   length: 0.25 },
  'Iowa Speedway':                        { city: 'Newton',            state: 'IA', type: 'Short Track', surface: 'Asphalt',   length: 0.875 },
  'Gateway Motorsports Park':             { city: 'Madison',           state: 'IL', type: 'Speedway',    surface: 'Asphalt',   length: 1.25 },
  'Chicagoland Speedway':                 { city: 'Joliet',            state: 'IL', type: 'Speedway',    surface: 'Asphalt',   length: 1.5 },
  'Texas Motor Speedway':                 { city: 'Fort Worth',        state: 'TX', type: 'Speedway',    surface: 'Concrete',  length: 1.5 },
  'Auto Club Speedway':                   { city: 'Fontana',           state: 'CA', type: 'Speedway',    surface: 'Asphalt',   length: 2.0 },
  'Grand Prix of St. Petersburg':         { city: 'St. Petersburg',    state: 'FL', type: 'Street Circuit', surface: 'Asphalt', length: 1.8 },
  'Lime Rock Park':                       { city: 'Lakeville',         state: 'CT', type: 'Road Course', surface: 'Asphalt',   length: 1.53 },
  'Mid-Ohio Sports Car Course':           { city: 'Lexington',         state: 'OH', type: 'Road Course', surface: 'Asphalt',   length: 2.258 },
  'Road America':                         { city: 'Elkhart Lake',      state: 'WI', type: 'Road Course', surface: 'Asphalt',   length: 4.048 },
  'Portland International Raceway':       { city: 'Portland',          state: 'OR', type: 'Road Course', surface: 'Asphalt',   length: 1.967 },
  'Indianapolis Motor Speedway Road Course': { city: 'Indianapolis',   state: 'IN', type: 'Road Course', surface: 'Asphalt',   length: 2.439 },
  'Laguna Seca Raceway':                  { city: 'Salinas',           state: 'CA', type: 'Road Course', surface: 'Asphalt',   length: 2.238 },
  'WeatherTech Raceway Laguna Seca':      { city: 'Salinas',           state: 'CA', type: 'Road Course', surface: 'Asphalt',   length: 2.238 },
};

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
    const seriesNameOverride = body.seriesName || null; // If provided, all events in this feed belong to this single series

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

    // Build a set of unique track names (extracted from location strings like "Series @ Track")
    const locationToTrackName = {};
    for (const e of icsEvents) {
      const loc = e['LOCATION'];
      if (loc) locationToTrackName[loc] = extractTrackName(loc);
    }
    const uniqueTrackNames = [...new Set(Object.values(locationToTrackName).filter(Boolean))];
    const seriesNames = [...new Set(icsEvents.map(e => extractSeriesName(e['SUMMARY'] || '')).filter(Boolean))];

    const existingTracks = await base44.asServiceRole.entities.Track.list();
    const existingSeries = await base44.asServiceRole.entities.Series.list();
    const existingEvents = await base44.asServiceRole.entities.Event.list();

    const trackMap = {}; // keyed by original location string
    const trackNameToId = {};

    for (const trackName of uniqueTrackNames) {
      const existing = existingTracks.find(t => t.name?.toLowerCase() === trackName.toLowerCase());
      if (existing) {
        trackNameToId[trackName] = existing.id;
      } else {
        const td = TRACK_DATA[trackName] || {};
        const created = await base44.asServiceRole.entities.Track.create({
          name: trackName,
          slug: slugify(trackName),
          location_city: td.city || trackName,
          location_state: td.state || null,
          location_country: 'United States',
          track_type: td.type || 'Speedway',
          surface_type: td.surface || 'Asphalt',
          length: td.length || null,
          status: 'Active',
        });
        trackNameToId[trackName] = created.id;
        stats.tracks++;
      }
    }

    for (const loc of Object.keys(locationToTrackName)) {
      trackMap[loc] = trackNameToId[locationToTrackName[loc]];
    }

    const seriesMap = {};
    for (const seriesName of seriesNames) {
      const existing = existingSeries.find(s => s.name?.toLowerCase() === seriesName.toLowerCase());
      if (existing) {
        seriesMap[seriesName] = existing.id;
      }
      // No new Series entities are created — events are only linked to existing series
    }

    // Build lookup maps for deduplication
    const existingByUid = new Map();
    const existingByNameDate = new Map();
    for (const e of existingEvents) {
      if (e.external_uid) existingByUid.set(e.external_uid, e);
      existingByNameDate.set(`${e.name}__${e.event_date}`, e);
    }

    const eventsToCreate = [];
    for (const icsEvent of icsEvents) {
      const summary = icsEvent['SUMMARY'] || '';
      const location = icsEvent['LOCATION'] || '';
      const dtStart = icsEvent['DTSTART'] || '';
      const dtEnd = icsEvent['DTEND'] || '';
      const uid = icsEvent['UID'] || null;

      if (!summary || !dtStart) { stats.skipped++; continue; }

      const seriesName = extractSeriesName(summary);
      const roundNumber = extractRoundNumber(summary);
      const eventDate = parseICSDate(dtStart);
      const endDate = parseICSDate(dtEnd);
      const trackId = trackMap[location] || null;
      const eventName = extractEventName(summary, seriesName);

      // Deduplicate: prefer external_uid match, fall back to exact name+date match
      const alreadyExists = (uid && existingByUid.has(uid)) ||
        existingByNameDate.has(`${eventName}__${eventDate}`);

      if (alreadyExists) { stats.skipped++; continue; }

      const eventObj = {
        name: eventName,
        track_id: trackId,
        series: seriesName,
        season: '2026',
        event_date: eventDate,
        status: new Date(eventDate) < new Date() ? 'completed' : 'upcoming',
        round_number: roundNumber,
        external_uid: uid || undefined,
        location_note: location || undefined,
      };
      if (endDate && endDate !== eventDate) eventObj.end_date = endDate;
      eventsToCreate.push(eventObj);
    }

    if (eventsToCreate.length > 0) {
      await base44.asServiceRole.entities.Event.bulkCreate(eventsToCreate);
      stats.events = eventsToCreate.length;
    }

    return Response.json({
      message: `${calendarName} synced successfully`,
      stats,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});