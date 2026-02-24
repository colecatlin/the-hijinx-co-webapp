import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SHEET_ID = '1C1_brgPYr5acOPv3PSfYNSIu3B631J1nf5P-Zti90fA';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to manually sync
    if (user.role !== 'admin' && req.method === 'POST') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get access token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all sheets to find standings sheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?includeGridData=false`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const spreadsheet = await metaRes.json();

    if (!spreadsheet.sheets) {
      return Response.json({ error: 'No sheets found' }, { status: 400 });
    }

    // Collect all standings data from all tabs (each tab = event name)
    const allStandingsData = [];
    const processedSheets = [];

    for (const sheet of spreadsheet.sheets) {
      const sheetName = sheet.properties.title;

      // Fetch sheet data
      const dataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await dataRes.json();

      if (!data.values || data.values.length < 2) {
        continue; // Skip empty sheets
      }

      const headers = data.values[0];
      const rows = data.values.slice(1);

      for (const row of rows) {
        if (!row || row.length === 0) continue;

        const standing = {
          event_name: sheetName, // Tab name = event name
          series_name: getVal(row, headers, ['series', 'series name']),
          season_year: getVal(row, headers, ['season', 'year']),
          class_name: getVal(row, headers, ['class', 'class name']),
          position: parseFloat(getVal(row, headers, ['position', 'pos', 'rank']) || 0) || 0,
          first_name: getVal(row, headers, ['first name', 'firstname', 'driver first']),
          last_name: getVal(row, headers, ['last name', 'lastname', 'driver last']),
          bib_number: getVal(row, headers, ['bib', 'number', 'car number', 'car #']),
          total_points: parseFloat(getVal(row, headers, ['points', 'total points']) || 0) || 0,
          events_counted: parseFloat(getVal(row, headers, ['events counted', 'events']) || 0) || 0,
          wins: parseFloat(getVal(row, headers, ['wins']) || 0) || 0,
          podiums: parseFloat(getVal(row, headers, ['podiums', 'top 3']) || 0) || 0,
          bonus_points: parseFloat(getVal(row, headers, ['bonus points', 'bonus']) || 0) || 0,
        };

        // Validate required fields
        if (standing.series_name && standing.season_year && standing.class_name) {
          allStandingsData.push(standing);
        }
      }

      if (allStandingsData.length > 0) {
        processedSheets.push(sheetName);
      }
    }

    if (allStandingsData.length === 0) {
      return Response.json({ error: 'No valid standings data found in any sheets' }, { status: 400 });
    }

    // Delete existing standings for this series/season/class combo
    const seriesSet = new Set(allStandingsData.map(s => s.series_name));
    const seasonSet = new Set(allStandingsData.map(s => s.season_year));

    for (const series of seriesSet) {
      for (const season of seasonSet) {
        const existing = await base44.asServiceRole.entities.Standings.filter({
          series_name: series,
          season_year: season
        });
        
        for (const item of existing) {
          await base44.asServiceRole.entities.Standings.delete(item.id);
        }
      }
    }

    // Create new standings
    await base44.asServiceRole.entities.Standings.bulkCreate(allStandingsData);

    return Response.json({
      success: true,
      message: `Synced ${allStandingsData.length} standings from Google Sheets`,
      recordsImported: allStandingsData.length,
      series: Array.from(seriesSet),
      seasons: Array.from(seasonSet),
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