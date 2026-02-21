import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Maps NASCAR series_id to our series names
const SERIES_NAMES = {
  1: 'NASCAR Cup Series',
  2: "NASCAR O'Reilly Auto Parts Series",
  3: 'NASCAR Craftsman Truck Series',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      series_ids = [1, 2, 3],   // which series to sync
      season_year = 2026,
      dry_run = false,
    } = body;

    const log = [];
    const stats = { tracks_created: 0, tracks_skipped: 0, events_created: 0, events_updated: 0, events_skipped: 0 };

    // Load existing DB data once
    const [existingTracks, existingEvents, existingSeries] = await Promise.all([
      base44.asServiceRole.entities.Track.list(),
      base44.asServiceRole.entities.Event.list(),
      base44.asServiceRole.entities.Series.list(),
    ]);

    const trackByName = {};
    for (const t of existingTracks) {
      trackByName[t.name.toLowerCase().trim()] = t;
    }

    const eventByNameAndDate = {};
    for (const e of existingEvents) {
      const key = `${(e.name || '').toLowerCase()}|${e.event_date}`;
      eventByNameAndDate[key] = e;
    }

    const seriesByName = {};
    for (const s of existingSeries) {
      seriesByName[s.name.toLowerCase()] = s;
    }

    for (const seriesId of series_ids) {
      const seriesName = SERIES_NAMES[seriesId];
      if (!seriesName) { log.push(`Unknown series_id: ${seriesId}`); continue; }

      const url = `https://cf.nascar.com/cacher/${season_year}/${seriesId}/schedule-feed.json`;
      log.push(`Fetching: ${url}`);

      const res = await fetch(url);
      if (!res.ok) { log.push(`  ERROR: ${res.status}`); continue; }

      const schedule = await res.json();

      // Get unique races (dedup by race_id, only run_type=3 = race sessions)
      const races = schedule
        .filter(e => e.run_type === 3)
        .reduce((acc, e) => {
          if (!acc.find(r => r.race_id === e.race_id)) acc.push(e);
          return acc;
        }, []);

      log.push(`  Found ${races.length} races for ${seriesName}`);

      // Get unique tracks from this schedule
      const uniqueTracks = [...new Map(races.map(r => [r.track_id, r])).values()];

      for (const r of uniqueTracks) {
        const tName = (r.track_name || '').trim();
        if (!tName) continue;
        const tKey = tName.toLowerCase();

        if (trackByName[tKey]) {
          log.push(`  Track exists: ${tName}`);
          stats.tracks_skipped++;
        } else {
          log.push(`  Creating track: ${tName}`);
          if (!dry_run) {
            const created = await base44.asServiceRole.entities.Track.create({
              name: tName,
              status: 'Active',
              location_city: '',
              location_country: 'United States',
            });
            trackByName[tKey] = created;
          }
          stats.tracks_created++;
        }
      }

      // Find or ensure the Series record exists
      let dbSeries = seriesByName[seriesName.toLowerCase()];
      if (!dbSeries && !dry_run) {
        dbSeries = await base44.asServiceRole.entities.Series.create({
          name: seriesName,
          full_name: seriesName,
          discipline: 'Stock Car',
          region: 'United States',
          series_level: 'National',
          sanctioning_body: 'NASCAR',
          status: 'Active',
          season_year: season_year.toString(),
        });
        seriesByName[seriesName.toLowerCase()] = dbSeries;
        log.push(`  Created series: ${seriesName}`);
      }

      // Create/update events
      for (const race of races) {
        const raceName = (race.race_name || '').trim();
        const raceDate = race.start_time ? race.start_time.split('T')[0] : null;
        if (!raceName || !raceDate) { stats.events_skipped++; continue; }

        const trackKey = (race.track_name || '').toLowerCase().trim();
        const trackRecord = trackByName[trackKey];
        const isPast = raceDate < new Date().toISOString().split('T')[0];

        const eventData = {
          name: raceName,
          series: seriesName,
          season: season_year.toString(),
          event_date: raceDate,
          status: isPast ? 'completed' : 'upcoming',
          track_id: trackRecord?.id || null,
          round_number: race.race_id || null,
        };

        const eventKey = `${raceName.toLowerCase()}|${raceDate}`;
        const existing = eventByNameAndDate[eventKey];

        if (existing) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Event.update(existing.id, {
              track_id: eventData.track_id || existing.track_id,
              status: eventData.status,
            });
          }
          log.push(`  Updated event: ${raceName} (${raceDate})`);
          stats.events_updated++;
        } else {
          if (!dry_run) {
            const created = await base44.asServiceRole.entities.Event.create(eventData);
            eventByNameAndDate[eventKey] = created;
          }
          log.push(`  Created event: ${raceName} (${raceDate})`);
          stats.events_created++;
        }
      }
    }

    return Response.json({ success: true, dry_run, season: season_year, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});