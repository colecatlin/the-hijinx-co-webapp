import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create main folder "THE HIJINX CO API"
    const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'THE HIJINX CO API',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const folder = await folderResponse.json();
    const folderId = folder.id;

    // Entity schemas for column headers
    const sheetsConfig = {
      Standings: {
        displayName: 'Standings',
        columns: ['series_id', 'series_name', 'class_name', 'season', 'position', 'driver_id', 'driver_name', 'team_name', 'points', 'wins', 'podiums', 'starts', 'hometown', 'vehicle'],
      },
      Results: {
        displayName: 'Results',
        columns: ['name', 'series_id', 'series_name', 'track_id', 'track_name', 'date', 'end_date', 'season', 'status'],
      },
      Drivers: {
        displayName: 'Drivers',
        columns: ['first_name', 'last_name', 'date_of_birth', 'nationality', 'hometown_city', 'hometown_state', 'hometown_country', 'location_city', 'location_state', 'location_country', 'primary_number', 'primary_discipline', 'status'],
      },
      Teams: {
        displayName: 'Teams',
        columns: ['name', 'headquarters_city', 'headquarters_state', 'country', 'status', 'founded_year', 'description_summary', 'primary_discipline', 'team_level', 'ownership_type', 'owner_name', 'team_principal', 'content_value'],
      },
      Tracks: {
        displayName: 'Tracks',
        columns: ['name', 'city', 'state', 'country', 'status', 'founded_year', 'description_summary', 'track_type', 'length_miles', 'turns_count', 'capacity_est', 'pit_access', 'viewing_quality', 'camping', 'reliability', 'content_value'],
      },
      Series: {
        displayName: 'Series',
        columns: ['name', 'governing_body', 'discipline', 'founded_year', 'status', 'description_summary', 'region', 'competition_level'],
      },
    };

    const createdSheets = {};

    // Create sheets for each category
    for (const [key, config] of Object.entries(sheetsConfig)) {
      // Create spreadsheet directly in Drive with folder as parent
      const sheetResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.displayName,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId],
        }),
      });

      const sheetFile = await sheetResponse.json();
      const spreadsheetId = sheetFile.id;

      // Get the spreadsheet ID by checking if it's already a spreadsheet
      // For newly created spreadsheets in Drive, we need a small delay then verify
      let finalSpreadsheetId = spreadsheetId;
      
      // Verify the spreadsheet was created and get access to it
      const verifyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,mimeType,webViewLink`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const verifiedFile = await verifyResponse.json();
      finalSpreadsheetId = verifiedFile.id;

      // Add header row to the spreadsheet
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${finalSpreadsheetId}/values/Sheet1!A1`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [config.columns],
        }),
      });

      createdSheets[key] = {
        spreadsheetId: finalSpreadsheetId,
        sheetName: 'Sheet1',
        displayName: config.displayName,
      };
    }

    return Response.json({
      success: true,
      message: 'THE HIJINX CO API folder and sheets created successfully',
      folderId,
      sheets: createdSheets,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});