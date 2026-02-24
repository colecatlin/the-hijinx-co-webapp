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

    const body = await req.json();
    const { spreadsheetId, range = 'Sheet1!A1:J1000', eventName, seriesName, season } = body;

    if (!spreadsheetId || !eventName || !seriesName) {
      return Response.json(
        { error: 'spreadsheetId, eventName, and seriesName are required' },
        { status: 400 }
      );
    }

    // Get access token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch data from Google Sheets
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!sheetsResponse.ok) {
      return Response.json(
        { error: `Failed to fetch sheet: ${sheetsResponse.statusText}` },
        { status: sheetsResponse.status }
      );
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];

    if (rows.length < 2) {
      return Response.json(
        { error: 'Sheet must have headers and at least one data row' },
        { status: 400 }
      );
    }

    // Parse headers
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const positionIdx = headers.indexOf('position');
    const firstNameIdx = headers.indexOf('first name');
    const lastNameIdx = headers.indexOf('last name');
    const teamIdx = headers.indexOf('team');
    const pointsIdx = headers.indexOf('points');
    const lapsIdx = headers.indexOf('laps');
    const statusIdx = headers.indexOf('status');

    if (positionIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
      return Response.json(
        { error: 'Sheet must have columns: Position, First Name, Last Name' },
        { status: 400 }
      );
    }

    // Get or create event
    let event = await base44.asServiceRole.entities.Event.filter({
      name: eventName,
      series: seriesName
    });

    let eventId;
    if (!event || event.length === 0) {
      const newEvent = await base44.asServiceRole.entities.Event.create({
        name: eventName,
        series: seriesName,
        season: season || new Date().getFullYear().toString(),
        event_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });
      eventId = newEvent.id;
    } else {
      eventId = event[0].id;
    }

    // Get series for reference
    const series = await base44.asServiceRole.entities.Series.filter({
      name: seriesName
    });

    // Import results
    let resultsCreated = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const firstName = row[firstNameIdx]?.trim() || '';
      const lastName = row[lastNameIdx]?.trim() || '';
      const position = parseInt(row[positionIdx]) || null;

      if (!firstName || !lastName || !position) continue;

      // Find driver
      const driver = await base44.asServiceRole.entities.Driver.filter({
        first_name: firstName,
        last_name: lastName
      });

      if (!driver || driver.length === 0) continue;

      await base44.asServiceRole.entities.Results.create({
        driver_id: driver[0].id,
        event_id: eventId,
        position: position,
        status_text: statusIdx !== -1 ? (row[statusIdx] || 'Running') : 'Running',
        team_name: teamIdx !== -1 ? (row[teamIdx] || '') : '',
        series: seriesName,
        laps_completed: lapsIdx !== -1 ? (parseInt(row[lapsIdx]) || 0) : 0,
        points: pointsIdx !== -1 ? (parseInt(row[pointsIdx]) || 0) : 0
      });

      resultsCreated++;
    }

    return Response.json({
      success: true,
      message: `Imported ${resultsCreated} race results`,
      data: {
        resultsCreated,
        eventId,
        eventName
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});