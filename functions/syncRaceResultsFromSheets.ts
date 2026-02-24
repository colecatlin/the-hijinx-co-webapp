import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SHEET_ID = '1C1_brgPYr5acOPv3PSfYNSIu3B631J1nf5P-Zti90fA';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && req.method === 'POST') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?includeGridData=false`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const spreadsheet = await metaRes.json();

    if (!spreadsheet.sheets) {
      return Response.json({ error: 'No sheets found' }, { status: 400 });
    }

    const allResultsData = [];
    const processedSheets = [];

    for (const sheet of spreadsheet.sheets) {
      const eventName = sheet.properties.title;

      const dataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(eventName)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await dataRes.json();

      if (!data.values || data.values.length < 2) {
        continue;
      }

      const headers = data.values[0];
      const rows = data.values.slice(1);

      for (const row of rows) {
        if (!row || row.length === 0) continue;

        const seriesName = getVal(row, headers, ['series', 'series name']);
        const driverName = getVal(row, headers, ['driver', 'driver name']);
        const finishPosition = getVal(row, headers, ['finish', 'finishing position', 'position']);

        if (!seriesName || !driverName || !finishPosition) continue;

        const nameParts = driverName.trim().split(/\s+/);
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ') || '';

        const result = {
          event_name: eventName,
          series: seriesName,
          driver_name: driverName,
          first_name: firstName,
          last_name: lastName,
          position: parseInt(finishPosition) || 0,
          status_text: getVal(row, headers, ['status', 'final status']),
          make: getVal(row, headers, ['make', 'manufacturer']),
          starting_position: parseInt(getVal(row, headers, ['starting pos', 'starting position'])) || 0,
          laps_completed: parseInt(getVal(row, headers, ['laps completed', 'laps'])) || 0,
          laps_led: parseInt(getVal(row, headers, ['laps led'])) || 0,
          best_lap: getVal(row, headers, ['best lap']),
          points: parseFloat(getVal(row, headers, ['points'])) || 0,
          class: getVal(row, headers, ['class'])
        };

        if (result.position > 0) {
          allResultsData.push(result);
        }
      }

      if (allResultsData.length > 0) {
        processedSheets.push(eventName);
      }
    }

    if (allResultsData.length === 0) {
      return Response.json({ error: 'No valid race results found in any sheets' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Results.bulkCreate(allResultsData);

    return Response.json({
      success: true,
      message: `Synced ${allResultsData.length} race results from Google Sheets`,
      recordsImported: allResultsData.length,
      sheetsProcessed: processedSheets
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getVal(row, headers, searchTerms) {
  for (const term of searchTerms) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === term.toLowerCase());
    if (idx !== -1 && row[idx]) {
      return row[idx];
    }
  }
  return '';
}