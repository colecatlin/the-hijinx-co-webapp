import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated users (manual trigger) and service role (automation)
    const body = await req.json().catch(() => ({}));
    const { series_id, series_name, season_year } = body;

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all PointsConfigs (optionally filtered by series)
    let configs = await base44.asServiceRole.entities.PointsConfig.list();
    if (series_id) configs = configs.filter(c => c.series_id === series_id);
    if (series_name) configs = configs.filter(c => c.series_name === series_name);
    if (season_year) configs = configs.filter(c => c.season_year === season_year);
    configs = configs.filter(c => c.status === 'active' && c.spreadsheet_id);

    if (configs.length === 0) {
      return Response.json({ success: false, message: 'No active PointsConfig found.' });
    }

    const summary = [];

    for (const config of configs) {
      const { spreadsheet_id, series_name: sName, season_year: sYear, classes = [] } = config;

      // --- Fetch RULES tab ---
      let rulesMap = {}; // className -> { positions: {1: pts, 2: pts}, bonuses: {...} }
      try {
        const rulesResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/RULES`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const rulesData = await rulesResp.json();
        const rulesRows = rulesData.values || [];
        if (rulesRows.length >= 2) {
          const headers = rulesRows[0].map(h => h.trim().toLowerCase());
          for (let i = 1; i < rulesRows.length; i++) {
            const row = rulesRows[i];
            const className = row[headers.indexOf('class')] || '';
            if (!className) continue;
            if (!rulesMap[className]) rulesMap[className] = { positions: {}, bonuses: {} };
            const position = parseInt(row[headers.indexOf('position')]);
            const pts = parseFloat(row[headers.indexOf('points')]) || 0;
            if (!isNaN(position)) rulesMap[className].positions[position] = pts;
            // Bonus columns: stage_win, leading_lap, fastest_lap, etc.
            const bonusKeys = ['stage_win', 'leading_lap', 'fastest_lap', 'most_laps_led', 'pole'];
            bonusKeys.forEach(bk => {
              const idx = headers.indexOf(bk);
              if (idx !== -1 && row[idx]) {
                rulesMap[className].bonuses[bk] = parseFloat(row[idx]) || 0;
              }
            });
          }
        }
      } catch (e) {
        // RULES tab missing or unreadable — continue with class tabs
      }

      // --- Process each class tab ---
      const classTabs = classes.length > 0 ? classes : [];

      // If no classes defined, try to get sheet metadata to find tabs
      if (classTabs.length === 0) {
        try {
          const metaResp = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const meta = await metaResp.json();
          const sheets = meta.sheets || [];
          sheets.forEach(s => {
            const title = s.properties?.title;
            if (title && title !== 'RULES') classTabs.push(title);
          });
        } catch (e) {}
      }

      for (const className of classTabs) {
        try {
          const classResp = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(className)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const classData = await classResp.json();
          const rows = classData.values || [];
          if (rows.length < 2) continue;

          const headers = rows[0].map(h => h.trim().toLowerCase());
          const dataRows = rows.slice(1).filter(r => r.some(c => c));

          // Fetch existing Results for this series + season + class
          const allResults = await base44.asServiceRole.entities.Results.list();
          const relevantResults = allResults.filter(r =>
            r.series === sName && r.class === className
          );

          // Build driver point totals from Results
          const driverTotals = {};

          for (const result of relevantResults) {
            const dKey = result.driver_id;
            if (!driverTotals[dKey]) {
              driverTotals[dKey] = {
                driver_id: dKey,
                total_points: 0,
                bonus_points: 0,
                wins: 0,
                podiums: 0,
                events_counted: 0,
              };
            }

            const classRules = rulesMap[className] || {};
            const positionPoints = classRules.positions?.[result.position] || 0;
            driverTotals[dKey].total_points += positionPoints;
            driverTotals[dKey].events_counted += 1;
            if (result.position === 1) driverTotals[dKey].wins += 1;
            if (result.position <= 3) driverTotals[dKey].podiums += 1;
          }

          // Also apply sheet-level data (standings, first/last name, bib, total_points)
          // Sheet data overrides calculated if present (manual overrides)
          for (const row of dataRows) {
            const rowObj = {};
            headers.forEach((h, i) => { rowObj[h] = row[i] || ''; });

            const sheetPoints = parseFloat(rowObj['total points'] || rowObj['total_points'] || rowObj['points']) || null;
            const firstName = rowObj['first name'] || rowObj['first_name'] || '';
            const lastName = rowObj['last name'] || rowObj['last_name'] || '';
            const bibNumber = rowObj['bib number'] || rowObj['bib_number'] || rowObj['bib'] || rowObj['number'] || '';

            if (!firstName && !lastName) continue;

            // Try to match to a driver in DB
            const matchedDrivers = await base44.asServiceRole.entities.Driver.list();
            const matched = matchedDrivers.find(d =>
              d.first_name?.toLowerCase() === firstName.toLowerCase() &&
              d.last_name?.toLowerCase() === lastName.toLowerCase()
            );
            const driverId = matched?.id || null;

            const dKey = driverId || `${firstName}_${lastName}`;
            if (!driverTotals[dKey]) {
              driverTotals[dKey] = {
                driver_id: driverId,
                total_points: 0,
                bonus_points: 0,
                wins: 0,
                podiums: 0,
                events_counted: 0,
              };
            }

            if (sheetPoints !== null) driverTotals[dKey].total_points = sheetPoints;
            driverTotals[dKey].first_name = firstName;
            driverTotals[dKey].last_name = lastName;
            driverTotals[dKey].bib_number = bibNumber;
          }

          // Sort by total_points descending and assign positions
          const sorted = Object.values(driverTotals).sort((a, b) => b.total_points - a.total_points);

          // Upsert standings records
          const existingStandings = await base44.asServiceRole.entities.Standings.filter({
            series_name: sName,
            season_year: sYear,
            class_name: className,
          });

          for (let i = 0; i < sorted.length; i++) {
            const entry = sorted[i];
            const position = i + 1;

            const standingData = {
              series_name: sName,
              series_id: config.series_id || null,
              season_year: sYear,
              class_name: className,
              position,
              driver_id: entry.driver_id || null,
              first_name: entry.first_name || '',
              last_name: entry.last_name || '',
              bib_number: entry.bib_number || '',
              total_points: entry.total_points,
              bonus_points: entry.bonus_points || 0,
              wins: entry.wins || 0,
              podiums: entry.podiums || 0,
              events_counted: entry.events_counted || 0,
              last_calculated: new Date().toISOString(),
            };

            const existing = existingStandings.find(s =>
              s.driver_id === entry.driver_id ||
              (s.first_name === entry.first_name && s.last_name === entry.last_name)
            );

            if (existing) {
              await base44.asServiceRole.entities.Standings.update(existing.id, standingData);
            } else {
              await base44.asServiceRole.entities.Standings.create(standingData);
            }
          }

          summary.push({ series: sName, season: sYear, class: className, drivers: sorted.length });
        } catch (classErr) {
          summary.push({ series: sName, class: className, error: classErr.message });
        }
      }
    }

    return Response.json({ success: true, processed: summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});