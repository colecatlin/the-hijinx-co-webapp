/**
 * smartCSVImport.js
 *
 * Two actions:
 *   detect — analyze CSV headers and return { entity, confidence, score }
 *   import — parse + route rows to safe sync pipeline (source entities)
 *            or direct entity create (operational entities)
 *
 * Source entities (Driver, Team, Track, Series, Event) always go through:
 *   prepareSourcePayloadForSync → syncSourceAndEntityRecord
 *
 * Operational entities (Results, Session, Standings, etc.) use direct create.
 * import_source is logged as 'smart_csv_import' in OperationLog.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SOURCE_ENTITY_TYPES = new Set(['Driver', 'Team', 'Track', 'Series', 'Event']);

// Header signature scoring for entity type detection
const ENTITY_SIGNATURES = {
  Driver: ['first_name', 'last_name', 'primary_number', 'primary_discipline', 'date_of_birth', 'hometown_city', 'hometown_state', 'career_status'],
  Team:   ['headquarters_city', 'headquarters_state', 'country', 'primary_discipline', 'team_level', 'founded_year'],
  Track:  ['location_city', 'location_state', 'track_type', 'surface_type', 'length', 'banking'],
  Series: ['sanctioning_body', 'discipline', 'geographic_scope', 'season_year', 'full_name'],
  Event:  ['event_date', 'end_date', 'track_name', 'series_name', 'round_number', 'season'],
  Results:    ['position', 'finish_position', 'session_name', 'laps_completed', 'best_lap_time_ms'],
  Session:    ['session_type', 'event_id', 'scheduled_time', 'max_entries'],
  Standings:  ['rank', 'points_total', 'wins', 'podiums'],
  SeriesClass:['class_name', 'max_entries', 'min_weight', 'max_weight'],
  OutletStory:['title', 'body', 'category', 'author', 'published_date'],
};

// Loose header sets used as tiebreaker hints
const ENTITY_HINTS = {
  Driver: ['name', 'driver'],
  Team: ['team'],
  Track: ['track'],
  Series: ['series'],
  Event: ['event'],
};

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseQuotedLine(line) {
  const values = [];
  let cur = '';
  let inQuote = false;
  for (const c of line) {
    if (c === '"') { inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
    else { cur += c; }
  }
  values.push(cur.trim());
  return values.map(v => v.replace(/^"|"$/g, '').trim());
}

function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseQuotedLine(lines[0]).map(h => h.toLowerCase());
  const rows = lines.slice(1)
    .map(line => {
      const values = parseQuotedLine(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    })
    .filter(r => Object.values(r).some(v => v !== ''));
  return { headers, rows };
}

// ── Entity type detection ─────────────────────────────────────────────────────

function detectEntityType(headers) {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  const scores = {};
  for (const [type, fields] of Object.entries(ENTITY_SIGNATURES)) {
    const matches = fields.filter(f => headerSet.has(f));
    scores[type] = fields.length > 0 ? matches.length / fields.length : 0;
  }

  // Apply hint bonus
  for (const [type, hints] of Object.entries(ENTITY_HINTS)) {
    if (hints.some(hint => headers.some(h => h.includes(hint)))) {
      scores[type] = (scores[type] || 0) + 0.05;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topEntity, topScore] = sorted[0] || ['Driver', 0];

  let confidence = 'low';
  if (topScore >= 0.55) confidence = 'high';
  else if (topScore >= 0.25) confidence = 'medium';

  return { entity: topEntity, confidence, score: topScore };
}

// ── Row field mappers (source entities) ──────────────────────────────────────

const ROW_MAPPERS = {
  Driver: (row) => ({
    first_name: row.first_name || '',
    last_name:  row.last_name  || '',
    primary_number: row.primary_number || row.car_number || '',
    primary_discipline: row.primary_discipline || '',
    hometown_city: row.hometown_city || '',
    hometown_state: row.hometown_state || '',
    hometown_country: row.hometown_country || row.country || '',
    racing_base_city: row.racing_base_city || '',
    racing_base_state: row.racing_base_state || '',
    career_status: row.career_status || '',
    status: row.status || 'Active',
    contact_email: row.contact_email || row.email || '',
    external_uid: row.external_uid || '',
    data_source: 'smart_csv_import',
  }),
  Team: (row) => ({
    name: row.name || row.team_name || '',
    headquarters_city: row.headquarters_city || row.city || '',
    headquarters_state: row.headquarters_state || row.state || '',
    country: row.country || '',
    primary_discipline: row.primary_discipline || '',
    team_level: row.team_level || '',
    status: row.status || 'Active',
    founded_year: row.founded_year ? parseInt(row.founded_year) : null,
    external_uid: row.external_uid || '',
    data_source: 'smart_csv_import',
  }),
  Track: (row) => ({
    name: row.name || row.track_name || '',
    location_city: row.location_city || row.city || '',
    location_state: row.location_state || row.state || '',
    location_country: row.location_country || row.country || '',
    track_type: row.track_type || '',
    surface_type: row.surface_type || '',
    length: row.length ? parseFloat(row.length) : null,
    status: row.status || 'Active',
    external_uid: row.external_uid || '',
    data_source: 'smart_csv_import',
  }),
  Series: (row) => ({
    name: row.name || row.series_name || '',
    full_name: row.full_name || '',
    sanctioning_body: row.sanctioning_body || '',
    discipline: row.discipline || '',
    geographic_scope: row.geographic_scope || '',
    season_year: row.season_year || '',
    status: row.status || 'Active',
    external_uid: row.external_uid || '',
    data_source: 'smart_csv_import',
  }),
  Event: (row) => ({
    name: row.name || row.event_name || '',
    event_date: row.event_date || '',
    end_date: row.end_date || '',
    series_id: row.series_id || '',
    track_id: row.track_id || '',
    season: row.season || '',
    round_number: row.round_number ? parseInt(row.round_number) : null,
    status: row.status || 'Draft',
    external_uid: row.external_uid || '',
    data_source: 'smart_csv_import',
  }),
};

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { csvText, action, overrideEntity } = body;

    if (!csvText) return Response.json({ error: 'csvText is required' }, { status: 400 });

    const { headers, rows } = parseCSVText(csvText);

    // ── DETECT ────────────────────────────────────────────────────────────────
    if (action === 'detect') {
      return Response.json(detectEntityType(headers));
    }

    if (action !== 'import') {
      return Response.json({ error: 'action must be detect or import' }, { status: 400 });
    }

    // ── IMPORT ────────────────────────────────────────────────────────────────
    const detection = detectEntityType(headers);
    const entityName = overrideEntity || detection.entity;
    const isSourceEntity = SOURCE_ENTITY_TYPES.has(entityName);
    const sr = base44.asServiceRole;

    let created = 0, updated = 0, skipped = 0, duplicate_detected = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header offset

      try {
        if (isSourceEntity) {
          // ── Source entity: safe sync pipeline ─────────────────────────────
          const mapper = ROW_MAPPERS[entityName];
          if (!mapper) { skipped++; errors.push({ row: rowNum, error: `No mapper for ${entityName}` }); continue; }

          const rawPayload = mapper(row);

          const prepRes = await base44.functions.invoke('prepareSourcePayloadForSync', {
            entity_type: entityName.toLowerCase(),
            payload: rawPayload,
          });

          if (!prepRes?.data?.payload) {
            const err = prepRes?.data?.error || 'prepareSourcePayloadForSync failed';
            errors.push({ row: rowNum, error: err });
            skipped++;
            continue;
          }

          const syncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
            entity_type: entityName.toLowerCase(),
            payload: prepRes.data.payload,
            user_id: user.id || null,
            triggered_from: 'smart_csv_import',
          });

          if (!syncRes?.data?.source_record) {
            const err = syncRes?.data?.error || 'syncSourceAndEntityRecord failed';
            errors.push({ row: rowNum, error: err });
            skipped++;
            continue;
          }

          if (syncRes.data.source_action === 'created') {
            created++;
          } else if (syncRes.data.source_action === 'updated') {
            updated++;
          } else {
            duplicate_detected++;
            skipped++;
          }

        } else {
          // ── Operational entity: direct create ─────────────────────────────
          const model = sr.entities[entityName];
          if (!model) {
            errors.push({ row: rowNum, error: `Unknown entity type: ${entityName}` });
            skipped++;
            continue;
          }

          // Strip empty values before creating
          const cleanRow = Object.fromEntries(
            Object.entries(row).filter(([, v]) => v !== '' && v !== null && v !== undefined)
          );

          await model.create(cleanRow);
          created++;
        }

      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
        skipped++;
      }
    }

    // ── Operation log ─────────────────────────────────────────────────────────
    await sr.entities.OperationLog.create({
      operation_type: errors.length === 0 ? 'csv_import_completed' : 'csv_import_completed',
      entity_name: entityName,
      user_email: user.email || null,
      status: errors.length === rows.length ? 'failed' : 'completed',
      metadata: {
        importer_name: 'smart_csv_import',
        entity_type: entityName,
        is_source_entity: isSourceEntity,
        imported_count: created,
        updated_count: updated,
        skipped_count: skipped,
        duplicate_detected_count: duplicate_detected,
        error_count: errors.length,
        total_rows: rows.length,
      },
    }).catch(() => {});

    return Response.json({
      entityName,
      isSourceEntity,
      created,
      updated,
      failed: skipped,
      skipped_duplicates: duplicate_detected,
      skipped_invalid: skipped - duplicate_detected,
      errors,
      summary: {
        imported_count: created,
        updated_count: updated,
        skipped_count: skipped,
        duplicate_detected_count: duplicate_detected,
        error_count: errors.length,
        total_rows: rows.length,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});