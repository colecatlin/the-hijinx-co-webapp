import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get the access token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch data from Google Sheets
    const sheetId = '1j3m4xfz9mxBV1k8IISXatgwPmZ4Wbyu1M36YMdQFWwo';
    const sheetName = 'Import_Results';
    const range = `${sheetName}!A:M`;

    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      return Response.json(
        { error: `Failed to fetch sheet: ${errorText}` },
        { status: 400 }
      );
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length < 2) {
      return Response.json({ error: 'Sheet is empty or has no data rows' }, { status: 400 });
    }

    // Parse header
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map to columns
    const colMap = {
      event_date: headers.indexOf('event_date'),
      event_name: headers.indexOf('event_name'),
      event_location: headers.indexOf('event_location'),
      series_name: headers.indexOf('series_name'),
      class_name: headers.indexOf('class_name'),
      round_number: headers.indexOf('round_number'),
      session_type: headers.indexOf('session_type'),
      driver_first_name: headers.indexOf('driver_first_name'),
      driver_last_name: headers.indexOf('driver_last_name'),
      team_name: headers.indexOf('team_name'),
      position: headers.indexOf('position'),
      status: headers.indexOf('status'),
      laps_completed: headers.indexOf('laps_completed'),
    };

    // Validate columns
    for (const [col, idx] of Object.entries(colMap)) {
      if (idx === -1) {
        return Response.json(
          { error: `Missing column: ${col}` },
          { status: 400 }
        );
      }
    }

    // Process data
    let seriesCreated = 0;
    let classesCreated = 0;
    let eventsCreated = 0;
    let sessionsCreated = 0;
    let driversCreated = 0;
    let teamsCreated = 0;
    let resultsCreated = 0;
    let errors = [];

    // Group data by series -> class -> event -> session
    const seriesMap = {};

    for (const row of dataRows) {
      if (!row[colMap.event_date]) continue; // Skip empty rows

      const seriesName = row[colMap.series_name]?.trim();
      const className = row[colMap.class_name]?.trim();
      const eventDate = row[colMap.event_date]?.trim();
      const eventName = row[colMap.event_name]?.trim();
      const eventLocation = row[colMap.event_location]?.trim();
      const roundNumber = parseInt(row[colMap.round_number]) || 1;
      const sessionType = row[colMap.session_type]?.trim();
      const driverFirstName = row[colMap.driver_first_name]?.trim();
      const driverLastName = row[colMap.driver_last_name]?.trim();
      const teamName = row[colMap.team_name]?.trim();
      const position = parseInt(row[colMap.position]) || null;
      const status = row[colMap.status]?.trim() || 'Running';
      const lapsCompleted = parseInt(row[colMap.laps_completed]) || 0;

      if (!seriesName || !driverFirstName || !driverLastName) {
        errors.push(`Skipped incomplete row: missing series, driver first name, or driver last name`);
        continue;
      }

      // Get or create series
      let series = await base44.asServiceRole.entities.Series.filter({ name: seriesName }).then(r => r[0]);
      if (!series) {
        series = await base44.asServiceRole.entities.Series.create({
          name: seriesName,
          discipline: 'Off Road',
          geographic_scope: 'National',
        });
        seriesCreated++;
      }

      // Get or create class
      let seriesClass = await base44.asServiceRole.entities.SeriesClass.filter({
        series_id: series.id,
        name: className,
      }).then(r => r[0]);
      if (!seriesClass) {
        seriesClass = await base44.asServiceRole.entities.SeriesClass.create({
          series_id: series.id,
          name: className,
        });
        classesCreated++;
      }

      // Get or create driver
      let driver = await base44.asServiceRole.entities.Driver.filter({
        first_name: driverFirstName,
        last_name: driverLastName,
      }).then(r => r[0]);
      if (!driver) {
        driver = await base44.asServiceRole.entities.Driver.create({
          first_name: driverFirstName,
          last_name: driverLastName,
          primary_discipline: 'Off Road',
          profile_status: 'draft',
        });
        driversCreated++;
      }

      // Get or create team
      let team = null;
      if (teamName) {
        team = await base44.asServiceRole.entities.Team.filter({ name: teamName }).then(r => r[0]);
        if (!team) {
          team = await base44.asServiceRole.entities.Team.create({
            name: teamName,
            headquarters_city: 'TBD',
            headquarters_state: 'TBD',
            country: 'United States',
            primary_discipline: 'Off Road',
          });
          teamsCreated++;
        }
      }

      // Get or create event
      const eventKey = `${eventDate}_${eventName}_${eventLocation}`;
      let event = await base44.asServiceRole.entities.Event.filter({
        event_date: eventDate,
        name: eventName,
      }).then(r => r[0]);
      if (!event) {
        event = await base44.asServiceRole.entities.Event.create({
          event_date: eventDate,
          name: eventName,
          series: seriesName,
          season: new Date(eventDate).getFullYear().toString(),
          round_number: roundNumber,
        });
        eventsCreated++;
      }

      // Get or create session
      let session = await base44.asServiceRole.entities.Session.filter({
        event_id: event.id,
        session_type: sessionType,
      }).then(r => r[0]);
      if (!session) {
        session = await base44.asServiceRole.entities.Session.create({
          event_id: event.id,
          session_type: sessionType,
          name: sessionType,
        });
        sessionsCreated++;
      }

      // Create result
      await base44.asServiceRole.entities.Results.create({
        driver_id: driver.id,
        event_id: event.id,
        session_id: session.id,
        series_id: series.id,
        series_class_id: seriesClass.id,
        team_id: team?.id,
        position: position,
        status: status,
        laps_completed: lapsCompleted,
        session_type: sessionType,
      });
      resultsCreated++;
    }

    return Response.json({
      success: true,
      stats: {
        seriesCreated,
        classesCreated,
        eventsCreated,
        sessionsCreated,
        driversCreated,
        teamsCreated,
        resultsCreated,
      },
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});