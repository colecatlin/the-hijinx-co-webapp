import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, entityType, sheetName = 'Sheet1' } = await req.json();

    if (!spreadsheetId || !entityType) {
      return Response.json({ error: 'Missing spreadsheetId or entityType' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Fetch sheet data
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const sheetData = await sheetResponse.json();
    const rows = sheetData.values || [];

    if (rows.length < 2) {
      return Response.json({ error: 'Sheet is empty or has no data' }, { status: 400 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert rows to objects
    const records = dataRows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      return record;
    }).filter(record => Object.values(record).some(val => val)); // Filter empty rows

    // Map entity type and perform upsert
    let syncedCount = 0;

    for (const record of records) {
      if (entityType === 'StandingsEntry') {
        // For standings, create or update based on series_id + season + position + driver_name
        const existingStanding = await base44.entities.StandingsEntry.filter({
          series_id: record.series_id,
          season: parseInt(record.season),
          position: parseInt(record.position),
          driver_name: record.driver_name,
        });

        if (existingStanding.length > 0) {
          await base44.entities.StandingsEntry.update(existingStanding[0].id, record);
        } else {
          // Ensure numeric fields are numbers
          const sanitized = {
            ...record,
            season: parseInt(record.season) || 0,
            position: parseInt(record.position) || 0,
            points: parseInt(record.points) || 0,
            wins: parseInt(record.wins) || 0,
            podiums: parseInt(record.podiums) || 0,
            starts: parseInt(record.starts) || 0,
          };
          await base44.entities.StandingsEntry.create(sanitized);
        }
        syncedCount++;
      } else if (entityType === 'Event') {
        // For results, create or update based on name + date
        const existingEvent = await base44.entities.Event.filter({
          name: record.name,
          date: record.date,
        });

        if (existingEvent.length > 0) {
          await base44.entities.Event.update(existingEvent[0].id, record);
        } else {
          await base44.entities.Event.create(record);
        }
        syncedCount++;
      } else if (entityType === 'Driver') {
        // For drivers, create or update based on first_name + last_name
        const existingDriver = await base44.entities.Driver.filter({
          first_name: record.first_name,
          last_name: record.last_name,
        });

        if (existingDriver.length > 0) {
          await base44.entities.Driver.update(existingDriver[0].id, record);
        } else {
          await base44.entities.Driver.create(record);
        }
        syncedCount++;
      } else if (entityType === 'Team') {
        // For teams, create or update based on name
        const existingTeam = await base44.entities.Team.filter({
          name: record.name,
        });

        if (existingTeam.length > 0) {
          await base44.entities.Team.update(existingTeam[0].id, record);
        } else {
          await base44.entities.Team.create(record);
        }
        syncedCount++;
      } else if (entityType === 'Track') {
        // For tracks, create or update based on name
        const existingTrack = await base44.entities.Track.filter({
          name: record.name,
        });

        if (existingTrack.length > 0) {
          await base44.entities.Track.update(existingTrack[0].id, record);
        } else {
          await base44.entities.Track.create(record);
        }
        syncedCount++;
      } else if (entityType === 'Series') {
        // For series, create or update based on name
        const existingSeries = await base44.entities.Series.filter({
          name: record.name,
        });

        if (existingSeries.length > 0) {
          await base44.entities.Series.update(existingSeries[0].id, record);
        } else {
          await base44.entities.Series.create(record);
        }
        syncedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${syncedCount} ${entityType} records from Google Sheet`,
      recordsProcessed: syncedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});