/**
 * smartCSVImport.js  — R9DL
 *
 * Two actions:
 *   detect — analyze CSV headers and return { entity, confidence, score }
 *   import — parse + route rows through appropriate safe pipeline:
 *
 * Source entities (Driver, Team, Track, Series, Event):
 *   → prepareSourcePayloadForSync → syncSourceAndEntityRecord
 *   Driver also runs resolvePersonIdentity to create PersonIdentity/Evidence/Alias
 *
 * Operational entities with dedup (SeriesClass, EventClass, Session, Entry, Results, Standings):
 *   → entity-specific upsert logic with normalized keys
 *
 * Other operational entities:
 *   → direct create (no dedup)
 *
 * Post-import: always runs runImportDiagnostics and includes result in response.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SOURCE_ENTITY_TYPES = new Set(['Driver', 'Team', 'Track', 'Series', 'Event']);

// ── Header signature scoring for entity type detection ────────────────────────
const ENTITY_SIGNATURES = {
  Driver:      ['first_name','last_name','primary_number','primary_discipline','date_of_birth','hometown_city','hometown_state','career_status'],
  Team:        ['headquarters_city','headquarters_state','country','primary_discipline','team_level','founded_year'],
  Track:       ['location_city','location_state','track_type','surface_type','length','banking'],
  Series:      ['sanctioning_body','discipline','geographic_scope','season_year','full_name'],
  Event:       ['event_date','end_date','track_name','series_name','round_number','season'],
  Results:     ['position','finish_position','session_name','laps_completed','best_lap_time_ms'],
  Session:     ['session_type','event_id','scheduled_time','max_entries'],
  Standings:   ['rank','points_total','wins','podiums'],
  SeriesClass: ['class_name','max_entries','min_weight','max_weight'],
  EventClass:  ['event_id','class_name','max_entries','class_status'],
  Entry:       ['event_id','driver_id','car_number','entry_status','transponder_id'],
  OutletStory: ['title','body','category','author','published_date'],
};

const ENTITY_HINTS = {
  Driver: ['name','driver'], Team: ['team'], Track: ['track'],
  Series: ['series'], Event: ['event'],
};

// ── CSV parser ─────────────────────────────────────────────────────────────────
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
  const headers = parseQuotedLine(lines[0]).map(h => h.toLowerCase().trim());
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

// ── Entity type detection ──────────────────────────────────────────────────────
function detectEntityType(headers) {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  const scores = {};
  for (const [type, fields] of Object.entries(ENTITY_SIGNATURES)) {
    const matches = fields.filter(f => headerSet.has(f));
    scores[type] = fields.length > 0 ? matches.length / fields.length : 0;
  }
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

// ── Normalization helpers ──────────────────────────────────────────────────────
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeClassName(name) {
  if (!name) return '';
  // PRO4 → pro 4, Pro-Lite → pro lite, PRO2 → pro 2
  let n = name.trim().toLowerCase();
  n = n.replace(/([a-z])(\d)/g, '$1 $2');  // pro4 → pro 4
  n = n.replace(/(\d)([a-z])/g, '$1 $2');  // 4x → 4 x
  n = n.replace(/[-_]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

// ── Row field mappers ──────────────────────────────────────────────────────────
const ROW_MAPPERS = {
  Driver: (row) => ({
    first_name:        row.first_name || '',
    last_name:         row.last_name  || '',
    primary_number:    row.primary_number || row.car_number || '',
    primary_discipline:row.primary_discipline || '',
    date_of_birth:     row.date_of_birth || row.dob || '',
    hometown_city:     row.hometown_city || '',
    hometown_state:    row.hometown_state || '',
    hometown_country:  row.hometown_country || row.country || '',
    racing_base_city:  row.racing_base_city || '',
    racing_base_state: row.racing_base_state || '',
    career_status:     row.career_status || '',
    contact_email:     row.contact_email || row.email || '',
    external_uid:      row.external_uid || '',
    data_source:       'smart_csv_import',
  }),
  Team: (row) => ({
    name:               row.name || row.team_name || '',
    headquarters_city:  row.headquarters_city || row.city || '',
    headquarters_state: row.headquarters_state || row.state || '',
    country:            row.country || '',
    primary_discipline: row.primary_discipline || '',
    team_level:         row.team_level || '',
    founded_year:       row.founded_year ? parseInt(row.founded_year) : null,
    external_uid:       row.external_uid || '',
    data_source:        'smart_csv_import',
  }),
  Track: (row) => ({
    name:             row.name || row.track_name || '',
    location_city:    row.location_city || row.city || '',
    location_state:   row.location_state || row.state || '',
    location_country: row.location_country || row.country || '',
    track_type:       row.track_type || '',
    surface_type:     row.surface_type || '',
    length:           row.length ? parseFloat(row.length) : null,
    external_uid:     row.external_uid || '',
    data_source:      'smart_csv_import',
  }),
  Series: (row) => ({
    name:             row.name || row.series_name || '',
    full_name:        row.full_name || '',
    sanctioning_body: row.sanctioning_body || '',
    discipline:       row.discipline || '',
    geographic_scope: row.geographic_scope || '',
    season_year:      row.season_year || '',
    external_uid:     row.external_uid || '',
    data_source:      'smart_csv_import',
  }),
  Event: (row) => ({
    name:         row.name || row.event_name || '',
    event_date:   row.event_date || '',
    end_date:     row.end_date || '',
    series_id:    row.series_id || '',
    track_id:     row.track_id || '',
    season:       row.season || '',
    round_number: row.round_number ? parseInt(row.round_number) : null,
    external_uid: row.external_uid || '',
    data_source:  'smart_csv_import',
  }),
};

// ── Validation: required fields per entity ────────────────────────────────────
const REQUIRED_FIELDS = {
  Driver:      [(r) => (r.first_name || r.last_name) ? null : 'Driver row missing first_name and last_name'],
  Team:        [(r) => r.name ? null : 'Team row missing name'],
  Track:       [(r) => r.name ? null : 'Track row missing name',
                (r) => r.location_city ? null : 'Track row missing location_city'],
  Series:      [(r) => r.name ? null : 'Series row missing name',
                (r) => r.discipline ? null : 'Series row missing discipline'],
  Event:       [(r) => r.name ? null : 'Event row missing name',
                (r) => r.event_date ? null : 'Event row missing event_date'],
  SeriesClass: [(r) => r.series_id ? null : 'SeriesClass row missing series_id',
                (r) => r.class_name ? null : 'SeriesClass row missing class_name'],
  EventClass:  [(r) => r.event_id ? null : 'EventClass row missing event_id',
                (r) => r.class_name ? null : 'EventClass row missing class_name'],
  Session:     [(r) => r.event_id ? null : 'Session row missing event_id',
                (r) => r.session_type ? null : 'Session row missing session_type',
                (r) => r.name ? null : 'Session row missing name'],
  Entry:       [(r) => r.event_id ? null : 'Entry row missing event_id',
                (r) => r.driver_id ? null : 'Entry row missing driver_id',
                (r) => r.car_number ? null : 'Entry row missing car_number'],
  Results:     [(r) => r.driver_id ? null : 'Results row missing driver_id',
                (r) => r.event_id ? null : 'Results row missing event_id',
                (r) => r.session_id ? null : 'Results row missing session_id'],
  Standings:   [(r) => r.series_id ? null : 'Standings row missing series_id',
                (r) => r.season_year ? null : 'Standings row missing season_year',
                (r) => r.driver_id ? null : 'Standings row missing driver_id'],
};

function validateRow(entityName, row) {
  const validators = REQUIRED_FIELDS[entityName];
  if (!validators) return null;
  for (const v of validators) {
    const err = v(row);
    if (err) return err;
  }
  return null;
}

// ── Operational entity upsert helpers ─────────────────────────────────────────

async function upsertSeriesClass(sr, row, rowNum, errors) {
  const normalized = normalizeClassName(row.class_name);
  const key = `series_class:${row.series_id}:${normalized}`;
  const existing = await sr.entities.SeriesClass.filter({ series_id: row.series_id, normalized_series_class_key: key }).catch(() => []);
  const data = {
    series_id: row.series_id,
    class_name: row.class_name,
    description_summary: row.description_summary || '',
    vehicle_type: row.vehicle_type || '',
    competition_level: row.competition_level ? parseInt(row.competition_level) : null,
    geographic_scope: row.geographic_scope || '',
    sort_order: row.sort_order ? parseInt(row.sort_order) : 0,
    active: row.active !== 'false',
    series_class_identity_key: key,
    normalized_series_class_key: key,
  };
  if (existing?.length) {
    await sr.entities.SeriesClass.update(existing[0].id, data);
    return 'updated';
  }
  await sr.entities.SeriesClass.create(data);
  return 'created';
}

async function upsertEventClass(sr, row, rowNum, errors) {
  const normalized = normalizeClassName(row.class_name);
  const key = `event_class:${row.event_id}:${normalized}`;
  const existing = await sr.entities.EventClass.filter({ event_id: row.event_id, normalized_event_class_key: key }).catch(() => []);
  const data = {
    event_id: row.event_id,
    series_class_id: row.series_class_id || null,
    class_name: row.class_name,
    max_entries: row.max_entries ? parseInt(row.max_entries) : null,
    class_status: row.class_status || 'Open',
    class_order: row.class_order ? parseInt(row.class_order) : 0,
    event_class_identity_key: key,
    normalized_event_class_key: key,
  };
  if (existing?.length) {
    await sr.entities.EventClass.update(existing[0].id, data);
    return 'updated';
  }
  await sr.entities.EventClass.create(data);
  return 'created';
}

async function upsertSession(sr, row, rowNum, errors) {
  const normName = normalizeName(row.name);
  const sessionKey = `session:${row.event_id}:${normName}`;

  // Check by normalized_session_key first (strongest)
  let existing = await sr.entities.Session.filter({ normalized_session_key: sessionKey }).catch(() => []);

  // Fallback: event_id + session_type + series_class_id + round_number (prevents cross-class collision)
  if (!existing?.length && row.event_id && row.session_type && row.series_class_id && row.round_number) {
    existing = await sr.entities.Session.filter({
      event_id: row.event_id,
      session_type: row.session_type,
      series_class_id: row.series_class_id,
      round_number: parseInt(row.round_number),
    }).catch(() => []);
  }

  // R9EA Phase 1: All import-created sessions default to historical safety flags.
  // These must be explicitly released by an admin after verification.
  const data = {
    event_id: row.event_id,
    event_class_id: row.event_class_id || null,
    series_class_id: row.series_class_id || null,
    session_type: row.session_type,
    name: row.name,
    session_number: row.session_number ? parseInt(row.session_number) : null,
    round_number: row.round_number ? parseInt(row.round_number) : null,
    points_enabled: row.points_enabled === 'true' || row.points_enabled === true,
    points_type: row.points_type || 'none',
    run_order: row.run_order ? parseInt(row.run_order) : 0,
    laps: row.laps ? parseInt(row.laps) : null,
    // R9EA: HISTORICAL SAFETY DEFAULTS — do not change without reading R9EA Phase 1 spec
    status: 'Draft',
    is_historical: true,
    standings_hold: true,
    results_on_hold: true,
    input_source: 'CSV',
    normalized_name: normName,
    canonical_key: sessionKey,
    normalized_session_key: sessionKey,
    external_uid: row.external_uid || null,
    data_source: row.data_source || 'smart_csv_import',
  };
  if (existing?.length) {
    await sr.entities.Session.update(existing[0].id, data);
    return 'updated';
  }
  await sr.entities.Session.create(data);
  return 'created';
}

async function upsertEntry(sr, row, rowNum, errors) {
  const key = `entry:${row.event_id}:${row.driver_id}:${normalizeName(row.event_class_id || row.car_number)}`;
  let existing = await sr.entities.Entry.filter({ event_id: row.event_id, driver_id: row.driver_id, event_class_id: row.event_class_id || null }).catch(() => []);
  if (!existing?.length && row.car_number) {
    existing = await sr.entities.Entry.filter({ event_id: row.event_id, driver_id: row.driver_id, car_number: row.car_number }).catch(() => []);
  }
  const data = {
    event_id: row.event_id,
    driver_id: row.driver_id,
    event_class_id: row.event_class_id || null,
    series_class_id: row.series_class_id || null,
    team_id: row.team_id || null,
    series_id: row.series_id || null,
    car_number: row.car_number,
    transponder_id: row.transponder_id || null,
    entry_status: row.entry_status || 'Registered',
    payment_status: row.payment_status || 'Unpaid',
    entry_identity_key: key,
    normalized_entry_key: key,
  };
  if (existing?.length) {
    await sr.entities.Entry.update(existing[0].id, data);
    return 'updated';
  }
  await sr.entities.Entry.create(data);
  return 'created';
}

async function upsertStanding(sr, row, rowNum, errors) {
  const key = `standing:${row.series_id}:${row.season_year}:${row.driver_id}:${row.series_class_id || 'overall'}`;
  const existing = await sr.entities.Standings.filter({ series_id: row.series_id, season_year: row.season_year, driver_id: row.driver_id, series_class_id: row.series_class_id || null }).catch(() => []);
  const data = {
    series_id: row.series_id,
    series_class_id: row.series_class_id || null,
    season_year: row.season_year,
    driver_id: row.driver_id,
    position: row.position ? parseInt(row.position) : null,
    rank: row.rank ? parseInt(row.rank) : null,
    points_total: row.points_total ? parseFloat(row.points_total) : 0,
    wins: row.wins ? parseInt(row.wins) : 0,
    seconds: row.seconds ? parseInt(row.seconds) : 0,
    thirds: row.thirds ? parseInt(row.thirds) : 0,
    podiums: row.podiums ? parseInt(row.podiums) : 0,
    starts: row.starts ? parseInt(row.starts) : 0,
    standing_identity_key: key,
    normalized_standing_key: key,
    // R9EA Phase 6: Historical standings imported via CSV are protected from computed overwrite
    calculation_source: row.calculation_source || 'historical_import',
    record_status: row.record_status || 'under_review',
  };
  if (existing?.length) {
    await sr.entities.Standings.update(existing[0].id, data);
    return 'updated';
  }
  await sr.entities.Standings.create(data);
  return 'created';
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

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
    let identity_reviews = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        // ── Validate required fields first ────────────────────────────────────
        const validationErr = validateRow(entityName, row);
        if (validationErr) {
          errors.push({ row: rowNum, error: validationErr });
          skipped++;
          continue;
        }

        if (isSourceEntity) {
          // ── Source entity: safe sync pipeline ─────────────────────────────
          const mapper = ROW_MAPPERS[entityName];
          if (!mapper) { skipped++; errors.push({ row: rowNum, error: `No mapper for ${entityName}` }); continue; }

          const rawPayload = mapper(row);

          // R9EA Phase 2: Driver imports MUST go through resolvePersonIdentity
          // After Driver is created/matched, link canonical_driver_id on the PersonIdentity.
          let resolvedIdentityId = null;
          if (entityName === 'Driver') {
            const fullName = `${rawPayload.first_name} ${rawPayload.last_name}`.trim();
            if (fullName) {
              const identityRes = await base44.functions.invoke('resolvePersonIdentity', {
                raw_driver_name: fullName,
                raw_dob: rawPayload.date_of_birth || null,
                raw_external_uid: rawPayload.external_uid || null,
                raw_car_number: rawPayload.primary_number || null,
                source_type: 'csv_import',
                source_name: 'smart_csv_import',
                import_run_id: `csv_import_${Date.now()}`,
              }).catch(() => null);

              if (identityRes?.data?.action === 'BLOCKED') {
                errors.push({ row: rowNum, error: `Identity conflict blocked: ${identityRes.data.reason} — sent to review queue` });
                skipped++;
                identity_reviews++;
                continue;
              }
              if (identityRes?.data?.action === 'REVIEW') {
                identity_reviews++;
                resolvedIdentityId = identityRes.data.identity_id || null;
                // Don't skip — continue to create/update the Driver record, but note review needed
              }
              if (identityRes?.data?.action === 'ATTACHED' || identityRes?.data?.action === 'NEW_IDENTITY') {
                resolvedIdentityId = identityRes.data.identity_id || null;
              }
            }
          }

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

          if (syncRes.data.source_action === 'created') { created++; }
          else if (syncRes.data.source_action === 'updated') { updated++; }
          else { duplicate_detected++; skipped++; }

          // R9EA Phase 2: Link PersonIdentity.canonical_driver_id after Driver create/update
          if (entityName === 'Driver' && resolvedIdentityId) {
            const driverRecord = syncRes.data.entity_record || syncRes.data.source_record;
            const driverEntityId = driverRecord?.id;
            if (driverEntityId) {
              try {
                const identityList = await sr.entities.PersonIdentity.filter({ id: resolvedIdentityId }).catch(() => []);
                const identity = identityList?.[0];
                if (identity && !identity.canonical_driver_id) {
                  const beforeCanonical = identity.canonical_driver_id;
                  await sr.entities.PersonIdentity.update(resolvedIdentityId, { canonical_driver_id: driverEntityId });
                  await sr.entities.AuditLog.create({
                    entity_type: 'PersonIdentity',
                    entity_id: resolvedIdentityId,
                    entity_name: identity.canonical_name,
                    action: 'updated',
                    before_data: { canonical_driver_id: beforeCanonical },
                    after_data: { canonical_driver_id: driverEntityId },
                    performed_by: user.id,
                    performed_by_name: user.full_name || user.email,
                    timestamp: new Date().toISOString(),
                    notes: `canonical_driver_id linked via smart_csv_import — driver ${driverEntityId}`,
                  }).catch(() => {});
                }
              } catch (_) { /* non-blocking */ }
            }
          }

        } else if (entityName === 'Results') {
          // Results MUST route through upsertOperationalResult — never direct create
          const cleanRow = Object.fromEntries(
            Object.entries(row).filter(([, v]) => v !== '' && v !== null && v !== undefined)
          );
          const upsertRes = await base44.functions.invoke('upsertOperationalResult', {
            payload: cleanRow,
            source_path: 'smart_csv_import',
          });
          if (!upsertRes?.data?.record) {
            const err = upsertRes?.data?.error || 'upsertOperationalResult failed';
            errors.push({ row: rowNum, error: err });
            skipped++;
            continue;
          }
          if (upsertRes.data.action === 'created') { created++; }
          else { updated++; }

        } else if (entityName === 'SeriesClass') {
          const action2 = await upsertSeriesClass(sr, row, rowNum, errors);
          if (action2 === 'created') { created++; } else { updated++; }

        } else if (entityName === 'EventClass') {
          const action2 = await upsertEventClass(sr, row, rowNum, errors);
          if (action2 === 'created') { created++; } else { updated++; }

        } else if (entityName === 'Session') {
          const action2 = await upsertSession(sr, row, rowNum, errors);
          if (action2 === 'created') { created++; } else { updated++; }

        } else if (entityName === 'Entry') {
          const action2 = await upsertEntry(sr, row, rowNum, errors);
          if (action2 === 'created') { created++; } else { updated++; }

        } else if (entityName === 'Standings') {
          const action2 = await upsertStanding(sr, row, rowNum, errors);
          if (action2 === 'created') { created++; } else { updated++; }

        } else {
          // ── Other operational entities: direct create ─────────────────────
          const model = sr.entities[entityName];
          if (!model) {
            errors.push({ row: rowNum, error: `Unknown entity type: ${entityName}` });
            skipped++;
            continue;
          }
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
      operation_type: 'csv_import_completed',
      entity_name: entityName,
      user_email: user.email || null,
      status: errors.length === rows.length && rows.length > 0 ? 'failed' : 'completed',
      metadata: {
        importer_name: 'smart_csv_import',
        entity_type: entityName,
        is_source_entity: isSourceEntity,
        imported_count: created,
        updated_count: updated,
        skipped_count: skipped,
        duplicate_detected_count: duplicate_detected,
        identity_reviews,
        error_count: errors.length,
        total_rows: rows.length,
      },
    }).catch(() => {});

    // ── R9EA Phase 9: Post-import diagnostics + success gating ───────────────
    let diagnostics = null;
    // Determine pre-diagnostic import_status based on row-level failures
    let import_status = 'success';
    if (errors.length > 0 && errors.length === rows.length) {
      import_status = 'failed';
    } else if (skipped > 0 && errors.some(e => e.error?.includes('required'))) {
      import_status = 'failed';
    }

    try {
      const diagRes = await base44.functions.invoke('runImportDiagnostics', {
        entity_types: [entityName],
      });
      diagnostics = diagRes?.data || null;
      // Upgrade import_status from diagnostics if not already failed
      if (import_status !== 'failed' && diagnostics?.import_status) {
        import_status = diagnostics.import_status;
      }
    } catch {
      diagnostics = { integrity_status: 'unknown', import_status: 'success_with_warnings', summary: 'Diagnostics could not run' };
      if (import_status === 'success') import_status = 'success_with_warnings';
    }

    return Response.json({
      entityName,
      isSourceEntity,
      created,
      updated,
      failed: skipped,
      skipped_duplicates: duplicate_detected,
      skipped_invalid: Math.max(0, skipped - duplicate_detected),
      identity_reviews,
      import_status,
      errors,
      diagnostics,
      rollback_available: false,
      summary: {
        imported_count: created,
        updated_count: updated,
        skipped_count: skipped,
        duplicate_detected_count: duplicate_detected,
        identity_reviews,
        error_count: errors.length,
        total_rows: rows.length,
        import_status,
        integrity_status: diagnostics?.integrity_status || 'unknown',
      },
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});