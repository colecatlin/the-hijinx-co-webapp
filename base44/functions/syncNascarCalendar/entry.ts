import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Inline normalization helpers (no local imports) ──────────────────────────
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = normalizeName(name || '');
  return `${norm}|${event_date || 'none'}|${track_id || 'none'}|${series_id || 'none'}`;
}

const ICS_URL = 'https://ics.ecal.com/ecal-sub/69979e639e74540002951554/NASCAR.ics';

function parseICSDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    const y = dateStr.slice(0, 4), mo = dateStr.slice(4, 6), d = dateStr.slice(6, 8);
    const h = dateStr.slice(9, 11), mi = dateStr.slice(11, 13);
    return `${y}-${mo}-${d}T${h}:${mi}:00Z`;
  }
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function parseICS(icsText) {
  const events = [];
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).split(';')[0].toUpperCase();
      const val = line.slice(idx + 1).trim();
      if (key === 'SUMMARY') current.summary = val;
      else if (key === 'DTSTART') current.dtstart = val;
      else if (key === 'DTEND') current.dtend = val;
      else if (key === 'LOCATION') current.location = val;
      else if (key === 'DESCRIPTION') current.description = val.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      else if (key === 'UID') current.uid = val;
    }
  }
  return events;
}

// Canonical series names — must match syncNascarScheduleToEvents exactly
const CANONICAL_SERIES = {
  CUP:   'NASCAR Cup Series',
  XFINITY: 'NASCAR Xfinity Series',
  TRUCK: 'NASCAR Craftsman Truck Series',
  ARCA_EAST: 'ARCA Menards Series East',
  ARCA_WEST: 'ARCA Menards Series West',
  ARCA:  'ARCA Menards Series',
  EURO:  'NASCAR Whelen Euro Series',
};

function detectSeries(summary) {
  const s = summary?.toLowerCase() || '';
  if (s.includes('cup series') || s.includes('nascar cup')) return CANONICAL_SERIES.CUP;
  if (s.includes('xfinity')) return CANONICAL_SERIES.XFINITY;
  if (s.includes('craftsman truck') || s.includes('truck series')) return CANONICAL_SERIES.TRUCK;
  if (s.includes('arca menards') && s.includes('east')) return CANONICAL_SERIES.ARCA_EAST;
  if (s.includes('arca menards') && s.includes('west')) return CANONICAL_SERIES.ARCA_WEST;
  if (s.includes('arca menards')) return CANONICAL_SERIES.ARCA;
  if (s.includes('euro series') || s.includes('european')) return CANONICAL_SERIES.EURO;
  // Generic fallback — log a warning; do not silently create a broad "NASCAR" series
  console.warn(`[syncNascarCalendar] detectSeries fallback triggered for: "${summary}" — mapped to generic NASCAR`);
  return 'NASCAR';
}

function extractEventName(summary, seriesName) {
  if (!summary) return '';
  const seriesPattern = new RegExp(`^${seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–]\\s*`, 'i');
  return summary.trim().replace(seriesPattern, '').trim();
}

function extractEventDate(dtstart) {
  if (!dtstart) return null;
  const parsed = parseICSDate(dtstart);
  if (!parsed) return null;
  return parsed.includes('T') ? parsed.slice(0, 10) : parsed;
}

function extractSeason(dtstart) {
  if (!dtstart) return new Date().getFullYear().toString();
  return dtstart.slice(0, 4);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch ICS feed
    const response = await fetch(ICS_URL);
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch ICS: ${response.status}` }, { status: 500 });
    }
    const icsText = await response.text();
    const icsEvents = parseICS(icsText);

    if (!icsEvents.length) {
      return Response.json({ message: 'No events found in ICS feed', count: 0 });
    }

    let seriesCreated = 0, seriesUpdated = 0;
    let eventCreated = 0, eventUpdated = 0, skipped = 0;

    // Cache of seriesName → resolved series record (avoids repeat syncs in same run)
    const seriesCache = new Map();

    const now = new Date().toISOString();

    async function ensureSeries(seriesName) {
      if (seriesCache.has(seriesName)) return seriesCache.get(seriesName);

      const seriesPayload = {
        name: seriesName,
        discipline: 'Stock Car',
        status: 'Active',
        data_source: 'syncNascarCalendar',
        sync_last_seen_at: now,
      };

      // Route through syncSourceAndEntityRecord — handles normalization + dedup + entity layer
      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'series',
        payload: seriesPayload,
        triggered_from: 'nascar_calendar_sync',
      });

      const seriesRecord = result?.data?.source_record || null;
      const action = result?.data?.source_action;
      if (action === 'created') seriesCreated++;
      else if (action === 'updated') seriesUpdated++;

      if (seriesRecord) seriesCache.set(seriesName, seriesRecord);
      return seriesRecord;
    }

    for (const icsEv of icsEvents) {
      if (!icsEv.summary || !icsEv.dtstart) { skipped++; continue; }

      const seriesName = detectSeries(icsEv.summary);
      const eventDate  = extractEventDate(icsEv.dtstart);
      const endDate    = extractEventDate(icsEv.dtend);
      const season     = extractSeason(icsEv.dtstart);
      const eventName  = extractEventName(icsEv.summary, seriesName);

      if (!eventName) { skipped++; continue; }

      // Ensure series (safe upsert via syncSourceAndEntityRecord)
      const seriesRecord = await ensureSeries(seriesName).catch(() => null);

      const extUid = icsEv.uid || null;

      const normalizedEventKey = buildNormalizedEventKey({
        name: eventName,
        event_date: eventDate,
        track_id: null,   // ICS feed doesn't provide track_id
        series_id: seriesRecord?.id || null,
      });

      const eventPayload = {
        name: eventName,
        series_name: seriesName,
        series_id: seriesRecord?.id || null,
        season,
        event_date: eventDate,
        ...(endDate ? { end_date: endDate } : {}),
        status: eventDate && new Date(eventDate) < new Date() ? 'Completed' : 'Draft',
        external_uid: extUid,
        normalized_event_key: normalizedEventKey,  // pre-populate for strongest match
        data_source: 'syncNascarCalendar',
        sync_last_seen_at: now,
        ...(icsEv.location ? { location_note: icsEv.location } : {}),
      };

      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'event',
        payload: eventPayload,
        triggered_from: 'nascar_calendar_sync',
      }).catch(err => ({ data: { error: err.message } }));

      const action = result?.data?.source_action;
      if (action === 'created') eventCreated++;
      else if (action === 'updated') eventUpdated++;
      else skipped++;
    }

    return Response.json({
      message: 'NASCAR calendar sync complete',
      total: icsEvents.length,
      series: { created: seriesCreated, updated: seriesUpdated },
      events: { created: eventCreated, updated: eventUpdated },
      skipped,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});