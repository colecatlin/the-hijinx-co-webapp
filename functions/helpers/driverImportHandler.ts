// Specialized handler for Driver imports
// Handles series/class creation, location mapping, and program setup

export async function importDrivers(base44, rows, headers) {
  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  // Cache for series/classes/teams to avoid duplicates
  const seriesCache = new Map();
  const classCache = new Map();
  const teamCache = new Map();

  function normalizeHeader(h) {
    return h.toLowerCase().trim().replace(/[\s\-\/().#]/g, '_').replace(/__+/g, '_');
  }

  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  // Find a field value from row (checks multiple possible column names)
  function getField(row, possibleNames) {
    for (const name of possibleNames) {
      for (const header of headers) {
        if (normalizeHeader(header) === normalizeHeader(name)) {
          return row[header];
        }
      }
    }
    return '';
  }

  // Get or create a Series record
  async function getOrCreateSeries(seriesName, discipline, geographicScope) {
    if (!seriesName) return null;

    const key = normalize(seriesName);
    if (seriesCache.has(key)) {
      return seriesCache.get(key);
    }

    try {
      // Try to find existing series
      const existing = await base44.asServiceRole.entities.Series.filter({});
      const found = existing.find(s => normalize(s.full_name) === key);

      if (found) {
        seriesCache.set(key, found);
        return found;
      }

      // Create new series
      const newSeries = await base44.asServiceRole.entities.Series.create({
        full_name: seriesName,
        discipline: discipline || 'Mixed',
        geographic_scope: geographicScope || 'Regional',
        sanctioning_body: '',
        season_year: new Date().getFullYear().toString(),
      });

      seriesCache.set(key, newSeries);
      return newSeries;
    } catch (e) {
      console.error(`Failed to get/create series "${seriesName}": ${e.message}`);
      return null;
    }
  }

  // Get or create a SeriesClass
  async function getOrCreateSeriesClass(series, className, competitionLevel) {
    if (!series || !className) return null;

    const key = `${series.id}-${normalize(className)}`;
    if (classCache.has(key)) {
      return classCache.get(key);
    }

    try {
      // Try to find existing class in this series
      const existing = await base44.asServiceRole.entities.SeriesClass.filter({ series_id: series.id });
      const found = existing.find(c => normalize(c.class_name) === normalize(className));

      if (found) {
        classCache.set(key, found);
        return found;
      }

      // Create new class
      const newClass = await base44.asServiceRole.entities.SeriesClass.create({
        series_id: series.id,
        class_name: className,
        competition_level: competitionLevel || 'Amateur',
        active: true,
      });

      classCache.set(key, newClass);
      return newClass;
    } catch (e) {
      console.error(`Failed to get/create series class "${className}": ${e.message}`);
      return null;
    }
  }

  // Get or create a Team record
  async function getOrCreateTeam(teamName, city, state, country) {
    if (!teamName) return null;

    const key = normalize(teamName);
    if (teamCache.has(key)) {
      return teamCache.get(key);
    }

    try {
      const existing = await base44.asServiceRole.entities.Team.filter({});
      const found = existing.find(t => normalize(t.name) === key);

      if (found) {
        teamCache.set(key, found);
        return found;
      }

      const newTeam = await base44.asServiceRole.entities.Team.create({
        name: teamName,
        headquarters_city: city || '',
        headquarters_state: state || '',
        country: country || '',
        status: 'Active',
      });

      teamCache.set(key, newTeam);
      return newTeam;
    } catch (e) {
      console.error(`Failed to get/create team "${teamName}": ${e.message}`);
      return null;
    }
  }

  // Map CSV row to driver data
  function mapDriverRow(row) {
    const firstName = getField(row, ['first_name', 'firstname', 'fname']);
    const lastName = getField(row, ['last_name', 'lastname', 'lname']);

    if (!firstName || !lastName) {
      return null; // Skip invalid rows
    }

    return {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: getField(row, ['date_of_birth', 'dob', 'birth_date']) || undefined,
      contact_email: getField(row, ['contact_email', 'email']) || undefined,
      primary_number: getField(row, ['primary_number', 'bib_number', 'car_number', 'number']) || undefined,
      manufacturer: getField(row, ['manufacturer', 'car_brand']) || undefined,
      primary_discipline: getField(row, ['primary_discipline', 'discipline']) || 'Mixed',
      hometown_city: getField(row, ['hometown_city', 'birth_city', 'hometown']) || undefined,
      hometown_state: getField(row, ['hometown_state', 'birth_state']) || undefined,
      hometown_country: getField(row, ['hometown_country', 'birth_country']) || undefined,
      racing_base_city: getField(row, ['racing_base_city', 'current_city']) || undefined,
      racing_base_state: getField(row, ['racing_base_state', 'current_state']) || undefined,
      racing_base_country: getField(row, ['racing_base_country', 'current_country']) || undefined,
      career_status: getField(row, ['career_status', 'status']) || 'Amateur',
      team_id: getField(row, ['team_id', 'team']) || undefined,
      represented_by: getField(row, ['represented_by', 'manager', 'agent']) || undefined,
      profile_status: 'draft',
    };
  }

  const existingDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const driverData = mapDriverRow(row);

    if (!driverData) {
      skipped++;
      continue;
    }

    try {
      // Check for duplicate driver
      const isDuplicate = existingDrivers.some(d =>
        normalize(d.first_name) === normalize(driverData.first_name) &&
        normalize(d.last_name) === normalize(driverData.last_name)
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Create driver
      const driver = await base44.asServiceRole.entities.Driver.create(driverData);
      existingDrivers.push(driver);
      created++;

      // Get or create series if specified
      const seriesName = getField(row, ['series_name', 'series']);
      const className = getField(row, ['class_name', 'class']);
      const discipline = getField(row, ['discipline']);
      const geographicScope = getField(row, ['geographic_scope']);
      const competitionLevel = getField(row, ['competition_level']);

      // Resolve team: use CSV team name, or default to "{First} {Last} Racing"
      const csvTeamName = getField(row, ['team_name', 'team']);
      const teamName = csvTeamName || `${driverData.first_name} ${driverData.last_name} Racing`;
      const team = await getOrCreateTeam(
        teamName,
        driverData.hometown_city,
        driverData.hometown_state,
        driverData.hometown_country
      );

      // Link team_id to driver if not already set
      if (team && !driverData.team_id) {
        await base44.asServiceRole.entities.Driver.update(driver.id, { team_id: team.id });
      }

      if (seriesName) {
        const series = await getOrCreateSeries(seriesName, discipline, geographicScope);
        
        if (series && className) {
          const seriesClass = await getOrCreateSeriesClass(series, className, competitionLevel);
          
          // Create DriverProgram to link driver to series/class/team
          if (seriesClass) {
            try {
              await base44.asServiceRole.entities.DriverProgram.create({
                driver_id: driver.id,
                series_id: series.id,
                series_class_id: seriesClass.id,
                team_id: team?.id || undefined,
                program_type: 'racing',
                participation_status: 'active',
                races_participated: 0,
              });
            } catch (e) {
              // DriverProgram may not exist or fail - continue anyway
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 50)); // Rate limit protection
    } catch (e) {
      failed++;
      errors.push({ row: i + 2, error: e.message });
    }
  }

  return { created, updated, failed, skipped, errors };
}