import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Score headers against field signatures to detect entity type
const ENTITY_SIGNATURES = {
  Driver: {
    strong: ['first_name', 'last_name', 'date_of_birth', 'primary_number', 'career_status'],
    weak: ['hometown_city', 'hometown_state', 'manufacturer', 'slug'],
  },
  Team: {
    strong: ['headquarters_city', 'headquarters_state', 'team_level', 'founded_year'],
    weak: ['primary_discipline', 'manufacturer', 'description_summary'],
  },
  Track: {
    strong: ['location_city', 'location_state', 'surface_type', 'track_type', 'length_miles'],
    weak: ['location_country', 'capacity', 'website_url'],
  },
  Series: {
    strong: ['discipline', 'geographic_scope', 'sanctioning_body', 'season_year'],
    weak: ['full_name', 'uses_rounds', 'popularity_rank'],
  },
  Event: {
    strong: ['event_date', 'round_number', 'track_id'],
    weak: ['end_date', 'season', 'location_note', 'external_uid'],
  },
  Results: {
    strong: ['position', 'session_type', 'laps_completed', 'best_lap_time', 'driver_first_name', 'driver_last_name'],
    weak: ['points', 'status', 'notes'],
  },
  SeriesClass: {
    strong: ['class_name', 'series_id', 'competition_level'],
    weak: ['active', 'description'],
  },
  DriverProgram: {
    strong: ['driver_id', 'program_type', 'participation_status', 'races_participated'],
    weak: ['start_year', 'end_year', 'is_rookie', 'car_number'],
  },
  Standings: {
    strong: ['driver_id', 'series_class_id', 'total_points', 'final_position'],
    weak: ['wins', 'podiums', 'dnfs'],
  },
  OutletStory: {
    strong: ['primary_category', 'sub_category', 'body', 'author'],
    weak: ['subtitle', 'published_date', 'photo_credit'],
  },
};

function normalizeHeader(h) {
  return h.toLowerCase().trim().replace(/[\s\-\/().#]/g, '_').replace(/__+/g, '_');
}

function detectEntityType(headers) {
  const normHeaders = headers.map(normalizeHeader);
  const scores = {};

  for (const [entity, sig] of Object.entries(ENTITY_SIGNATURES)) {
    let score = 0;
    for (const field of sig.strong) {
      if (normHeaders.some(h => h === field || h.includes(field))) score += 3;
    }
    for (const field of sig.weak) {
      if (normHeaders.some(h => h === field || h.includes(field))) score += 1;
    }
    scores[entity] = score;
  }

  // Pick the highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const confidence = best[1] >= 3 ? 'high' : best[1] >= 1 ? 'medium' : 'low';

  return {
    entity: best[0],
    confidence,
    score: best[1],
    allScores: scores,
  };
}

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

// Generic entity import: maps CSV columns directly to entity fields
async function importGenericEntity(base44, entityName, rows, headers) {
  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  const entity = base44.asServiceRole.entities[entityName];
  if (!entity) {
    return { error: `Entity ${entityName} not found` };
  }

  // Fetch all existing records to check for duplicates
  const existingRecords = await entity.list('-created_date', 5000);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const data = {};
    for (const header of headers) {
      const norm = normalizeHeader(header);
      const val = row[header];
      if (val !== undefined && val !== '') {
        data[norm] = val;
      }
    }

    try {
      if (data.id) {
        const id = data.id;
        delete data.id;
        await entity.update(id, data);
        updated++;
      } else {
        // Check for duplicates before creating
        const isDuplicate = existingRecords.some(record => {
          // Compare all non-empty fields in the row data
          return Object.entries(data).every(([key, val]) => {
            const existingVal = record[key];
            return normalize(String(existingVal)) === normalize(String(val));
          });
        });

        if (isDuplicate) {
          skipped++;
        } else {
          await entity.create(data);
          existingRecords.push(data); // Add to cache for subsequent comparisons
          created++;
        }
      }
    } catch (e) {
      failed++;
      errors.push({ row: i + 2, error: e.message });
    }
  }

  return { created, updated, failed, skipped, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { csvText, action, overrideEntity } = body;

    if (!csvText) return Response.json({ error: 'No CSV data provided' }, { status: 400 });

    const { headers, rows } = parseCSV(csvText);
    if (!rows.length) return Response.json({ error: 'No data rows found' }, { status: 400 });

    // If action === 'detect', just return the detected entity type
    if (action === 'detect') {
      return Response.json(detectEntityType(headers));
    }

    // Use override if provided, otherwise auto-detect
    const entityName = overrideEntity || detectEntityType(headers).entity;

    // For Results, delegate to the specialized Results import logic inline
    if (entityName === 'Results') {
      // Build a passthrough mapping (header name → same header name)
      const autoMapping = {};
      const resultFieldKeys = [
        'event_name', 'event_date', 'season', 'track_name', 'track_city', 'track_state', 'track_country',
        'series_name', 'discipline', 'class_name', 'driver_first_name', 'driver_last_name', 'bib_number',
        'session_type', 'position', 'status_text', 'points', 'laps_completed', 'best_lap_time', 'notes',
      ];
      headers.forEach(h => {
        const norm = normalizeHeader(h);
        if (resultFieldKeys.includes(norm)) {
          autoMapping[h] = norm;
        }
      });

      // Invoke importSeasonResults with auto-mapping
      const res = await base44.functions.invoke('importSeasonResults', { csvText, mapping: autoMapping });
      return Response.json({ ...res, entityName: 'Results', usedSmartMapping: true });
    }

    // Generic import for all other entities
    const result = await importGenericEntity(base44, entityName, rows, headers);
    return Response.json({
      success: !result.error,
      entityName,
      ...result,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});