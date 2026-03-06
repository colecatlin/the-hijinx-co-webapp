import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// --- inline normalization helpers (no local imports) ---
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildCanonicalKey({ entity_type, name, external_uid }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  return `${type}:${normalizeName(name)}`;
}

const ICS_URL = 'https://ics.ecal.com/ecal-sub/69979e639e74540002951554/NASCAR.ics';

function parseICSDate(dateStr) {
  if (!dateStr) return null;
  // Format: 20240101T120000Z or 20240101
  if (dateStr.includes('T')) {
    const y = dateStr.slice(0, 4);
    const mo = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    const h = dateStr.slice(9, 11);
    const mi = dateStr.slice(11, 13);
    return `${y}-${mo}-${d}T${h}:${mi}:00Z`;
  } else {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
}

function parseICS(icsText) {
  const events = [];
  // Unfold lines (continuation lines start with space or tab)
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

// Extract series name from event summary
function detectSeries(summary) {
  const s = summary?.toLowerCase() || '';
  if (s.includes('cup series') || s.includes('nascar cup')) return 'NASCAR Cup Series';
  if (s.includes('xfinity')) return 'NASCAR Xfinity Series';
  if (s.includes('craftsman truck') || s.includes('truck series')) return 'NASCAR Craftsman Truck Series';
  if (s.includes('arca menards') && s.includes('east')) return 'ARCA Menards Series East';
  if (s.includes('arca menards') && s.includes('west')) return 'ARCA Menards Series West';
  if (s.includes('arca menards')) return 'ARCA Menards Series';
  if (s.includes('euro series') || s.includes('european')) return 'NASCAR Whelen Euro Series';
  return 'NASCAR';
}

// Extract just the event name without series prefix (e.g., "NASCAR Cup Series - Las Vegas" -> "Las Vegas")
function extractEventName(summary, seriesName) {
  if (!summary) return '';
  let name = summary.trim();
  // Remove series name prefix if present (case-insensitive)
  const seriesPattern = new RegExp(`^${seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–]\\s*`, 'i');
  return name.replace(seriesPattern, '').trim();
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

    // Get existing events and series
    const [existingEvents, existingSeries] = await Promise.all([
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.Series.list(),
    ]);

    const existingEventsByUid = new Map();
    for (const ev of existingEvents) {
      if (ev.external_uid) existingEventsByUid.set(ev.external_uid, ev);
    }

    // Build series lookup by canonical key for safe dedup
    const seriesByCanonKey = new Map();
    for (const s of existingSeries) {
      const cKey = s.canonical_key || buildCanonicalKey({ entity_type: 'series', name: s.name });
      seriesByCanonKey.set(cKey, s);
    }

    // Helper to ensure a series exists without creating duplicates
    async function ensureSeries(seriesName) {
      const normN = normalizeName(seriesName);
      const cKey  = buildCanonicalKey({ entity_type: 'series', name: seriesName });
      if (seriesByCanonKey.has(cKey)) return seriesByCanonKey.get(cKey);
      // Also check by normalized name
      for (const [, s] of seriesByCanonKey) {
        if (normalizeName(s.name) === normN) {
          seriesByCanonKey.set(cKey, s);
          return s;
        }
      }
      // Create new series (deduped by canonical_key)
      const created = await base44.asServiceRole.entities.Series.create({
        name: seriesName,
        discipline: 'Stock Car',
        status: 'Active',
        normalized_name: normN,
        canonical_slug: buildEntitySlug(seriesName),
        canonical_key: cKey,
        data_source: 'syncNascarCalendar',
        sync_last_seen_at: new Date().toISOString(),
      });
      seriesByCanonKey.set(cKey, created);
      return created;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const icsEv of icsEvents) {
      if (!icsEv.summary || !icsEv.dtstart) { skipped++; continue; }

      const seriesName = detectSeries(icsEv.summary);
      const eventDate  = extractEventDate(icsEv.dtstart);
      const endDate    = extractEventDate(icsEv.dtend);
      const season     = extractSeason(icsEv.dtstart);
      const eventName  = extractEventName(icsEv.summary, seriesName);

      // Ensure series exists (safe upsert)
      const seriesRecord = await ensureSeries(seriesName).catch(() => null);

      const normEvName = normalizeName(eventName);
      const extUid     = icsEv.uid || null;
      const cKey       = buildCanonicalKey({ entity_type: 'event', name: eventName, external_uid: extUid });

      const eventData = {
        name: eventName,
        series_name: seriesName,
        series_id: seriesRecord?.id || null,
        season: season,
        event_date: eventDate,
        end_date: endDate || undefined,
        status: eventDate && new Date(eventDate) < new Date() ? 'Completed' : 'Draft',
        external_uid: extUid,
        normalized_name: normEvName,
        canonical_slug: buildEntitySlug(eventName),
        canonical_key: cKey,
        normalized_event_key: cKey,
        data_source: 'syncNascarCalendar',
        sync_last_seen_at: new Date().toISOString(),
      };

      if (icsEv.location) eventData.location_note = icsEv.location;

      const existing = extUid ? existingEventsByUid.get(extUid) : null;

      if (existing) {
        await base44.asServiceRole.entities.Event.update(existing.id, eventData);
        updated++;
      } else {
        await base44.asServiceRole.entities.Event.create(eventData);
        created++;
      }
    }

    return Response.json({
      message: 'NASCAR calendar sync complete',
      total: icsEvents.length,
      created,
      updated,
      skipped,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});