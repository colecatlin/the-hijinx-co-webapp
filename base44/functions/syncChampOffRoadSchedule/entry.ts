/**
 * syncChampOffRoadSchedule.ts
 *
 * Auto-syncs the 2026 CHAMP Off-Road season schedule into the platform.
 * Uses InvokeLLM with web context to retrieve the official schedule (dates + venues),
 * then idempotently upserts the Series, Track records, and Event records.
 *
 * PAST events are included; they are flagged is_historical=true and receive
 * a status of "Completed" so they don't trigger live operational flows.
 *
 * Dedup keys:
 *   Series:  name "Championship Off-Road" (slug champ-off-road)
 *   Track:   normalized_name (lowercase, trimmed)
 *   Event:   external_uid = `champoffroad:2026:{slug}` (slug from event URL)
 *
 * Input:  { year?: number (default 2026), dry_run?: boolean }
 * Output: { series, tracks_created, tracks_matched, events_created, events_updated,
 *           events_unchanged, schedule, dry_run }
 *
 * Admin-only: requires authenticated admin user.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SERIES_NAME = 'Championship Off-Road';
const SERIES_SLUG = 'champ-off-road';
const SOURCE = 'champoffroad.com';

function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const year = Number(body.year || 2026);
    const dryRun = !!body.dry_run;

    const sr = base44.asServiceRole;

    // ── STEP 1: Pull the official schedule using InvokeLLM + web context ──────
    const llmRes = await sr.integrations.Core.InvokeLLM({
      prompt:
        `List the complete ${year} Championship Off-Road (AMSOIL Championship Off-Road, champoffroad.com) ` +
        `season event schedule in chronological order. For each event return: event_name, ` +
        `venue_name (the track/facility name), city, state, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), ` +
        `and a url_slug (the slug used in the champoffroad.com/events/{slug}/ URL if known, otherwise a ` +
        `slug derived from the event name). Use the official published schedule. Return only the JSON object.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                event_name: { type: 'string' },
                venue_name: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                start_date: { type: 'string', format: 'date' },
                end_date: { type: 'string', format: 'date' },
                url_slug: { type: 'string' },
              },
              required: ['event_name', 'venue_name', 'start_date'],
            },
          },
        },
      },
    });

    const schedule = llmRes?.events || (Array.isArray(llmRes) ? llmRes : []);
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return Response.json({
        error: 'No events returned by InvokeLLM',
        raw: llmRes,
      }, { status: 502 });
    }

    if (dryRun) {
      return Response.json({ dry_run: true, schedule, count: schedule.length });
    }

    // ── STEP 2: Ensure the CHAMP Off-Road Series exists ───────────────────────
    let series = (await sr.entities.Series.filter({ name: SERIES_NAME })).find(
      (s) => s.name === SERIES_NAME
    );
    if (!series) {
      // Fall back to slug-based lookup
      const allSeries = await sr.entities.Series.list('-created_date', 200);
      series = allSeries.find(
        (s) => slugify(s.name) === SERIES_SLUG
      );
    }
    if (!series) {
      series = await sr.entities.Series.create({
        name: SERIES_NAME,
        full_name: 'AMSOIL Championship Off-Road',
        slug: SERIES_SLUG,
        discipline: 'Off Road',
        season_year: String(year),
        operational_status: 'Active',
        visibility_status: 'live',
        geographic_scope: 'National',
        website_url: 'https://champoffroad.com/',
        data_source: SOURCE,
        external_uid: `champoffroad:series`,
      });
    }

    // ── STEP 3: Ensure Track records exist (match by normalized name) ─────────
    const trackCache = new Map();
    const existingTracks = await sr.entities.Track.list('-created_date', 200);
    for (const t of existingTracks) {
      trackCache.set(normalizeName(t.name), t);
    }

    const tracksCreated = [];
    const tracksMatched = [];

    async function ensureTrack(eventItem) {
      const normName = normalizeName(eventItem.venue_name);
      if (trackCache.has(normName)) return trackCache.get(normName);
      const existing = existingTracks.find((t) => normalizeName(t.name) === normName);
      if (existing) {
        trackCache.set(normName, existing);
        tracksMatched.push(existing.name);
        return existing;
      }
      const created = await sr.entities.Track.create({
        name: eventItem.venue_name,
        slug: slugify(eventItem.venue_name),
        location_city: eventItem.city || null,
        location_state: eventItem.state || null,
        location_country: 'United States',
        track_type: 'Off-Road',
        surface_type: 'Dirt',
        operational_status: 'Active',
        visibility_status: 'live',
        data_source: SOURCE,
        external_uid: `champoffroad:track:${normName.replace(/\s+/g, '-')}`,
      });
      trackCache.set(normName, created);
      existingTracks.push(created);
      tracksCreated.push(created.name);
      return created;
    }

    // ── STEP 4: Upsert Event records (idempotent via external_uid) ────────────
    const today = new Date();
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsUnchanged = 0;

    for (const item of schedule) {
      if (!item.event_name || !item.start_date) continue;
      const track = await ensureTrack(item);
      const slug = item.url_slug || slugify(item.event_name);
      const externalUid = `champoffroad:${year}:${slug}`;

      const startDate = new Date(item.start_date);
      const isPast = startDate < today;

      const baseEvent = {
        name: item.event_name,
        event_date: item.start_date,
        end_date: item.end_date || item.start_date,
        track_id: track.id,
        series_id: series.id,
        series_name: series.name,
        season: String(year),
        status: isPast ? 'Completed' : 'Draft',
        is_historical: isPast,
        data_source: SOURCE,
        external_uid: externalUid,
        normalized_name: normalizeName(item.event_name),
      };

      const existing = (await sr.entities.Event.filter({ external_uid: externalUid }))
        .find((e) => e.external_uid === externalUid);

      if (!existing) {
        await sr.entities.Event.create(baseEvent);
        eventsCreated++;
      } else {
        const patch = {};
        for (const k of ['name', 'event_date', 'end_date', 'track_id', 'series_id', 'series_name', 'season', 'status', 'is_historical', 'normalized_name']) {
          if (baseEvent[k] !== undefined && baseEvent[k] !== existing[k]) patch[k] = baseEvent[k];
        }
        const keys = Object.keys(patch);
        if (keys.length > 0) {
          await sr.entities.Event.update(existing.id, patch);
          eventsUpdated++;
        } else {
          eventsUnchanged++;
        }
      }
    }

    return Response.json({
      success: true,
      series: { id: series.id, name: series.name },
      tracks_created: tracksCreated,
      tracks_matched: tracksMatched,
      events_created: eventsCreated,
      events_updated: eventsUpdated,
      events_unchanged: eventsUnchanged,
      schedule_count: schedule.length,
      schedule,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});