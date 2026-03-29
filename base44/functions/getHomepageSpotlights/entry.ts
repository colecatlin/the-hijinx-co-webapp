/**
 * getHomepageSpotlights
 *
 * Resolves the homepage Driver Spotlight and Event Spotlight.
 * Respects manual overrides from HomepageSettings, falls back to automatic logic.
 * Never throws — returns nulls on any failure.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const safe = (p) => p.catch(() => null);
    const today = new Date().toISOString().split('T')[0];

    // Load settings
    let settings = null;
    try {
      const list = await db.HomepageSettings.filter({ active: true }, '-created_date', 1);
      settings = list?.[0] || null;
    } catch (_) {}

    const mode = settings?.spotlight_mode || 'mixed';

    // ── Fetch supporting data in parallel ──────────────────────────────────
    const [drivers, events, activity, recentResults] = await Promise.all([
      safe(db.Driver.filter({ visibility_status: 'live' }, '-created_date', 50)),
      safe(db.Event.list('event_date', 20)),
      safe(db.ActivityFeed.filter({ visibility: 'public' }, '-created_at', 20)),
      safe(db.Results.filter({ is_official: true }, '-created_date', 10)),
    ]);

    const allDrivers  = drivers   || [];
    const allEvents   = events    || [];
    const allActivity = activity  || [];
    const allResults  = recentResults || [];

    // ── DRIVER SPOTLIGHT ───────────────────────────────────────────────────

    let spotlightDriver = null;

    const resolveDriver = (id) => allDrivers.find(d => d.id === id) || null;

    const buildDriverPayload = (driver, latestActivity) => {
      const mediaEntry = null; // no per-driver media fetch here — keep it light
      return {
        id:                    driver.id,
        name:                  [driver.first_name, driver.last_name].filter(Boolean).join(' '),
        subtitle:              [driver.career_status, driver.primary_discipline].filter(Boolean).join(' · ') || null,
        image:                 driver.profile_image_url || driver.photo_url || null,
        slug:                  driver.slug || null,
        latest_activity_title: latestActivity?.title || null,
        latest_activity_date:  latestActivity?.created_at || null,
        related_event_name:    null,
      };
    };

    if (mode !== 'auto' && settings?.spotlight_driver_id) {
      const manual = resolveDriver(settings.spotlight_driver_id);
      if (manual) {
        const latestAct = allActivity.find(a => a.related_driver_id === manual.id) || null;
        spotlightDriver = buildDriverPayload(manual, latestAct);
      }
    }

    if (!spotlightDriver && mode !== 'manual') {
      // 1. Driver with most recent activity feed item
      let bestDriver = null;
      let bestActivity = null;
      for (const act of allActivity) {
        if (act.related_driver_id) {
          const d = allDrivers.find(dr => dr.id === act.related_driver_id);
          if (d) { bestDriver = d; bestActivity = act; break; }
        }
      }

      // 2. Driver linked to nearest upcoming event
      if (!bestDriver) {
        const upcoming = allEvents.find(e => e.event_date >= today);
        if (upcoming) {
          // look in results for a driver_id tied to this event
          const result = allResults.find(r => r.event_id === upcoming.id);
          if (result?.driver_id) bestDriver = allDrivers.find(d => d.id === result.driver_id) || null;
        }
      }

      // 3. Newest featured driver
      if (!bestDriver) {
        bestDriver = allDrivers.find(d => d.featured === true) || null;
      }

      // 4. First valid driver
      if (!bestDriver && allDrivers.length > 0) bestDriver = allDrivers[0];

      if (bestDriver) spotlightDriver = buildDriverPayload(bestDriver, bestActivity);
    }

    // ── EVENT SPOTLIGHT ────────────────────────────────────────────────────

    let spotlightEvent = null;

    const resolveEvent = (id) => allEvents.find(e => e.id === id) || null;

    const buildEventPayload = (event) => ({
      id:          event.id,
      name:        event.name,
      subtitle:    event.series_name || event.season || null,
      image:       event.image_url || null,
      event_date:  event.event_date || null,
      location:    event.location_note || null,
      series_name: event.series_name || null,
      track_name:  event.track_name  || null,
      status:      event.status || event.public_status || null,
    });

    if (mode !== 'auto' && settings?.spotlight_event_id) {
      const manual = resolveEvent(settings.spotlight_event_id);
      if (manual) spotlightEvent = buildEventPayload(manual);
    }

    if (!spotlightEvent && mode !== 'manual') {
      // 1. Nearest upcoming published event
      const upcoming = allEvents
        .filter(e => e.event_date >= today && (e.status === 'Published' || e.public_status === 'published' || e.published_flag))
        .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

      if (upcoming) {
        spotlightEvent = buildEventPayload(upcoming);
      } else {
        // 2. Most recently completed event with results
        const completedEventId = allResults[0]?.event_id;
        if (completedEventId) {
          const completed = allEvents.find(e => e.id === completedEventId);
          if (completed) spotlightEvent = buildEventPayload(completed);
        }

        // 3. Any event fallback
        if (!spotlightEvent && allEvents.length > 0) {
          spotlightEvent = buildEventPayload(allEvents[0]);
        }
      }
    }

    return Response.json({ spotlight_driver: spotlightDriver, spotlight_event: spotlightEvent });
  } catch (error) {
    return Response.json({ spotlight_driver: null, spotlight_event: null });
  }
});