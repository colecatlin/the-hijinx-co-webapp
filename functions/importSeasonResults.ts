import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
  return { headers, rows };
}

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { csvText, mapping } = body;

    if (!csvText) return Response.json({ error: 'No CSV data provided' }, { status: 400 });

    const { rows } = parseCSV(csvText);
    if (!rows.length) return Response.json({ error: 'No data rows found' }, { status: 400 });

    function getMapped(row, fieldKey) {
      const col = Object.entries(mapping || {}).find(([, v]) => v === fieldKey)?.[0];
      return col ? (row[col] || '') : '';
    }

    const [existingTracks, existingSeries, existingSeriesClasses, existingEvents, existingDrivers, existingPrograms, existingResults] = await Promise.all([
      base44.asServiceRole.entities.Track.list(),
      base44.asServiceRole.entities.Series.list(),
      base44.asServiceRole.entities.SeriesClass.list(),
      base44.asServiceRole.entities.Event.list('-event_date', 2000),
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.DriverProgram.list(),
      base44.asServiceRole.entities.Results.list('-created_date', 5000),
    ]);

    const trackCache = {};
    const seriesCache = {};
    const classCache = {};
    const eventCache = {};
    const driverCache = {};
    const programCache = {};

    const log = [];
    let created = { tracks: 0, series: 0, classes: 0, events: 0, drivers: 0, programs: 0, results: 0 };
    let skipped_invalid = 0;
    let skipped_duplicates = 0;

    async function getOrCreateTrack(trackName, city, state, country) {
      const key = normalize(trackName);
      if (trackCache[key]) return trackCache[key];
      const existing = existingTracks.find(t => normalize(t.name) === key);
      if (existing) { trackCache[key] = existing.id; return existing.id; }
      if (!trackName) return null;
      const track = await base44.asServiceRole.entities.Track.create({
        name: trackName,
        location_city: city || 'Unknown',
        location_state: state || '',
        location_country: country || 'USA',
        status: 'Active',
      });
      existingTracks.push(track);
      trackCache[key] = track.id;
      created.tracks++;
      log.push(`Created track: ${trackName}`);
      return track.id;
    }

    async function getOrCreateSeries(seriesName, discipline) {
      const key = normalize(seriesName);
      if (seriesCache[key]) return seriesCache[key];
      const existing = existingSeries.find(s => normalize(s.name) === key);
      if (existing) { seriesCache[key] = existing.id; return existing.id; }
      if (!seriesName) return null;
      const series = await base44.asServiceRole.entities.Series.create({
        name: seriesName,
        discipline: discipline || 'Off Road',
        status: 'Active',
      });
      existingSeries.push(series);
      seriesCache[key] = series.id;
      created.series++;
      log.push(`Created series: ${seriesName}`);
      return series.id;
    }

    async function getOrCreateClass(seriesId, className) {
      if (!className || !seriesId) return null;
      const key = `${seriesId}::${normalize(className)}`;
      if (classCache[key]) return classCache[key];
      const existing = existingSeriesClasses.find(c => c.series_id === seriesId && normalize(c.class_name) === normalize(className));
      if (existing) { classCache[key] = existing.id; return existing.id; }
      const cls = await base44.asServiceRole.entities.SeriesClass.create({
        series_id: seriesId,
        class_name: className,
        active: true,
      });
      existingSeriesClasses.push(cls);
      classCache[key] = cls.id;
      created.classes++;
      log.push(`Created class: ${className}`);
      return cls.id;
    }

    const eventDateRange = {};

    async function getOrCreateEvent(eventName, eventDate, trackId, seriesId, season) {
      const key = `${normalize(eventName)}::${normalize(season || '')}`;
      if (!eventDateRange[key]) eventDateRange[key] = { min: eventDate, max: eventDate };
      else {
        if (eventDate < eventDateRange[key].min) eventDateRange[key].min = eventDate;
        if (eventDate > eventDateRange[key].max) eventDateRange[key].max = eventDate;
      }
      if (eventCache[key]) return eventCache[key];
      const existing = existingEvents.find(e =>
        normalize(e.name) === normalize(eventName) &&
        (e.season === String(season) || (!e.season && !season))
      );
      if (existing) {
        eventCache[key] = existing.id;
        if (eventDate > (existing.end_date || existing.event_date)) {
          await base44.asServiceRole.entities.Event.update(existing.id, { end_date: eventDate });
          existing.end_date = eventDate;
        }
        return existing.id;
      }
      if (!eventName || !eventDate) return null;
      const event = await base44.asServiceRole.entities.Event.create({
        name: eventName,
        event_date: eventDate,
        track_id: trackId || undefined,
        series_id: seriesId || undefined,
        season: season || new Date(eventDate).getFullYear().toString(),
        status: 'completed',
      });
      existingEvents.push(event);
      eventCache[key] = event.id;
      created.events++;
      log.push(`Created event: ${eventName} (${eventDate})`);
      return event.id;
    }

    async function getOrCreateDriver(firstName, lastName, bibNumber, racingBaseCity, racingBaseState, racingBaseCountry) {
      if (!firstName && !lastName) return null;
      const key = `${normalize(firstName)}::${normalize(lastName)}`;
      if (driverCache[key]) return driverCache[key];
      let existing = existingDrivers.find(d =>
        normalize(d.first_name) === normalize(firstName) && normalize(d.last_name) === normalize(lastName)
      );
      if (!existing && bibNumber) {
        existing = existingDrivers.find(d => d.primary_number === bibNumber);
      }
      if (existing) {
        // Update all info from import
        const updateData = {};
        if (bibNumber) updateData.primary_number = bibNumber;
        if (racingBaseCity) updateData.racing_base_city = racingBaseCity;
        if (racingBaseState) updateData.racing_base_state = racingBaseState;
        if (racingBaseCountry) updateData.racing_base_country = racingBaseCountry;
        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.Driver.update(existing.id, updateData);
          Object.assign(existing, updateData);
        }
        driverCache[key] = existing.id;
        return existing.id;
      }
      const driver = await base44.asServiceRole.entities.Driver.create({
        first_name: firstName,
        last_name: lastName,
        primary_number: bibNumber || undefined,
        racing_base_city: racingBaseCity || undefined,
        racing_base_state: racingBaseState || undefined,
        racing_base_country: racingBaseCountry || undefined,
        status: 'Active',
        profile_status: 'draft',
      });
      existingDrivers.push(driver);
      driverCache[key] = driver.id;
      created.drivers++;
      log.push(`Created driver: ${firstName} ${lastName}`);
      return driver.id;
    }

    async function getOrCreateProgram(driverId, seriesId, seriesClassId, season) {
      if (!driverId || !seriesId) return null;
      const startYear = parseInt(season) || 2025;
      const key = `${driverId}::${seriesId}::${startYear}`;
      if (programCache[key]) return programCache[key];
      const existing = existingPrograms.find(p =>
        p.driver_id === driverId && p.series_id === seriesId &&
        String(p.start_year) === String(startYear)
      );
      if (existing) { programCache[key] = existing.id; return existing.id; }
      const program = await base44.asServiceRole.entities.DriverProgram.create({
        driver_id: driverId,
        series_id: seriesId,
        series_class_id: seriesClassId || undefined,
        program_type: 'series',
        start_year: startYear,
        end_year: new Date().getFullYear(),
        status: 'active',
      });
      existingPrograms.push(program);
      programCache[key] = program.id;
      created.programs++;
      return program.id;
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      if (rowIdx > 0 && rowIdx % 10 === 0) await sleep(300);
      const row = rows[rowIdx];
      const trackName    = getMapped(row, 'track_name');
      const trackCity    = getMapped(row, 'track_city');
      const trackState   = getMapped(row, 'track_state');
      const trackCountry = getMapped(row, 'track_country') || 'USA';
      const seriesName   = getMapped(row, 'series_name');
      const discipline   = getMapped(row, 'discipline');
      const classNames   = getMapped(row, 'class_name').split(',').map(c => c.trim()).filter(c => c);
      const eventName    = getMapped(row, 'event_name');
      const eventDate    = getMapped(row, 'event_date');
      const season       = getMapped(row, 'season') || (eventDate ? new Date(eventDate).getFullYear().toString() : '2025');
      const firstName    = getMapped(row, 'driver_first_name');
      const lastName     = getMapped(row, 'driver_last_name');
      const bibNumber    = getMapped(row, 'bib_number');
      const racingBaseCity    = getMapped(row, 'racing_base_city');
      const racingBaseState   = getMapped(row, 'racing_base_state');
      const racingBaseCountry = getMapped(row, 'racing_base_country');
      const position     = getMapped(row, 'position');
      const sessionType  = getMapped(row, 'session_type');
      const statusText   = getMapped(row, 'status_text');
      const points       = getMapped(row, 'points');
      const laps         = getMapped(row, 'laps_completed');
      const bestLap      = getMapped(row, 'best_lap_time');
      const notes        = getMapped(row, 'notes');

      // Must have at minimum driver name or bib
      if (!firstName && !lastName && !bibNumber) { skipped_invalid++; continue; }
      // Must have event date
      if (!eventDate) { skipped_invalid++; continue; }

      const [trackId, seriesId] = await Promise.all([
        getOrCreateTrack(trackName, trackCity, trackState, trackCountry),
        getOrCreateSeries(seriesName, discipline),
      ]);

      const eventId = await getOrCreateEvent(eventName || `${seriesName || 'Race'} - ${eventDate}`, eventDate, trackId, seriesId, season);
      const driverId = await getOrCreateDriver(firstName, lastName, bibNumber, racingBaseCity, racingBaseState, racingBaseCountry);

      if (!driverId || !eventId) { skipped_invalid++; continue; }

      const statusMap = { 'Running': 'Running', 'Finished': 'Running', 'finished': 'Running', 'DNF': 'DNF', 'DNS': 'DNS', 'DSQ': 'DSQ', 'DNP': 'DNP' };
      const mappedStatus = statusMap[statusText] || (statusText ? 'Running' : undefined);

      const sessionTypeMap = {
        'practice': 'Practice', 'qualifying': 'Qualifying',
        'heat 1': 'Heat 1', 'heat 2': 'Heat 2', 'heat 3': 'Heat 3', 'heat 4': 'Heat 4',
        'heat': 'Heat 1', 'lcq': 'LCQ', 'final': 'Final', 'main': 'Final', 'main event': 'Final'
      };
      const mappedSession = sessionTypeMap[normalize(sessionType)] || sessionType || 'Final';

      // Process each class (handle comma-separated classes)
      for (const className of classNames) {
        const classId = seriesId ? await getOrCreateClass(seriesId, className) : null;
        const programId = await getOrCreateProgram(driverId, seriesId, classId, season);

        // Skip if result already exists for this driver+event+session+class
        const duplicate = existingResults.find(r =>
          r.driver_id === driverId &&
          r.event_id === eventId &&
          (r.session_type || 'Final') === mappedSession &&
          r.series_class_id === classId
        );
        if (duplicate) { skipped_duplicates++; continue; }

        const newResult = await base44.asServiceRole.entities.Results.create({
          driver_id: driverId,
          event_id: eventId,
          program_id: programId || '',
          series_id: seriesId || undefined,
          series_class_id: classId || undefined,
          session_type: mappedSession,
          position: position ? (parseInt(position) || undefined) : undefined,
          status: mappedStatus,
          points: points ? (parseFloat(points) || undefined) : undefined,
          laps_completed: laps ? (parseInt(laps) || undefined) : undefined,
          best_lap_time: bestLap ? (parseFloat(bestLap) || undefined) : undefined,
          notes: notes || undefined,
        });
        existingResults.push(newResult);
        created.results++;
      }
    }

    return Response.json({
      success: true,
      summary: created,
      skipped_invalid,
      skipped_duplicates,
      log: log.slice(0, 50),
      total_rows: rows.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});